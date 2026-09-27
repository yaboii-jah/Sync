"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEventAlertAction } from "@/app/manage/[slug]/alerts/actions";

export function AlertComposer({ slug, members, writable }: {
  slug: string; members: { id: string; name: string; role: string }[]; writable: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await sendEventAlertAction({ slug, title, body, audience, membershipIds: selected, requestId });
      if (result.error) { setMessage(result.error); return; }
      setMessage(`Sent to ${result.recipientCount ?? 0} member(s).`);
      setTitle(""); setBody(""); setSelected([]); setRequestId(crypto.randomUUID());
      router.refresh();
    } catch { setMessage("Could not send the alert. Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-xl border p-5 platform-rule">
    <h3 className="font-semibold">New alert</h3>
    {!writable ? <p role="status" className="text-sm text-muted">Sending is available only while this event is published and active.</p> : null}
    <label className="block text-sm">Title<input className="mt-1 w-full rounded-lg border bg-transparent p-2" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} disabled={!writable || busy} /></label>
    <label className="block text-sm">Message<textarea className="mt-1 min-h-24 w-full rounded-lg border bg-transparent p-2" maxLength={240} value={body} onChange={(event) => setBody(event.target.value)} disabled={!writable || busy} /></label>
    <fieldset disabled={!writable || busy} className="space-y-2 text-sm"><legend className="font-medium">Recipients</legend>
      <label className="block"><input type="radio" checked={audience === "all"} onChange={() => setAudience("all")} /> All active members ({members.length})</label>
      <label className="block"><input type="radio" checked={audience === "selected"} onChange={() => setAudience("selected")} /> Selected members</label>
      {audience === "selected" ? <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3 platform-rule">{members.map((member) =>
        <label key={member.id} className="block"><input type="checkbox" checked={selected.includes(member.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, member.id] : selected.filter((id) => id !== member.id))} /> {member.name} ({member.role})</label>)}</div> : null}
    </fieldset>
    <button type="submit" className="platform-button text-sm" disabled={!writable || busy || !title.trim() || (audience === "selected" && selected.length === 0)}>{busy ? "Sending…" : "Send alert"}</button>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </form>;
}
