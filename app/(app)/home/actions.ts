"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StoredPushSubscription } from "@/lib/push";
import { displayStatus } from "@/lib/format";

export interface ToggleBookmarkResult {
  error?: string;
}

export async function toggleBookmark(
  sessionId: string,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };

  const { data: session } = await supabase
    .from("sessions")
    .select("start_time, end_time")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { error: "Session not found" };

  const { data: existing } = await supabase
    .from("my_flow_bookmarks")
    .select("session_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!existing && displayStatus(session.start_time, session.end_time) === "finished") {
    return { error: "Finished sessions cannot be added to My Flow" };
  }

  const { error } = existing
    ? await supabase
        .from("my_flow_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
    : await supabase
        .from("my_flow_bookmarks")
        .insert({ user_id: user.id, session_id: sessionId });

  if (error) return { error: "Could not update your schedule" };

  revalidatePath("/home");
  return {};
}

export async function savePushSubscription(
  subscription: StoredPushSubscription,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };

  if (!isValidPushEndpoint(subscription.endpoint)) {
    return { error: "Invalid notification endpoint" };
  }
  if (!isValidDeviceId(subscription.device_id)) {
    return { error: "Invalid notification device" };
  }

  const { error: cleanupError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("device_id", subscription.device_id);

  if (cleanupError) return { error: "Could not save your notification settings" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      device_id: subscription.device_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { error: "Could not save your notification settings" };

  return {};
}

export async function hasPushSubscription(
  endpoint: string,
  deviceId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isValidPushEndpoint(endpoint) || !isValidDeviceId(deviceId)) {
    return false;
  }

  const { data: endpointMatch } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (endpointMatch) return true;

  const { data: deviceMatch } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  return Boolean(deviceMatch);
}

export async function removePushSubscription(
  endpoint: string | null,
  deviceId: string,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };
  if (
    (endpoint !== null && !isValidPushEndpoint(endpoint)) ||
    !isValidDeviceId(deviceId)
  ) {
    return { error: "Invalid notification endpoint" };
  }

  if (endpoint) {
    const { error: endpointError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (endpointError) return { error: "Could not disable notifications" };
  }

  const { error: deviceError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("device_id", deviceId);

  return deviceError ? { error: "Could not disable notifications" } : {};
}

function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function isValidDeviceId(deviceId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    deviceId,
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
