import { requireEventManager } from "@/lib/supabase/management-auth";
import { listEventFeedback } from "@/lib/supabase/queries/event-feedback";
import { feedbackCategoryLabel } from "@/lib/feedback";

export default async function ManageEventFeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, supabase } = await requireEventManager((await params).slug);
  const feedback = event.isSuspended ? [] : await listEventFeedback(supabase, event.id);
  return <section>
    <p className="platform-kicker">Event responses</p>
    <h2 className="organizer-heading mt-2">Feedback</h2>
    <p className="mt-2 text-sm text-muted">Read-only feedback from this event’s attendees. Names are shown, but email addresses are not.</p>
    {event.isSuspended ? <p role="status" className="mt-6 text-sm text-muted">Feedback is unavailable while this event is suspended.</p> :
      feedback.length ? <ul className="mt-7 grid gap-4">{feedback.map((entry) => <li key={entry.id} className="rounded-xl border p-5 platform-rule">
        <p className="platform-kicker">{feedbackCategoryLabel(entry.category)}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.message}</p>
        <p className="mt-4 text-xs text-muted">{entry.attendee_name} · {new Date(entry.created_at).toLocaleString()}</p>
      </li>)}</ul> : <p className="mt-7 text-sm text-muted">No event feedback yet.</p>}
  </section>;
}
