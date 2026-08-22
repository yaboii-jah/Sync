"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  displayStatus,
  formatManilaDate,
  formatTimeRange,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

interface SessionModalProps {
  session: SessionWithSpeakers;
  bookmarked: boolean;
  onToggleBookmark: (sessionId: string) => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  speaker: "Speaker",
  host: "Host",
  panelist: "Panelist",
  sponsor: "Sponsor",
};

export function SessionModal({
  session,
  bookmarked,
  onToggleBookmark,
  onClose,
}: SessionModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const status = displayStatus(session.start_time, session.end_time);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={session.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border-default bg-bg-base px-6 py-6 shadow-[0_0_40px_rgba(188,131,48,0.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-bold tracking-wide text-text-muted uppercase">
          {formatManilaDate(session.start_time)}
        </p>
        <h2 className="mt-2 pr-8 font-display text-3xl text-text-primary uppercase">
          {session.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-sm text-text-muted">
            {formatTimeRange(session.start_time, session.end_time)}
          </span>
        </div>
        <p className="mt-1 text-sm text-text-muted">{session.room ?? "TBA"}</p>

        {session.description ? (
          <p className="mt-4 leading-relaxed text-text-primary/90">
            {session.description}
          </p>
        ) : null}

        {session.speakers.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
              On Stage
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {session.speakers.map((speaker) => (
                <li key={speaker.id} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-default font-display text-lg text-text-primary">
                    {speaker.name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-text-primary">
                      {speaker.name}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {ROLE_LABELS[speaker.role] ?? speaker.role}
                      {speaker.organization ? ` · ${speaker.organization}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onToggleBookmark(session.id)}
          aria-pressed={bookmarked}
          className={`mt-6 w-full rounded-full px-5 py-3 text-xs font-bold tracking-[0.14em] uppercase transition-colors ${
            bookmarked
              ? "bg-state-success text-charcoal"
              : "bg-pastel-yellow text-charcoal hover:bg-light-green"
          }`}
        >
          {bookmarked ? "Saved to My Flow" : "Add to My Flow"}
        </button>
      </div>
    </div>
  );
}
