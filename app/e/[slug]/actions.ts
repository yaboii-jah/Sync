"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventHomePath, eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { getPublicEventProgram } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function joinEventAction(eventId: string, rawSlug: string): Promise<void> {
  const slug = normalizeEventSlug(rawSlug);
  if (!isMultiTenantPlatformEnabled() || !slug || !UUID_PATTERN.test(eventId)) redirect("/events");
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) redirect(`/?next=${encodeURIComponent(eventPublicPath(slug))}`);

  const program = await getPublicEventProgram(supabase, slug);
  if (!program || program.event.id !== eventId) redirect(eventPublicPath(slug));
  const result = await supabase.rpc("join_event", { target_event_id: eventId, mutation_request_id: crypto.randomUUID() });
  if (result.error) throw result.error;
  revalidatePath("/events");
  revalidatePath(eventPublicPath(slug));
  redirect(eventHomePath(slug));
}
