"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Text, TextArea, TextField } from "react-aria-components";
import { eventLifecycleAction } from "@/app/manage/actions";
import type { UserEvent } from "@/lib/supabase/queries/events";
import type { EventPermissions } from "@/lib/events/types";
import type { OrganizerActionState } from "@/lib/events/organizer-actions";

export function LifecycleActionForm({ event, action, requestId }: { event: UserEvent; action: "publish" | "archive" | "delete"; requestId: string }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, pending] = useActionState<OrganizerActionState, FormData>(eventLifecycleAction.bind(null, event.slug, action), {});
  const title = action === "publish" ? "Publish event" : action === "archive" ? "Archive event" : "Delete draft";
  return (
    <form action={formAction} onResetCapture={(event) => event.preventDefault()} className="grid gap-4">
      <input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
      {action !== "publish" ? <TextField name="reason" value={reason} onChange={setReason} isRequired validationBehavior="aria" className="organizer-field">
        <Label className="font-semibold">Reason (required)</Label>
        <TextArea className="organizer-input" minLength={8} maxLength={1000} rows={2} />
        <Text slot="description" className="organizer-help text-muted">8–1,000 characters. Stored in the audit history.</Text>
      </TextField> : null}
      {action === "delete" ? <TextField name="confirmation" value={confirmation} onChange={setConfirmation} isRequired validationBehavior="aria" className="organizer-field">
        <Label className="font-semibold">Type the event name to confirm</Label>
        <Input className="organizer-input" />
        <Text slot="description" className="organizer-help text-muted break-words">{event.name}</Text>
      </TextField> : null}
      <div aria-live="polite" aria-atomic="true" className="min-h-6">
        {state.message ? <p className={state.success ? "text-success" : "text-danger"} role={state.success ? "status" : "alert"}>{state.message}</p> : null}
      </div>
      <Button type="submit" className={`platform-button w-fit ${action !== "publish" ? "organizer-destructive" : ""}`} isDisabled={pending || state.success === true} data-state={pending ? "loading" : state.success ? "success" : state.message ? "error" : "default"}>{pending ? "Saving…" : title}</Button>
    </form>
  );
}

export function LifecycleControls({ event, permissions, requestIds }: { event: UserEvent; permissions: EventPermissions; requestIds: string[] }) {
  if (!permissions.canArchive && !permissions.canPublish) return <p className="text-sm text-muted">{event.role === "admin" && event.lifecycle !== "archived" && !event.isSuspended ? "Publishing, archival, and draft deletion are owner-only actions." : "Lifecycle actions are unavailable while this event is read-only."}</p>;
  return (
    <div className="grid gap-8">
      {permissions.canPublish ? <section className="grid gap-2">
        <h3 className="font-semibold">Make the event available</h3>
        <p className="max-w-xl text-sm leading-6 text-muted">Publishing opens your unlisted public link and enables explicit joining. Branding, speakers, and a schedule are optional; you can add them later. Publication cannot be undone.</p>
        <LifecycleActionForm event={event} action="publish" requestId={requestIds[0]} />
      </section> : null}
      {permissions.canArchive ? <details className="border-t pt-5 platform-rule">
        <summary className="organizer-summary">Archive event</summary>
        <p className="my-4 max-w-xl text-sm leading-6 text-muted">Archiving preserves event history and gives existing members read-only memories. New joining and event edits stop. This cannot be undone in this release.</p>
        <LifecycleActionForm event={event} action="archive" requestId={requestIds[1]} />
      </details> : null}
      {permissions.canDeleteDraft ? <details className="border-t pt-5 platform-rule">
        <summary className="organizer-summary">Delete untouched draft</summary>
        <p className="my-4 max-w-xl text-sm leading-6 text-muted">Permanently delete this draft only if it has never been published and has no sessions, speakers, invitations, or other members. Basics edits are allowed. Drafts with activity must be archived.</p>
        <LifecycleActionForm event={event} action="delete" requestId={requestIds[2]} />
      </details> : null}
    </div>
  );
}
