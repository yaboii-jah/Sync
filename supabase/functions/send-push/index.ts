import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_SUBJECT = "mailto:jahmelldorias17@gmail.com";

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string | null;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload: NotificationPayload = await req.json();

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("failed to load subscriptions:", error.message);
    return new Response("Internal error", { status: 500 });
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
  });

  const results = await Promise.allSettled(
    (subscriptions as SubscriptionRow[]).map((sub) =>
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

  return Response.json({ delivered, pruned: dead.length });
});
