import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_SUBJECT = "mailto:jahmelldorias17@gmail.com";

interface NotificationPayload {
  id: string;
  type: "session_live" | "session_ended" | "session_reminder" | "announcement";
  title: string;
  body: string | null;
  related_session_id: string | null;
  target_user_ids: string[] | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const NOTIFICATION_TYPES = new Set<NotificationPayload["type"]>([
  "session_live",
  "session_ended",
  "session_reminder",
  "announcement",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNotificationPayload(value: unknown): NotificationPayload | null {
  if (!isRecord(value)) return null;

  const { id, type, title, body, related_session_id, target_user_ids } = value;
  if (
    typeof id !== "string" ||
    !UUID_PATTERN.test(id) ||
    typeof type !== "string" ||
    !NOTIFICATION_TYPES.has(type as NotificationPayload["type"]) ||
    typeof title !== "string" ||
    title.trim().length === 0 ||
    (body !== null && typeof body !== "string") ||
    (related_session_id !== null &&
      (typeof related_session_id !== "string" ||
        !UUID_PATTERN.test(related_session_id)))
  ) {
    return null;
  }

  if (
    target_user_ids !== undefined &&
    target_user_ids !== null &&
    (!Array.isArray(target_user_ids) ||
      target_user_ids.some(
        (userId) => typeof userId !== "string" || !UUID_PATTERN.test(userId),
      ))
  ) {
    return null;
  }

  return {
    id,
    type: type as NotificationPayload["type"],
    title,
    body: body as string | null,
    related_session_id: related_session_id as string | null,
    target_user_ids: (target_user_ids as string[] | null | undefined) ?? null,
  };
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

  const payload = parseNotificationPayload(input);
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

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");

  if (error) {
    console.error("failed to load subscriptions:", error.message);
    return new Response("Internal error", { status: 500 });
  }

  let recipients: SubscriptionRow[] = (subscriptions ?? []) as SubscriptionRow[];

  // The trigger snapshots session bookmarkers before finished rows are deleted.
  // The bookmark lookup remains as a compatibility fallback for older payloads.
  if (payload.target_user_ids !== null) {
    const targetUserIds = new Set(payload.target_user_ids);
    recipients = recipients.filter((sub) => targetUserIds.has(sub.user_id));
  } else if (payload.related_session_id) {
    const { data: bookmarks, error: bookmarkError } = await admin
      .from("my_flow_bookmarks")
      .select("user_id")
      .eq("session_id", payload.related_session_id);

    if (bookmarkError) {
      console.error("failed to load bookmarks:", bookmarkError.message);
      return new Response("Internal error", { status: 500 });
    }

    const bookmarkedUserIds = new Set((bookmarks ?? []).map((row) => row.user_id));
    recipients = recipients.filter((sub) => bookmarkedUserIds.has(sub.user_id));
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
  });

  const results = await Promise.allSettled(
    recipients.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
        .then(() => null)
        .catch((err: { statusCode?: number }) => ({ sub, err })),
    ),
  );

  let delivered = 0;
  const dead: string[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    if (result.value === null) {
      delivered++;
      continue;
    }
    const { sub, err } = result.value;
    console.error(`push to ${sub.endpoint} failed:`, err.statusCode ?? err);
    if (err.statusCode === 404 || err.statusCode === 410) {
      dead.push(sub.id);
    }
  }

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return Response.json({
    delivered,
    pruned: dead.length,
    targeted: recipients.length,
  });
});
