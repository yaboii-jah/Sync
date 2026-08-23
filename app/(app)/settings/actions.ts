"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidLinkedInProfileUrl,
  normalizeLinkedInProfileUrl,
} from "@/lib/linkedin";

export interface UpdateProfileState {
  error: string | null;
  success: boolean;
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const rawName = formData.get("name");
  const rawUrl = formData.get("linkedin_url");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const linkedinUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";

  if (!name) return { error: "Your name can't be empty.", success: false };
  if (!isValidLinkedInProfileUrl(linkedinUrl)) {
    return {
      error:
        "Enter a valid LinkedIn profile URL, e.g. https://linkedin.com/in/your-name",
      success: false,
    };
  }

  const normalized = normalizeLinkedInProfileUrl(linkedinUrl);
  if (!normalized) {
    return {
      error:
        "Enter a valid LinkedIn profile URL, e.g. https://linkedin.com/in/your-name",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ name, linkedin_url: normalized })
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
