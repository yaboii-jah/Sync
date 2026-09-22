"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Text, TextArea, TextField } from "react-aria-components";
import {
  endSupportSessionAction, moderateSupportedAttendeeAction, setEventSuspensionAction,
  setPlatformQuotaAction, startSupportSessionAction, type PlatformActionState,
} from "@/app/super-admin/actions";
import type { QuotaFields } from "@/lib/supabase/queries/platform-admin";

function Result({ state }: { state: PlatformActionState }) {
  return <div className="min-h-6" aria-live="polite">{state.message ? <p className={state.success ? "text-success" : "text-danger"} role={state.success ? "status" : "alert"}>{state.message}</p> : null}</div>;
}
const useRequestId = () => useState(() => crypto.randomUUID())[0];
function Reason({ label = "Reason" }: { label?: string }) {
  return <TextField name="reason" isRequired validationBehavior="aria" className="organizer-field">
    <Label className="font-semibold">{label} (required)</Label><TextArea className="organizer-input" minLength={8} maxLength={1000} rows={3} />
    <Text slot="description" className="organizer-help text-muted">8–1,000 characters. Stored in the immutable platform audit.</Text>
  </TextField>;
}
export function SuspensionForm({ eventId, suspended }: { eventId: string; suspended: boolean }) {
  const requestId = useRequestId();
  const [state, action, pending] = useActionState(setEventSuspensionAction.bind(null, eventId, !suspended), {});
  return <form action={action} className="grid gap-4"><input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
    <Reason label={suspended ? "Unsuspension note" : "Suspension reason"} /><Result state={state} />
    <Button type="submit" className={`platform-button w-fit ${suspended ? "" : "organizer-destructive"}`} isDisabled={pending}>{pending ? "Saving…" : suspended ? "Remove suspension" : "Suspend event"}</Button>
  </form>;
}
export function SupportStartForm({ eventId }: { eventId: string }) {
  const requestId = useRequestId();
  const [state, action, pending] = useActionState(startSupportSessionAction.bind(null, eventId), {});
  return <form action={action} className="grid gap-4"><input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} /><Reason label="Support purpose" /><Result state={state} />
    <Button type="submit" className="platform-button w-fit" isDisabled={pending}>{pending ? "Starting…" : "Start 60-minute support session"}</Button></form>;
}
export function SupportEndForm({ eventId, sessionId }: { eventId: string; sessionId: string }) {
  const requestId = useRequestId();
  const [state, action, pending] = useActionState(endSupportSessionAction.bind(null, eventId, sessionId), {});
  return <form action={action}><input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} /><Result state={state} />
    <Button type="submit" className="platform-button organizer-destructive" isDisabled={pending}>{pending ? "Ending…" : "End support access"}</Button></form>;
}
export function QuotaForm({ userId, quota }: { userId: string; quota: QuotaFields }) {
  const requestId = useRequestId();
  const [state, action, pending] = useActionState(setPlatformQuotaAction.bind(null, userId), {});
  const fields = [
    ["activeEventLimit", "Active events", quota.active_event_limit, "Default 5 · 0–1,000"],
    ["eventAdminLimit", "Admins per event", quota.event_admin_limit, "Default 20 · 1–1,000"],
    ["eventSessionLimit", "Sessions per event", quota.event_session_limit, "Default 500 · 1–10,000"],
    ["brandingUploadMb", "Branding upload (MiB)", quota.branding_upload_bytes ? quota.branding_upload_bytes / 1048576 : null, "Default 10 · 1–50"],
  ] as const;
  return <form action={action} className="grid gap-5"><input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name,label,initial,help]) => <TextField key={name} name={name} type="number" defaultValue={initial?.toString() ?? ""} className="organizer-field">
      <Label className="font-semibold">{label}</Label><Input className="organizer-input" min={name === "activeEventLimit" ? 0 : 1} max={name === "brandingUploadMb" ? 50 : name === "eventSessionLimit" ? 10000 : 1000} step={1} />
      <Text slot="description" className="organizer-help text-muted">{help}. Leave blank to use the default.</Text>
    </TextField>)}</div><Reason label="Change reason" /><Result state={state} />
    <Button type="submit" className="platform-button w-fit" isDisabled={pending}>{pending ? "Saving…" : "Save quota override"}</Button>
  </form>;
}
export function AttendeeModerationForm({ eventId, membershipId, currentStatus }: { eventId: string; membershipId: string; currentStatus: string }) {
  const requestId = useRequestId();
  const nextStatus = currentStatus === "active" ? "removed" : "active";
  const [state, action, pending] = useActionState(moderateSupportedAttendeeAction.bind(null, eventId, membershipId, nextStatus), {});
  return <form action={action} className="mt-3 grid gap-2"><input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
    {nextStatus !== "active" ? <input className="organizer-input" name="reason" required minLength={8} maxLength={1000} placeholder="Moderation reason" aria-label="Moderation reason" /> : <input type="hidden" name="reason" value="Restored by platform support" />}
    <Result state={state} /><Button type="submit" className={`platform-button w-fit text-xs ${nextStatus === "active" ? "" : "organizer-destructive"}`} isDisabled={pending}>{pending ? "Saving…" : nextStatus === "active" ? "Restore attendee" : "Remove attendee"}</Button>
  </form>;
}
