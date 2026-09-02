import { Search, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchAdminAttendees } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";

export default async function AdminAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const supabase = await createClient();
  const attendees = await searchAdminAttendees(supabase, q, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">Read-only directory</p>
      <h1 className="mt-2 font-display text-4xl text-text-primary uppercase">Attendees</h1>
      <p className="mt-3 text-sm text-text-muted">Search identity and notification reachability. This workspace cannot edit attendee accounts.</p>

      <form className="mt-6 flex max-w-xl gap-2" action="/admin/attendees">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by attendee name"
          className="min-w-0 flex-1 rounded-xl border border-border-default bg-transparent px-4 py-3 text-text-primary outline-none placeholder:text-text-muted/50 focus:border-pastel-yellow"
        />
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-pastel-yellow px-4 py-3 text-xs font-bold text-charcoal uppercase">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border-default">
        {attendees.map((attendee, index) => (
          <article key={attendee.id} className={`px-4 py-4 sm:px-5 ${index > 0 ? "border-t border-border-default" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-text-primary">{attendee.name || "Unnamed attendee"}</p>
                <p className="mt-1 text-xs text-text-muted">Joined {formatRelativeTime(attendee.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border-default px-3 py-2 text-xs font-bold text-text-muted">
                <Smartphone className="h-4 w-4 text-pastel-yellow" />
                {attendee.push_device_count} push device{attendee.push_device_count === 1 ? "" : "s"}
              </div>
            </div>
          </article>
        ))}
        {attendees.length === 0 ? <p className="px-5 py-10 text-center text-sm text-text-muted">No attendees match this search.</p> : null}
      </div>
    </div>
  );
}
