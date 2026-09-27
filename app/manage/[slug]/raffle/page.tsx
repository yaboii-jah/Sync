import { EventRaffleExport } from "@/components/manage/event-raffle-export";
import { requireEventManager } from "@/lib/supabase/management-auth";

export default async function ManageRafflePage({ params }: { params: Promise<{ slug: string }> }) {
  const { event } = await requireEventManager((await params).slug);
  return <section>
    <p className="platform-kicker">Event operations</p>
    <h2 className="organizer-heading mt-2">Raffle export</h2>
    <p className="mt-2 text-sm text-muted">Export active attendee names from this event for an external drawing tool. This does not draw or save winners.</p>
    <div className="mt-6">{event.lifecycle === "draft" || event.isSuspended ?
      <p role="status" className="text-sm text-muted">Raffle export is available for published and archived, non-suspended events.</p> :
      <EventRaffleExport slug={event.slug} />}</div>
  </section>;
}
