import { requireEventManager } from "@/lib/supabase/management-auth";
import { EventBasicsForm } from "@/components/manage/event-basics-form";
import { formatEventDateTimeInput } from "@/lib/events/basics";

export default async function EventBasicsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions } = await requireEventManager((await params).slug);
  return <section>
    <h2 className="text-2xl font-bold tracking-tight">Event basics</h2>
    <p className="mt-3 mb-8 max-w-xl leading-7 text-muted">Dates are interpreted in the event timezone. Moving an event’s dates must still leave every existing session inside its time window.</p>
    <EventBasicsForm requestId={crypto.randomUUID()} readOnly={!permissions.canManageContent} initial={{ name: event.name, slug: event.slug, description: event.description ?? "", venue: event.venue ?? "", timezone: event.timezone, startsAt: formatEventDateTimeInput(event.startsAt, event.timezone), endsAt: formatEventDateTimeInput(event.endsAt, event.timezone) }} />
  </section>;
}
