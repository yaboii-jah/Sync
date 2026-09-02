"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface PublishState {
  error: string | null;
}

/**
 * Publishes or withdraws the attendee's networking card.
 *
 * Publication is the whole access model for a card: `get_public_networking_card`
 * returns nothing while `is_public` is false, so this switch is what makes the
 * QR resolve for anyone else. The RPC refuses to publish a card with no links,
 * and that refusal is surfaced verbatim — it is the one error an attendee can
 * act on, by adding a link in Settings.
 */
export async function setCardPublic(published: boolean): Promise<PublishState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_networking_card_public", {
    published,
  });

  if (error) {
    return {
      error: published
        ? "Add at least one profile link in Settings before sharing your card."
        : "Could not hide your card. Please try again.",
    };
  }

  revalidatePath("/connect");

  return { error: null };
}
