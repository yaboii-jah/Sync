"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { StoredPushSubscription } from "@/lib/push";
import type { BookmarkConflict } from "@/lib/program-flow";

export interface ToggleBookmarkResult {
  error?: string;
  bookmarked?: boolean;
  conflicts?: BookmarkConflict[];
}

export async function toggleBookmark(
  sessionId: string,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  if (!isUuid(sessionId)) return { error: "Invalid session" };

  const { data, error } = await supabase.rpc("toggle_my_flow_bookmark", {
    target_session_id: sessionId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not signed in")) return { error: "Not signed in" };
    if (message.includes("session not found")) {
      return { error: "Session not found" };
    }
    if (message.includes("finished sessions")) {
      return { error: "Finished sessions cannot be added to My Flow" };
    }
    return { error: "Could not update your schedule" };
  }

  const result = parseBookmarkResult(data);
  if (!result) return { error: "Could not update your schedule" };

  revalidatePath("/home");
  return result;
}

export async function savePushSubscription(
  subscription: StoredPushSubscription,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);

  if (!claims) return { error: "Not signed in" };

  if (!isValidPushEndpoint(subscription.endpoint)) {
    return { error: "Invalid notification endpoint" };
  }
  if (!isValidDeviceId(subscription.device_id)) {
    return { error: "Invalid notification device" };
  }

  const { error: cleanupError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", claims.sub)
    .eq("device_id", subscription.device_id);

  if (cleanupError) return { error: "Could not save your notification settings" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: claims.sub,
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
  const claims = await getAuthenticatedClaims(supabase);

  if (!claims || !isValidPushEndpoint(endpoint) || !isValidDeviceId(deviceId)) {
    return false;
  }

  const { data: endpointMatch } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", claims.sub)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (endpointMatch) return true;

  const { data: deviceMatch } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", claims.sub)
    .eq("device_id", deviceId)
    .maybeSingle();

  return Boolean(deviceMatch);
}

export async function removePushSubscription(
  endpoint: string | null,
  deviceId: string,
): Promise<ToggleBookmarkResult> {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);

  if (!claims) return { error: "Not signed in" };
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
      .eq("user_id", claims.sub)
      .eq("endpoint", endpoint);

    if (endpointError) return { error: "Could not disable notifications" };
  }

  const { error: deviceError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", claims.sub)
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBookmarkResult(value: unknown): ToggleBookmarkResult | null {
  if (!isRecord(value) || typeof value.bookmarked !== "boolean") return null;
  if (!Array.isArray(value.conflicts)) return null;

  const conflicts: BookmarkConflict[] = [];
  for (const conflict of value.conflicts) {
    if (!isRecord(conflict)) return null;
    if (
      typeof conflict.id !== "string" ||
      typeof conflict.title !== "string" ||
      typeof conflict.start_time !== "string" ||
      typeof conflict.end_time !== "string" ||
      (conflict.room !== null && typeof conflict.room !== "string")
    ) {
      return null;
    }
    conflicts.push({
      id: conflict.id,
      title: conflict.title,
      start_time: conflict.start_time,
      end_time: conflict.end_time,
      room: conflict.room,
    });
  }

  return { bookmarked: value.bookmarked, conflicts };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
