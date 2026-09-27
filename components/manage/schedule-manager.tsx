"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteManagedSessionAction,
  saveManagedSessionAction,
  setManagedSessionCapacityAction,
  setManagedSessionPublishedAction,
} from "@/app/manage/actions";
import { Alert, Button, Card, Checkbox, Input, Label, Modal, Switch, TextArea, TextField, Typography } from "@/components/ui";
import { useToast } from "@/components/toast/toast-provider";
import { formatEventDate, formatEventTimeRange } from "@/lib/format";
import { formatEventDateTimeInput } from "@/lib/events/basics";
import { validateManagedSeatInput, type ManagedSessionInput } from "@/lib/events/program-management";
import { seatAvailability } from "@/lib/seats";
import type { ManagedSpeaker } from "@/lib/supabase/queries/management";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";

interface Props {
  slug: string;
  timezone: string;
  sessions: SessionWithSpeakers[];
  speakers: ManagedSpeaker[];
  readOnly: boolean;
}

export function ScheduleManager({ slug, timezone, sessions, speakers, readOnly }: Props) {
  const [editing, setEditing] = useState<SessionWithSpeakers | null | undefined>();
  const [deleting, setDeleting] = useState<SessionWithSpeakers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const groups = useMemo(() => {
    const result = new Map<string, SessionWithSpeakers[]>();
    for (const session of sessions) {
      const date = formatEventDate(session.start_time, timezone);
      result.set(date, [...(result.get(date) ?? []), session]);
    }
    return [...result.entries()];
  }, [sessions, timezone]);

  function publish(session: SessionWithSpeakers) {
    setError(null);
    startTransition(async () => {
      const result = await setManagedSessionPublishedAction({ slug, sessionId: session.id, published: !session.published, requestId: crypto.randomUUID() });
      if (result.error) return setError(result.error);
      toast(session.published ? "Session unpublished" : "Session published");
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteManagedSessionAction({ slug, sessionId: target.id, requestId: crypto.randomUUID() });
      if (result.error) return setError(result.error);
      setDeleting(null);
      toast("Draft session deleted");
      router.refresh();
    });
  }

  return <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted">Times use {timezone}. Publish only sessions that attendees should see.</p>
      </div>
      {!readOnly ? <Button size="sm" onPress={() => setEditing(null)}><Plus className="size-4" aria-hidden />New session</Button> : null}
    </div>

    {error ? <Alert status="danger" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}

    {groups.length ? <div className="mt-8 grid gap-8">
      {groups.map(([date, datedSessions]) => <section key={date} aria-labelledby={`schedule-${date}`}>
        <h3 id={`schedule-${date}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{date}</h3>
        <div className="mt-3 grid gap-3">
          {datedSessions.map((session) => <Card key={session.id} variant="secondary">
            <Card.Content className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography type="h6">{session.title}</Typography>
                  <span className={`text-xs font-semibold ${session.published ? "text-success" : "text-muted"}`}>{session.published ? "Published" : "Draft"}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{formatEventTimeRange(session.start_time, session.end_time, timezone)}{session.room ? ` · ${session.room}` : ""}</p>
                {seatAvailability(session) ? <p className="mt-1 text-sm text-muted">Seats: {seatAvailability(session)?.label}</p> : null}
                {session.speakers.length ? <p className="mt-2 text-sm">{session.speakers.map((speaker) => speaker.name).join(", ")}</p> : <p className="mt-2 text-sm text-muted">No speakers assigned</p>}
              </div>
              {!readOnly ? <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setEditing(session)}><Pencil className="size-4" aria-hidden />Edit</Button>
                <Button size="sm" variant="outline" isDisabled={pending} onPress={() => publish(session)}>{session.published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}{session.published ? "Unpublish" : "Publish"}</Button>
                {!session.published && session.status === "not_started" ? <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setDeleting(session)}><Trash2 className="size-4" aria-hidden />Delete</Button> : null}
              </div> : null}
            </Card.Content>
          </Card>)}
        </div>
      </section>)}
    </div> : <div className="mt-8 rounded-2xl border border-dashed p-8 text-center platform-rule"><CalendarClock className="mx-auto size-8 text-muted" aria-hidden /><h3 className="mt-3 font-semibold">No sessions yet</h3><p className="mt-1 text-sm text-muted">Create the first session, then publish it when it is ready.</p></div>}

    {editing !== undefined ? <SessionForm key={editing?.id ?? "new"} slug={slug} timezone={timezone} session={editing} speakers={speakers} onClose={() => setEditing(undefined)} /> : null}

    <Modal><Modal.Backdrop isOpen={deleting !== null} isDismissable={!pending} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><Modal.Container size="sm"><Modal.Dialog aria-label="Delete draft session"><Modal.Header><Modal.Heading>Delete draft session?</Modal.Heading></Modal.Header><Modal.Body><p className="font-semibold">{deleting?.title}</p><p className="mt-2 text-muted">This permanently removes the unpublished session. Published or started sessions must be retained.</p></Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={pending} onPress={() => setDeleting(null)}>Cancel</Button><Button variant="danger" isPending={pending} onPress={remove}>Delete draft</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </>;
}

function SessionForm({ slug, timezone, session, speakers, onClose }: { slug: string; timezone: string; session: SessionWithSpeakers | null; speakers: ManagedSpeaker[]; onClose: () => void }) {
  const [values, setValues] = useState<ManagedSessionInput>({
    title: session?.title ?? "",
    description: session?.description ?? "",
    room: session?.room ?? "",
    startsAt: session ? formatEventDateTimeInput(session.start_time, timezone) : "",
    endsAt: session ? formatEventDateTimeInput(session.end_time, timezone) : "",
    published: session?.published ?? false,
  });
  const [speakerIds, setSpeakerIds] = useState(() => session?.speakers.map((speaker) => speaker.id) ?? []);
  const [capacity, setCapacity] = useState(session?.capacity === null || !session ? "" : String(session.capacity));
  const [reservedSeats, setReservedSeats] = useState(session ? String(session.reserved_seats) : "0");
  const [seatsClosed, setSeatsClosed] = useState(session?.seats_closed ?? false);
  const [requestIds] = useState(() => ({ details: crypto.randomUUID(), speakers: crypto.randomUUID() }));
  const [seatRequestId, setSeatRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const change = (key: keyof ManagedSessionInput, value: string | boolean) => setValues((previous) => ({ ...previous, [key]: value }));
  const seatInput = { capacity, reservedSeats, seatsClosed };
  const seatSettings = validateManagedSeatInput(seatInput, session?.claimed_seats ?? 0);
  const seatPreview = seatSettings.capacity != null && seatSettings.reservedSeats !== undefined && seatSettings.seatsClosed !== undefined
    ? seatAvailability({ capacity: seatSettings.capacity, reserved_seats: seatSettings.reservedSeats, claimed_seats: session?.claimed_seats ?? 0, seats_closed: seatSettings.seatsClosed })
    : null;
  const seatsChanged = seatSettings.capacity !== (session?.capacity ?? null) ||
    seatSettings.reservedSeats !== (session?.reserved_seats ?? 0) ||
    seatSettings.seatsClosed !== (session?.seats_closed ?? false);

  function submit() {
    setError(null);
    if (seatSettings.error) { setError(seatSettings.error); return; }
    startTransition(async () => {
      const result = await saveManagedSessionAction({ slug, sessionId: session?.id ?? null, values, speakerIds, detailsRequestId: requestIds.details, speakersRequestId: requestIds.speakers });
      if (result.error) {
        if (result.entityId) {
          toast(`Session saved, but speaker assignments or seats were not updated: ${result.error}`, "error");
          router.refresh();
          onClose();
        } else setError(result.error);
        return;
      }
      if (seatsChanged && result.entityId) {
        const seatResult = await setManagedSessionCapacityAction({ slug, sessionId: result.entityId, seats: seatInput, requestId: seatRequestId });
        if (seatResult.error) {
          setError(`Session saved, but seats were not updated: ${seatResult.error}`);
          router.refresh();
          return;
        }
      }
      toast(session ? "Session updated" : "Session created");
      router.refresh();
      onClose();
    });
  }

  return <Modal><Modal.Backdrop isOpen isDismissable={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><Modal.Container size="md"><Modal.Dialog aria-label={session ? "Edit session" : "New session"} className="max-h-[90dvh]"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header><Modal.Heading>{session ? "Edit session" : "New session"}</Modal.Heading></Modal.Header><Modal.Body className="grid gap-4 overflow-y-auto">
    {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    <TextField fullWidth value={values.title} onChange={(value) => change("title", value)} isRequired><Label>Title</Label><Input maxLength={120} /></TextField>
    <TextField fullWidth value={values.room} onChange={(value) => change("room", value)}><Label>Room</Label><Input maxLength={120} /></TextField>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField fullWidth value={values.startsAt} onChange={(value) => change("startsAt", value)} isRequired><Label>Starts in {timezone}</Label><Input type="datetime-local" /></TextField>
      <TextField fullWidth value={values.endsAt} onChange={(value) => change("endsAt", value)} isRequired><Label>Ends in {timezone}</Label><Input type="datetime-local" /></TextField>
    </div>
    <TextField fullWidth value={values.description} onChange={(value) => change("description", value)}><Label>Description</Label><TextArea rows={4} maxLength={2000} /></TextField>
    <fieldset className="grid gap-3 rounded-xl border p-4 platform-rule">
      <legend className="px-1 text-sm font-medium">Seats</legend>
      <p className="text-xs text-muted">Leave capacity blank for no seat limit. Held seats are read-only; registered off-app seats are organizer-controlled.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField fullWidth value={capacity} onChange={(value) => { setCapacity(value); setSeatRequestId(crypto.randomUUID()); }}><Label>Capacity</Label><Input inputMode="numeric" placeholder="No limit" /></TextField>
        <TextField fullWidth value={reservedSeats} onChange={(value) => { setReservedSeats(value); setSeatRequestId(crypto.randomUUID()); }} isDisabled={!capacity.trim()}><Label>Registered off-app</Label><Input inputMode="numeric" /></TextField>
      </div>
      <p className="text-xs text-muted">Held in app: {session?.claimed_seats ?? 0}. {seatPreview?.label ?? "No seat limit"}</p>
      {capacity.trim() ? <Switch isSelected={seatsClosed} onChange={(value) => { setSeatsClosed(value); setSeatRequestId(crypto.randomUUID()); }}><Switch.Content className="w-full justify-between gap-4"><span className="text-sm">Close seats to new claims</span><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content></Switch> : null}
    </fieldset>
    {!session ? <Switch isSelected={values.published} onChange={(value) => change("published", value)}><Switch.Content className="w-full justify-between gap-4"><span><span className="block text-sm font-medium">Publish immediately</span><span className="block text-xs text-muted">Drafts stay hidden from attendees.</span></span><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content></Switch> : null}
    <fieldset className="grid gap-2"><legend className="mb-1 text-sm font-medium">Speakers</legend>{speakers.length ? speakers.map((speaker) => <Checkbox key={speaker.id} isSelected={speakerIds.includes(speaker.id)} onChange={(selected) => setSpeakerIds((current) => selected ? [...current, speaker.id] : current.filter((id) => id !== speaker.id))}><Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>{speaker.name}<span className="text-xs text-muted">{speaker.published ? "Published" : "Draft"}</span></Checkbox.Content></Checkbox>) : <p className="text-sm text-muted">Create speakers first, then return to assign them.</p>}</fieldset>
  </Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={pending} onPress={onClose}>Cancel</Button><Button isPending={pending} onPress={submit}>{session ? "Save changes" : "Create session"}</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>;
}
