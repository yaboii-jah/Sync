import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import webpush from "npm:web-push@3.6.7";

const VAPID_SUBJECT = "mailto:jahmelldorias17@gmail.com";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEND_CONCURRENCY = 20;
const PAGE_SIZE = 1000;

interface WebhookPayload {
  id: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DeliveryResult {
  event_id: string;
  notification_id: string;
  user_id: string;
  subscription_id: string;
  device_id: string;
  status: "accepted" | "failed" | "pruned";
  status_code: number | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): WebhookPayload | null {
  if (!isRecord(value) || typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) {
    return null;
  }
  return { id: value.id };
}

function failureCode(error: unknown): string {
  const status = isRecord(error) && typeof error.statusCode === "number" ? error.statusCode : null;
  if (status === 404 || status === 410) return "push_expired";
  if (status !== null && status >= 400 && status < 500) return "push_rejected";
  return "push_unavailable";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const payload = parsePayload(input);
  if (!payload) {
    return new Response("Invalid notification payload", { status: 400 });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
    console.error("push environment is incomplete");
    return new Response("Internal error", { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: dispatch, error: dispatchError } = await admin
    .from("notification_dispatches")
    .select("status, attempt_count")
    .eq("notification_id", payload.id)
    .maybeSingle();

  if (dispatchError || !dispatch) {
    console.error("dispatch not found:", dispatchError?.message ?? payload.id);
    return new Response("Dispatch not found", { status: 404 });
  }

  if (dispatch.status !== "pending") {
    return Response.json({ notification_id: payload.id, status: dispatch.status });
  }

  const claimedAttempt = dispatch.attempt_count + 1;
  const { data: claimed, error: claimError } = await admin
    .from("notification_dispatches")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      attempt_count: claimedAttempt,
      last_error: null,
    })
    .eq("notification_id", payload.id)
    .eq("status", "pending")
    .eq("attempt_count", dispatch.attempt_count)
    .select("notification_id")
    .maybeSingle();

  if (claimError) {
    console.error("failed to claim dispatch:", claimError.message);
    return new Response("Internal error", { status: 500 });
  }
  if (!claimed) {
    return Response.json({ notification_id: payload.id, status: "already_claimed" });
  }

  try {
    const { data: notification, error: notificationError } = await admin
      .from("notifications")
      .select("event_id, title, body")
      .eq("id", payload.id)
      .single();

    if (notificationError || !notification) {
      throw new Error(notificationError?.message ?? "Notification not found");
    }
    const { data: event, error: eventError } = await admin
      .from("events").select("slug,lifecycle,suspended_at,theme_preset").eq("id", notification.event_id).single();
    if (eventError || !event) throw new Error("event_lookup_failed");
    const recipientIds = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await admin
        .from("notification_recipients")
        .select("user_id")
        .eq("event_id", notification.event_id)
        .eq("notification_id", payload.id)
        .order("user_id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error("recipient_lookup_failed");
      for (const row of page ?? []) recipientIds.add(row.user_id);
      if (!page || page.length < PAGE_SIZE) break;
    }

    const enabledIds = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await admin.from("event_notification_preferences")
        .select("user_id").eq("event_id", notification.event_id).eq("push_enabled", true)
        .order("user_id").range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error("preference_lookup_failed");
      for (const row of page ?? []) enabledIds.add(row.user_id);
      if (!page || page.length < PAGE_SIZE) break;
    }
    const activeIds = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await admin.from("event_memberships")
        .select("user_id").eq("event_id", notification.event_id).eq("status", "active")
        .order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error("membership_lookup_failed");
      for (const row of page ?? []) if (row.user_id) activeIds.add(row.user_id);
      if (!page || page.length < PAGE_SIZE) break;
    }
    const legacyCompatibility = event.theme_preset === "legacy_aws" &&
      Deno.env.get("MULTI_TENANT_PLATFORM_ENABLED") !== "true";
    const eventCanPush = legacyCompatibility || (event.lifecycle === "published" && event.suspended_at === null);
    const targetUsers = new Set([...recipientIds].filter((id) =>
      eventCanPush && activeIds.has(id) && (legacyCompatibility || enabledIds.has(id))));
    const targets: SubscriptionRow[] = [];
    const targetIds = [...targetUsers];
    for (let offset = 0; offset < targetIds.length; offset += 100) {
      const userBatch = targetIds.slice(offset, offset + 100);
      let lastSubscriptionId: string | null = null;
      for (;;) {
        let query = admin.from("push_subscriptions")
          .select("id, user_id, device_id, endpoint, p256dh, auth")
          .in("user_id", userBatch).order("id").limit(PAGE_SIZE);
        if (lastSubscriptionId) query = query.gt("id", lastSubscriptionId);
        const { data: page, error } = await query;
        if (error) throw new Error("subscription_lookup_failed");
        targets.push(...((page ?? []) as SubscriptionRow[]));
        if (!page || page.length < PAGE_SIZE) break;
        lastSubscriptionId = page[page.length - 1].id;
      }
    }
    const usersWithPush = new Set(targets.map((subscription) => subscription.user_id));
    const noSubscriptionCount = [...targetUsers].filter(
      (userId) => !usersWithPush.has(userId),
    ).length;
    const pushBody = JSON.stringify({
      title: notification.title,
      body: notification.body ?? "",
      url: legacyCompatibility ? "/alerts" : `/e/${event.slug}/alerts`,
      id: payload.id,
    });

