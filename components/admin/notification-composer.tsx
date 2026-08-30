"use client";

import Link from "next/link";
import { Search, Send, Users, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  searchAttendeesAction,
  sendAdminNotification,
} from "@/app/(admin)/admin/actions";
import type { AdminAttendee } from "@/lib/supabase/queries/admin";

interface NotificationComposerProps {
  initialAttendees: AdminAttendee[];
  totalAttendees: number;
  totalPushDevices: number;
}

export function NotificationComposer({
  initialAttendees,
  totalAttendees,
  totalPushDevices,
}: NotificationComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState(initialAttendees);
  const [selected, setSelected] = useState<Map<string, AdminAttendee>>(new Map());
  const [confirming, setConfirming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    id: string;
    recipients: number;
    devices: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedDevices = [...selected.values()].reduce(
    (total, attendee) => total + attendee.push_device_count,
    0,
  );

  useEffect(() => {
    if (!confirming) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setConfirming(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirming, pending]);

  function toggle(attendee: AdminAttendee) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(attendee.id)) next.delete(attendee.id);
      else next.set(attendee.id, attendee);
      return next;
    });
  }

  function search() {
    startTransition(async () => {
      try {
        setAttendees(await searchAttendeesAction(query));
      } catch {
        setError("Could not search attendees.");
      }
    });
  }

  function review() {
    setError(null);
    if (!title.trim()) {
      setError("Enter a notification title.");
      return;
    }
    if (title.trim().length > 80 || body.trim().length > 240) {
      setError("Keep the title under 80 characters and body under 240 characters.");
      return;
    }
    if (audience === "selected" && selected.size === 0) {
      setError("Select at least one attendee.");
      return;
    }
    setRequestId((current) => current ?? crypto.randomUUID());
    setConfirming(true);
  }

  function send() {
    if (!requestId) return;
    startTransition(async () => {
      try {
        const result = await sendAdminNotification({
          title,
          body,
          audience,
          recipientIds: [...selected.keys()],
          requestId,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSent({
          id: result.notificationId!,
          recipients: result.recipientCount ?? 0,
          devices: result.deviceCount ?? 0,
        });
        setConfirming(false);
      } catch {
        setError("The outcome is unknown. Retry this same request before starting a new alert.");
      }
    });
  }

  if (sent) {
    return (
      <section className="mt-8 rounded-3xl border border-state-success px-6 py-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-state-success/20 text-state-success">
          <Send className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-3xl text-text-primary uppercase">Dispatch created</h2>
        <p className="mt-2 text-sm text-text-muted">
          {sent.recipients} recipients · {sent.devices} push devices targeted
        </p>
        <Link
          href={`/admin/notifications/${sent.id}`}
          className="mt-6 inline-flex rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-wide text-charcoal uppercase"
        >
          View delivery results
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section className="rounded-2xl border border-border-default px-5 py-5">
        <label className="block text-xs font-bold tracking-wide text-text-muted uppercase" htmlFor="notification-title">
          Title <span className="float-right normal-case">{title.length}/80</span>
        </label>
        <input
          id="notification-title"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Venue update"
          className="mt-2 w-full rounded-xl border border-border-default bg-transparent px-4 py-3 text-text-primary outline-none placeholder:text-text-muted/50 focus:border-pastel-yellow"
        />

        <label className="mt-5 block text-xs font-bold tracking-wide text-text-muted uppercase" htmlFor="notification-body">
          Body <span className="float-right normal-case">{body.length}/240</span>
        </label>
        <textarea
          id="notification-body"
          value={body}
          maxLength={240}
          rows={6}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share the operational update attendees need right now."
          className="mt-2 w-full resize-none rounded-xl border border-border-default bg-transparent px-4 py-3 text-text-primary outline-none placeholder:text-text-muted/50 focus:border-pastel-yellow"
        />

        <div className="mt-5 rounded-xl border border-border-default px-4 py-4">
          <p className="text-xs font-bold tracking-wide text-text-muted uppercase">Push preview</p>
          <p className="mt-3 font-bold text-text-primary">{title.trim() || "Notification title"}</p>
          <p className="mt-1 text-sm text-text-muted">{body.trim() || "Notification body"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border-default px-5 py-5">
        <p className="text-xs font-bold tracking-wide text-text-muted uppercase">Audience</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border-default p-1">
          {(["all", "selected"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAudience(option)}
              className={`rounded-lg px-3 py-2 text-xs font-bold tracking-wide uppercase ${
                audience === option ? "bg-pastel-yellow text-charcoal" : "text-text-muted"
              }`}
            >
              {option === "all" ? "Everyone" : "Selected"}
            </button>
          ))}
        </div>

        {audience === "all" ? (
          <div className="mt-5 rounded-xl bg-accent-primary/25 px-4 py-4">
            <div className="flex items-center gap-2 text-text-primary">
              <Users className="h-5 w-5 text-pastel-yellow" />
              <strong>{totalAttendees} attendees</strong>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {totalPushDevices} registered push devices. Everyone still receives the in-app alert.
            </p>
          </div>
        ) : (
          <>
            <form
              className="mt-5 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search attendee"
                className="min-w-0 flex-1 rounded-xl border border-border-default bg-transparent px-3 py-2 text-sm text-text-primary outline-none focus:border-pastel-yellow"
              />
              <button type="submit" disabled={pending} className="rounded-xl border border-border-default p-2.5 text-pastel-yellow">
                <Search className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border-default">
              {attendees.map((attendee, index) => (
                <label
                  key={attendee.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 ${index > 0 ? "border-t border-border-default" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(attendee.id)}
                    onChange={() => toggle(attendee)}
                    className="h-4 w-4 accent-pastel-yellow"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-text-primary">{attendee.name || "Unnamed attendee"}</span>
                    <span className="block text-xs text-text-muted">{attendee.push_device_count} push devices</span>
                  </span>
                </label>
              ))}
              {attendees.length === 0 ? <p className="px-3 py-5 text-sm text-text-muted">No attendees found.</p> : null}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              {selected.size} selected · {selectedDevices} push devices
            </p>
          </>
        )}

        {error ? <p className="mt-4 rounded-lg bg-state-error/15 px-3 py-2 text-sm text-state-error">{error}</p> : null}

        <button
          type="button"
          onClick={review}
          disabled={pending}
          className="mt-5 w-full rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase hover:bg-light-green disabled:opacity-50"
        >
          Review and send
        </button>
      </section>

      {confirming ? (
        <div role="dialog" aria-modal="true" aria-labelledby="notification-confirm-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !pending && setConfirming(false)}>
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-border-default bg-bg-base px-6 py-6" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close confirmation" disabled={pending} onClick={() => setConfirming(false)} className="absolute top-4 right-4 p-1.5 text-text-muted">
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs font-bold tracking-[0.22em] text-pastel-yellow uppercase">Final confirmation</p>
            <h2 id="notification-confirm-title" className="mt-2 font-display text-3xl text-text-primary uppercase">Send immediately?</h2>
            <div className="mt-4 rounded-xl border border-border-default px-4 py-4">
              <p className="font-bold text-text-primary">{title.trim()}</p>
              {body.trim() ? <p className="mt-1 text-sm text-text-muted">{body.trim()}</p> : null}
              <p className="mt-3 text-xs font-bold text-pastel-yellow">
                {audience === "all" ? totalAttendees : selected.size} recipients · {audience === "all" ? totalPushDevices : selectedDevices} push devices
              </p>
            </div>
            <p className="mt-4 text-sm text-text-muted">This dispatch cannot be recalled or edited after confirmation.</p>
            {error ? <p className="mt-3 rounded-lg bg-state-error/15 px-3 py-2 text-sm text-state-error">{error}</p> : null}
            <div className="mt-6 flex gap-2">
              <button type="button" autoFocus onClick={send} disabled={pending} className="flex-1 rounded-full bg-pastel-yellow px-4 py-3 text-xs font-bold tracking-wide text-charcoal uppercase disabled:opacity-50">
                {pending ? "Sending..." : "Confirm send"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full px-4 py-3 text-xs font-bold text-text-muted uppercase">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
