"use client";

import { Radio, RotateCcw, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { changeSessionStatus } from "@/app/(admin)/admin/actions";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { formatTimeRange } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast/toast-provider";

type SessionAction = "start" | "end" | "resume_auto";

export function AdminSessionsClient({ sessions }: { sessions: SessionWithSpeakers[] }) {
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{
    session: SessionWithSpeakers;
    action: SessionAction;
    requestId: string;
  } | null>(null);
  const [sendNotification, setSendNotification] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!selection) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setSelection(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, pending]);

  function open(session: SessionWithSpeakers, action: SessionAction) {
    setSelection({ session, action, requestId: crypto.randomUUID() });
    setSendNotification(action !== "resume_auto");
  }

  function confirm() {
    if (!selection) return;
    startTransition(async () => {
      try {
        const result = await changeSessionStatus({
          sessionId: selection.session.id,
          action: selection.action,
          sendNotification: selection.action === "resume_auto" ? false : sendNotification,
          requestId: selection.requestId,
        });
        if (result.error) {
          toast(result.error, "error");
          return;
        }
        toast("Live session state updated");
        setSelection(null);
        router.refresh();
      } catch {
        toast("Outcome unknown. Retry this same confirmation.", "error");
      }
    });
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        {sessions.map((session) => (
          <article key={session.id} className={`rounded-2xl border px-4 py-4 sm:px-5 ${session.status_override ? "border-pastel-yellow" : "border-border-default"}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={session.status as "not_started" | "ongoing" | "finished"} />
                  <span className="text-xs text-text-muted">{formatTimeRange(session.start_time, session.end_time)}</span>
                  {session.status_override ? (
                    <span className="rounded-full border border-pastel-yellow px-2 py-1 text-[0.58rem] font-bold tracking-wide text-pastel-yellow uppercase">Manual</span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-bold text-text-primary">{session.title}</h2>
                <p className="mt-1 text-sm text-text-muted">{session.room ?? "TBA"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.status === "not_started" ? (
                  <button type="button" onClick={() => open(session, "start")} className="flex items-center gap-1.5 rounded-full border border-state-success px-3 py-2 text-xs font-bold text-state-success uppercase">
                    <Radio className="h-4 w-4" /> Start
                  </button>
                ) : null}
                {session.status !== "finished" ? (
                  <button type="button" onClick={() => open(session, "end")} className="flex items-center gap-1.5 rounded-full border border-state-error px-3 py-2 text-xs font-bold text-state-error uppercase">
                    <Square className="h-4 w-4" /> End
                  </button>
                ) : null}
                {session.status_override ? (
                  <button type="button" onClick={() => open(session, "resume_auto")} className="flex items-center gap-1.5 rounded-full border border-border-default px-3 py-2 text-xs font-bold text-text-muted uppercase">
                    <RotateCcw className="h-4 w-4" /> Resume auto
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {selection ? (
        <div role="dialog" aria-modal="true" aria-labelledby="session-confirm-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !pending && setSelection(null)}>
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-border-default bg-bg-base px-6 py-6" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close confirmation" disabled={pending} onClick={() => setSelection(null)} className="absolute top-4 right-4 p-1.5 text-text-muted"><X className="h-5 w-5" /></button>
            <p className="text-xs font-bold tracking-[0.22em] text-pastel-yellow uppercase">Confirm live control</p>
            <h2 id="session-confirm-title" className="mt-2 font-display text-3xl text-text-primary uppercase">{selection.action.replace("_", " ")} session?</h2>
            <p className="mt-3 font-bold text-text-primary">{selection.session.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {selection.action === "resume_auto"
                ? "The effective status will immediately return to the published schedule."
                : "This status stays active until another manual action or Resume Auto."}
            </p>
            {selection.action !== "resume_auto" ? (
              <label className="mt-5 flex items-start gap-3 rounded-xl border border-border-default px-4 py-3">
                <input type="checkbox" checked={sendNotification} onChange={(event) => setSendNotification(event.target.checked)} className="mt-0.5 h-4 w-4 accent-pastel-yellow" />
                <span>
                  <span className="block text-sm font-bold text-text-primary">Notify every attendee</span>
                  <span className="mt-1 block text-xs text-text-muted">Creates an event-wide in-app alert and sends push where available.</span>
                </span>
              </label>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button type="button" autoFocus onClick={confirm} disabled={pending} className="flex-1 rounded-full bg-pastel-yellow px-4 py-3 text-xs font-bold tracking-wide text-charcoal uppercase disabled:opacity-50">{pending ? "Applying..." : "Confirm"}</button>
              <button type="button" onClick={() => setSelection(null)} disabled={pending} className="rounded-full px-4 py-3 text-xs font-bold text-text-muted uppercase">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