    const deliveryResults: DeliveryResult[] = [];
    for (let offset = 0; offset < targets.length; offset += SEND_CONCURRENCY) {
      const batch = targets.slice(offset, offset + SEND_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (subscription): Promise<DeliveryResult> => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              pushBody,
            );
            return {
              event_id: notification.event_id,
              notification_id: payload.id,
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              device_id: subscription.device_id,
              status: "accepted",
              status_code: null,
              error: null,
            };
          } catch (error) {
            const statusCode = isRecord(error) && typeof error.statusCode === "number"
              ? error.statusCode
              : null;
            return {
              event_id: notification.event_id,
              notification_id: payload.id,
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              device_id: subscription.device_id,
              status: statusCode === 404 || statusCode === 410 ? "pruned" : "failed",
              status_code: statusCode,
              error: failureCode(error),
            };
          }
        }),
      );
      deliveryResults.push(...batchResults);
    }

    if (deliveryResults.length > 0) {
      const { error: deliveryError } = await admin
        .from("notification_deliveries")
        .upsert(deliveryResults, { onConflict: "notification_id,subscription_id" });
      if (deliveryError) throw new Error("delivery_write_failed");
    }

    const deadIds = deliveryResults
      .filter((result) => result.status === "pruned")
      .map((result) => result.subscription_id);
    if (deadIds.length > 0) {
      const { error: pruneError } = await admin
        .from("push_subscriptions")
        .delete()
        .in("id", deadIds);
      if (pruneError) console.error("failed to prune subscriptions:", pruneError.message);
    }

    const acceptedCount = deliveryResults.filter((result) => result.status === "accepted").length;
    const failedCount = deliveryResults.filter((result) => result.status === "failed").length;
    const prunedCount = deliveryResults.filter((result) => result.status === "pruned").length;
    const { data: completed, error: completeError } = await admin
      .from("notification_dispatches")
      .update({
        status: "completed",
        recipient_count: recipientIds.size,
        target_device_count: targets.length,
        accepted_count: acceptedCount,
        failed_count: failedCount,
        pruned_count: prunedCount,
        no_subscription_count: noSubscriptionCount,
        completed_at: new Date().toISOString(),
      })
      .eq("notification_id", payload.id)
      .eq("status", "running")
      .eq("attempt_count", claimedAttempt)
      .select("notification_id")
      .maybeSingle();
    if (completeError) throw new Error("dispatch_complete_failed");
    if (!completed) {
      return Response.json({ notification_id: payload.id, status: "superseded" });
    }

    return Response.json({
      notification_id: payload.id,
      event_id: notification.event_id,
      status: "completed",
      recipients: recipientIds.size,
      targeted_devices: targets.length,
      accepted: acceptedCount,
      failed: failedCount,
      pruned: prunedCount,
      no_subscription: noSubscriptionCount,
    });
  } catch (error) {
    const message = error instanceof Error && /^[a-z_]+$/.test(error.message)
      ? error.message : "dispatch_unavailable";
    console.error("push dispatch failed:", message);
    await admin
      .from("notification_dispatches")
      .update({
        status: "failed",
        last_error: message,
        completed_at: new Date().toISOString(),
      })
      .eq("notification_id", payload.id)
      .eq("status", "running")
      .eq("attempt_count", claimedAttempt);
    return new Response("Internal error", { status: 500 });
  }
});
