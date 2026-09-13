import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinEventButton } from "@/components/platform/join-event-button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { SignInButton } from "@/components/auth/sign-in-button";
import { eventHomePath, eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { formatEventDate, formatEventTimeRange } from "@/lib/format";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { getEventMembership, getPublicEventProgram } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";
import { joinEventAction } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const supabase = await createClient();
  const [program, claims] = await Promise.all([getPublicEventProgram(supabase, slug), getAuthenticatedClaims(supabase)]);
  if (!program) notFound();
  const membership = claims ? await getEventMembership(supabase, program.event.id, claims.sub) : null;
  const isActive = membership?.status === "active";
  const isBlocked = membership?.status === "blocked";
  const join = joinEventAction.bind(null, program.event.id, slug);

  return (
    <PlatformShell>
      <div className="platform-frame py-12 sm:py-20">
        <p className="platform-kicker">Published event</p>
        <div className="mt-4 grid gap-8 border-b pb-12 platform-rule md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
          <div className="min-w-0">
            <h1 className="platform-display">{program.event.name}</h1>
            {program.event.description ? <p className="mt-6 max-w-2xl text-base leading-7 text-muted">{program.event.description}</p> : null}
          </div>
          <div>
            <p className="font-semibold">{formatEventDate(program.event.starts_at, program.event.timezone)}</p>
            <p className="mt-1 text-sm text-muted">{program.event.venue ?? "Venue TBA"}</p>
            <div className="mt-6">
              {!claims ? <SignInButton next={eventPublicPath(slug)} variant="platform" /> : isActive ? (
                <Link href={eventHomePath(slug)} className="platform-button">Open event</Link>
              ) : isBlocked ? <p className="text-sm text-danger" role="status">Your access to this event is unavailable.</p> : (
                <form action={join}><JoinEventButton /></form>
              )}
            </div>
          </div>
        </div>

        <section className="mt-12" aria-labelledby="public-program">
          <div>
            <h2 id="public-program" className="text-2xl font-semibold tracking-[-0.035em]">Program</h2>
            <span className="platform-kicker mt-2 block">{program.sessions.length.toString().padStart(2, "0")} sessions</span>
          </div>
          {program.sessions.length ? <ol className="mt-5">{program.sessions.map((session) => (
            <li key={session.id} className="platform-card">
              <div><p className="platform-kicker">{formatEventTimeRange(session.start_time, session.end_time, program.event.timezone)}</p><h3 className="mt-2 text-lg font-semibold">{session.title}</h3></div>
              <p className="mt-3 text-sm text-muted sm:mt-0">{session.room ?? "Room TBA"}</p>
            </li>
          ))}</ol> : <p className="mt-6 border-t py-8 text-sm text-muted platform-rule">The organizer has not published any sessions yet.</p>}
        </section>
      </div>
    </PlatformShell>
  );
}
