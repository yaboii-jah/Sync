"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { data: existing } = await supabase
    .from("my_flow_bookmarks")
    .select("session_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();

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

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
