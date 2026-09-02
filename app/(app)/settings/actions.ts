"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVerifiedGoogleUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileState {
  error: string | null;
  success: boolean;
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) return { error: "Your name can't be empty.", success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isVerifiedGoogleUser(user)) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again.", success: false };
  }

  revalidatePath("/home");
  revalidatePath("/connect");
  revalidatePath("/settings");
  revalidatePath("/more");

  return { error: null, success: true };
}
