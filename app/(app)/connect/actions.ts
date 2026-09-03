"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setNetworkingCardPublished(published: boolean): Promise<{
  error: string | null;
  isPublic: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("set_networking_card_public", {
    published,
  });

  if (error) {
    return {
      error: published
        ? "Save at least one profile before sharing your card."
        : "Could not make your card private. Please try again.",
      isPublic: !published,
    };
  }

  revalidatePath("/connect");
  return { error: null, isPublic: data };
}
