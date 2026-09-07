"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  isFeedbackCategory,
} from "@/lib/feedback";
import { submitAppFeedback } from "@/lib/supabase/queries/feedback";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SubmitFeedbackState {
  error: string | null;
  field: "category" | "message" | null;
  success: boolean;
  completedRequestId: string | null;
}

function invalid(
  error: string,
  field: SubmitFeedbackState["field"],
): SubmitFeedbackState {
  return { error, field, success: false, completedRequestId: null };
}

export async function submitFeedback(
  _previousState: SubmitFeedbackState,
  formData: FormData,
): Promise<SubmitFeedbackState> {
  const rawCategory = formData.get("category");
  if (!isFeedbackCategory(rawCategory)) {
    return invalid("Choose a feedback category.", "category");
  }

  const rawMessage = formData.get("message");
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) return invalid("Tell us a little more before sending.", "message");
  if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    return invalid(
      `Keep your message to ${FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString()} characters or fewer.`,
      "message",
    );
  }

  const rawRequestId = formData.get("request_id");
  if (typeof rawRequestId !== "string" || !UUID_PATTERN.test(rawRequestId)) {
    return invalid("This form has expired. Refresh and try again.", null);
  }

  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) redirect("/login");

  try {
    await submitAppFeedback(supabase, {
      category: rawCategory,
      message,
      requestId: rawRequestId,
    });
  } catch (error) {
    console.error("Feedback submission failed", error);
    return invalid("Could not send your feedback. Please try again.", null);
  }

  revalidatePath("/admin/feedback");

  return {
    error: null,
    field: null,
    success: true,
    completedRequestId: rawRequestId,
  };
}
