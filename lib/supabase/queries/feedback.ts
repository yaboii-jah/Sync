import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { FeedbackCategory } from "@/lib/feedback";

type QueryClient = SupabaseClient<Database>;

export interface AdminFeedback {
  id: string;
  category: string;
  message: string;
  attendee_name: string;
  attendee_photo_url: string | null;
  created_at: string;
}

export async function submitAppFeedback(
  client: QueryClient,
  input: {
    category: FeedbackCategory;
    message: string;
    requestId: string;
  },
): Promise<void> {
  const { error } = await client.rpc("submit_app_feedback", {
    feedback_category: input.category,
    feedback_message: input.message,
    feedback_request_id: input.requestId,
  });

  if (error) throw new Error(error.message);
}

export async function getAdminFeedback(
  client: QueryClient,
  limit = 100,
): Promise<AdminFeedback[]> {
  const { data, error } = await client.rpc("admin_list_feedback", {
    result_limit: limit,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}
