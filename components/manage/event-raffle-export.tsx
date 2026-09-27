"use client";

import { useState, useTransition } from "react";
import { Button, TextArea } from "@/components/ui";
import { getScopedRaffleAttendeeDetail, getScopedRaffleSnapshot } from "@/app/manage/[slug]/raffle/actions";
import { formatRaffleEntries, raffleText } from "@/lib/raffle";
import type { EventRaffleAttendeeDetail, EventRaffleSnapshot } from "@/lib/supabase/queries/event-feedback";

export function EventRaffleExport({ slug }: { slug: string }) {
  const [snapshot, setSnapshot] = useState<EventRaffleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventRaffleAttendeeDetail | null>(null);
  const entries = snapshot ? formatRaffleEntries(snapshot.attendees) : [];
  const names = raffleText(entries);
  const duplicates = entries.filter((entry) => entry.isDuplicate);

  function refresh() {
    startTransition(async () => {
      try {
        setSnapshot(await getScopedRaffleSnapshot(slug));
        setError(null);
        setNotice(null);
        setDetail(null);
      } catch {
        setSnapshot(null);
        setError("Could not prepare this event’s raffle list. Try again.");
      }
    });
  }

  function inspect(id: string) {
    startTransition(async () => {
      try {
        const result = await getScopedRaffleAttendeeDetail(slug, id);
        setDetail(result);
        setNotice(result ? null : "That attendee is no longer eligible. Refresh the list.");
      } catch {
        setDetail(null);
        setNotice("Could not confirm that attendee. Refresh the list and try again.");
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(names);
      setNotice("Names copied. Paste them into your drawing tool.");
    } catch {
      setNotice("Clipboard unavailable. Download the text file instead.");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([names], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-raffle-attendees.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <div className="max-w-xl space-y-4">
    <Button onPress={refresh} isPending={pending}>{snapshot ? "Refresh names" : "Prepare raffle names"}</Button>
    {error ? <p role="alert" className="text-sm">{error}</p> : null}
    {snapshot ? <>
      <p className="text-sm text-muted">{entries.length} eligible attendees · {snapshot.excluded_blank_count} unnamed skipped</p>
      {entries.length ? <>
        <TextArea aria-label="Copy-ready raffle names" value={names} readOnly rows={Math.min(Math.max(entries.length, 6), 14)} className="font-mono text-xs leading-5" />
        {duplicates.length ? <div className="space-y-2">
          <p className="text-sm text-muted">{duplicates.length} entries share a name. Numbered labels distinguish them in the drawing. Confirm the selected attendee here before awarding a prize.</p>
          <div className="flex flex-wrap gap-2">{duplicates.map((entry) => <Button key={entry.id} size="sm" variant="secondary" onPress={() => inspect(entry.id)} isDisabled={pending}>{entry.label}</Button>)}</div>
          {detail ? <p role="status" className="text-sm">{detail.name} · {detail.email ?? "Email unavailable"}</p> : null}
        </div> : null}
        <div className="flex flex-wrap gap-3"><Button onPress={() => void copy()}>Copy list</Button><Button variant="secondary" onPress={download}>Download list</Button></div>
      </> : <p className="text-sm text-muted">No active attendees with usable names are available.</p>}
    </> : null}
    {notice ? <p role="status" className="text-sm text-muted">{notice}</p> : null}
  </div>;
}
