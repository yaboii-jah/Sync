"use client";

/* Hallmark · component: organizer form · genre: modern-minimal · theme: original Sync
 * pre-emit critique: P4 H4 E4 S5 R5 V4
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (measured against the existing platform tokens)
 */
import { useActionState, useState } from "react";
import { Button, Input, Label, Text, TextArea, TextField } from "react-aria-components";
import Link from "next/link";
import { createEventAction, updateEventBasicsAction } from "@/app/manage/actions";
import { suggestEventSlug, type EventBasicsInput } from "@/lib/events/basics";
import { eventManagePath } from "@/lib/events/routing";
import type { OrganizerActionState } from "@/lib/events/organizer-actions";

interface Props {
  initial: EventBasicsInput;
  requestId: string;
  creating?: boolean;
  readOnly?: boolean;
}

export function EventBasicsForm({ initial, requestId, creating = false, readOnly = false }: Props) {
  const [values, setValues] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(false);
  const [submittedValues, setSubmittedValues] = useState(initial);
  const action = creating ? createEventAction : updateEventBasicsAction.bind(null, initial.slug);
  const [state, formAction, pending] = useActionState<OrganizerActionState, FormData>(action, {});
  const showSuccess = state.success && JSON.stringify(submittedValues) === JSON.stringify(values);
  const change = (key: keyof EventBasicsInput, value: string) => setValues((previous) => ({ ...previous, [key]: value }));

  function field(key: keyof EventBasicsInput, label: string, options: { required?: boolean; maxLength?: number; helper?: string; multiline?: boolean } = {}) {
    const error = state.errors?.[key];
    return (
      <TextField name={key} value={values[key]} onChange={(value) => {
        if (key === "name" && creating && !slugEdited) setValues((previous) => ({ ...previous, name: value, slug: suggestEventSlug(value) }));
        else change(key, value);
        if (key === "slug") setSlugEdited(true);
      }} isRequired={options.required} isDisabled={readOnly} isInvalid={!!error}
        validationBehavior="aria" className="organizer-field">
        <Label className="font-semibold">{label}{options.required ? " (required)" : ""}</Label>
        {options.multiline ? <TextArea className="organizer-input" maxLength={options.maxLength} rows={4} /> : <Input className="organizer-input" maxLength={options.maxLength} />}
        <Text slot="description" className={`organizer-help ${error ? "text-danger" : "text-muted"}`}>{error ?? options.helper ?? ""}</Text>
      </TextField>
    );
  }

  // React resets action forms after completion; React Aria also resets controlled
  // fields to their original values. Keep edits and validation feedback intact.
  return (
    <form action={formAction} onSubmit={() => setSubmittedValues(values)} onResetCapture={(event) => event.preventDefault()} className="grid max-w-3xl gap-6" data-state={pending ? "loading" : showSuccess ? "success" : state.message && !state.success ? "error" : "default"}>
      <input type="hidden" name="requestId" value={state.nextRequestId ?? requestId} />
      {field("name", "Event name", { required: true, maxLength: 160 })}
      {creating ? field("slug", "Event URL slug", { required: true, maxLength: 80, helper: `Your unlisted link will be /e/${values.slug || "your-event"}. The slug cannot be changed later.` }) : (
        <p className="text-sm text-muted break-all">Event URL: /e/{initial.slug} · The slug is fixed.</p>
      )}
      {field("description", "Description", { multiline: true, maxLength: 4000, helper: "Tell attendees what this event is about. Optional." })}
      {field("venue", "Venue", { maxLength: 240, helper: "A venue name, address, or online location. Optional." })}
      {field("timezone", "Event timezone", { required: true, helper: "IANA timezone, for example Asia/Manila or America/New_York. All dates below use this zone." })}
      {creating ? <Button type="button" className="platform-link w-fit" onPress={() => change("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my timezone</Button> : null}
      <div className="grid gap-6 sm:grid-cols-2">
        {([ ["startsAt", "Starts"], ["endsAt", "Ends"] ] as const).map(([key, label]) => (
          <div className="organizer-field" key={key}>
            <label className="font-semibold" htmlFor={key}>{label} (required)</label>
            <input id={key} className="organizer-input" type="datetime-local" name={key} value={values[key]} onChange={(event) => change(key, event.target.value)} required disabled={readOnly}
              aria-invalid={!!state.errors?.[key]} aria-describedby={`${key}-help`} />
            <p id={`${key}-help`} className={`organizer-help ${state.errors?.[key] ? "text-danger" : "text-muted"}`}>{state.errors?.[key] ?? `In ${values.timezone || "the event timezone"}.`}</p>
          </div>
        ))}
      </div>
      <div className="min-h-6" aria-live="polite" aria-atomic="true">
        {state.message && (!state.success || showSuccess) ? <p className={state.success ? "text-success" : "text-danger"} role={state.success ? "status" : "alert"}>{state.message}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {!readOnly ? <Button type="submit" className="platform-button" isDisabled={pending} data-state={pending ? "loading" : showSuccess ? "success" : state.message && !state.success ? "error" : "default"}>{pending ? "Saving…" : creating ? "Create draft event" : "Save event details"}</Button> : <p className="text-muted">This event is read-only.</p>}
        <Link href={creating ? "/events" : eventManagePath(initial.slug)} className="platform-link">{creating ? "Cancel" : "Back to overview"}</Link>
      </div>
    </form>
  );
}
