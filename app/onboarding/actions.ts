"use server";

import { redirect } from "next/navigation";
import { isValidLinkedInProfileUrl } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/server";

export interface SaveLinkedInUrlState {
  error: string | null;
}

export async function saveLinkedInUrl(
  _prevState: SaveLinkedInUrlState,
  formData: FormData,
): Promise<SaveLinkedInUrlState> {
  const raw = formData.get("linkedin_url");
  const linkedinUrl = typeof raw === "string" ? raw.trim() : "";

  if (!isValidLinkedInProfileUrl(linkedinUrl)) {
    return {
      error: "Enter a valid LinkedIn profile URL, e.g. https://linkedin.com/in/your-name",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ linkedin_url: linkedinUrl })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your URL. Please try again." };
  }

  redirect("/home");
}
