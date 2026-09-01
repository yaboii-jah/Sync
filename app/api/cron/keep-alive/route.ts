import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { pingDatabase } from "@/lib/supabase/queries/keep-alive";

/**
 * Keep-alive ping — stops Supabase pausing the project for inactivity.
 *
 * Supabase pauses a free-plan project after seven days without requests, and
 * bringing one back is a manual restore in the dashboard. Sync spends most of
 * its life waiting: it is built and deployed well before AWS Student Community
 * Day, and between demos nobody opens it. Left alone the project pauses, and
 * the way that gets discovered is an attendee scanning a QR code on the event
 * day and getting nothing.
 *
 * Vercel Cron calls this once a day (`vercel.json`, UTC), and the handler runs
 * one real query against Postgres, which resets the seven-day clock.
 *
 * The pg_cron minute-job that flips session status is not a substitute for
 * this. It runs inside the database and never crosses the API boundary, so it
 * generates no project traffic.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` whenever that variable is
 * set on the project, and anything else is refused. With it unset — local dev —
 * the gate stands open, which is why this handler stays read-only and reports
 * nothing but its own timing. Failure detail goes to the logs, not the body.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { ok, error } = await pingDatabase(supabase);

  if (!ok) {
    console.error("[keep-alive] database ping failed:", error);
    return NextResponse.json(
      { ok: false, error: "Database unreachable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
