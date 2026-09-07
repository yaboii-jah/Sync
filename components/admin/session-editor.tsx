"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Separator,
  Switch,
  TextField,
} from "@/components/ui";
import {
  createSessionAction,
  setSessionCapacityAction,
  updateSessionAction,
} from "@/app/(admin)/admin/actions";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { useToast } from "@/components/toast/toast-provider";
import { formatManilaDateTimeInput } from "@/lib/format";
import { seatAvailability, seatBadgeTone } from "@/lib/seats";

interface SessionEditorProps {
  /** Absent when creating; the session being edited otherwise. */
  session: SessionWithSpeakers | null;
  /** Required to create; the event the new session belongs to. */
  eventId: string;
  onClose: () => void;
}

/**
 * `datetime-local` inputs speak wall-clock time with no zone. The event is
 * always in Manila, so format the instant explicitly instead of using the
 * browser's local timezone.
 */
function toLocalInputValue(iso: string): string {
  return formatManilaDateTimeInput(iso);
}

/** A blank seat field means "no limit"; anything else must be a whole number. */
const WHOLE_NUMBER = /^\d+$/;

type SeatField =
  | { kind: "blank" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

function parseSeatField(value: string): SeatField {
  const trimmed = value.trim();
  if (trimmed === "") return { kind: "blank" };
  return WHOLE_NUMBER.test(trimmed)
    ? { kind: "number", value: Number(trimmed) }
    : { kind: "invalid" };
}

export function SessionEditor({
  session,
  eventId,
  onClose,
}: SessionEditorProps) {
  const editing = session !== null;
  const [title, setTitle] = useState(session?.title ?? "");
  const [room, setRoom] = useState(session?.room ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [startTime, setStartTime] = useState(
    session ? toLocalInputValue(session.start_time) : "",
  );
  const [endTime, setEndTime] = useState(
    session ? toLocalInputValue(session.end_time) : "",
  );
  const [publishNow, setPublishNow] = useState(false);
  const [capacity, setCapacity] = useState(
    session?.capacity != null ? String(session.capacity) : "",
  );
  const [reservedSeats, setReservedSeats] = useState(
    session ? String(session.reserved_seats) : "0",
  );
  const [seatsClosed, setSeatsClosed] = useState(session?.seats_closed ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  /*
   * Seats attendees are already sitting in. It is read-only here on purpose:
   * an organiser edits the off-app registration count, never someone's seat.
   */
  const claimedSeats = session?.claimed_seats ?? 0;
  const capacityField = parseSeatField(capacity);
  const reservedField = parseSeatField(reservedSeats);
  const nextCapacity =
    capacityField.kind === "number" ? capacityField.value : null;
  const nextReserved =
    reservedField.kind === "number" ? reservedField.value : 0;
  /** Exactly the badge an attendee will see, rendered from the live fields. */
  const seatPreview = seatAvailability({
    capacity: nextCapacity,
    reserved_seats: nextReserved,
    claimed_seats: claimedSeats,
    seats_closed: seatsClosed,
  });
  const seatsChanged =
    nextCapacity !== (session?.capacity ?? null) ||
    nextReserved !== (session?.reserved_seats ?? 0) ||
    seatsClosed !== (session?.seats_closed ?? false);

  function submit() {
    setError(null);

    if (capacityField.kind === "invalid") {
      setError("Capacity must be a whole number, or blank for no seat limit.");
      return;
    }
    if (reservedField.kind === "invalid") {
      setError("Reserved seats must be a whole number.");
      return;
    }
    /*
     * The database refuses both of these too. Catching them here keeps the
     * schedule details from being saved on a submission that was always going
     * to fail on its second half.
     */
    if (capacityField.kind === "blank" && claimedSeats > 0) {
      setError(
        `Cannot remove the seat limit while ${claimedSeats} ${claimedSeats === 1 ? "attendee holds" : "attendees hold"} a seat. Close seats instead.`,
      );
      return;
    }
    if (nextCapacity !== null && nextReserved + claimedSeats > nextCapacity) {
      setError(
        `Capacity must be at least ${nextReserved + claimedSeats} to cover ${nextReserved} reserved and ${claimedSeats} attendee seats.`,
      );
      return;
    }

    /*
     * The request id is minted once per submission and replayed on retry: the
     * RPCs key their idempotency off it, so a double-click cannot create the
     * same session twice.
     */
    const requestId = crypto.randomUUID();
    const form = { title, description, room, startTime, endTime, requestId };

    startTransition(async () => {
      const result = editing
        ? await updateSessionAction({ ...form, sessionId: session.id })
        : await createSessionAction({ ...form, eventId, published: publishNow });

      if (result.error) {
        setError(result.error);
        return;
      }

      /*
       * Seats are a second audited mutation, so they need a request id of
       * their own: the database refuses to replay one id across two actions.
       * The details are already saved by this point, so a seat failure has to
       * say so rather than reading as if nothing happened.
       */
      const savedSessionId = editing ? session.id : result.sessionId;

      if (seatsChanged && !savedSessionId) {
        // Never report seats as saved when there was no row to save them to.
        setError(
          "Session created, but the seats were not updated: the new session could not be identified. Open it from the list and set the seats there.",
        );
        router.refresh();
        return;
      }

      if (seatsChanged && savedSessionId) {
        const seatResult = await setSessionCapacityAction({
          sessionId: savedSessionId,
          capacity: nextCapacity,
          reservedSeats: nextReserved,
          seatsClosed,
          requestId: crypto.randomUUID(),
        });

        if (seatResult.error) {
          setError(
            `${editing ? "Session saved" : "Session created"}, but the seats were not updated: ${seatResult.error}`,
          );
          router.refresh();
          return;
        }
      }

      toast(editing ? "Session updated" : "Session created");
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        isDismissable={!pending}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog
            aria-label={editing ? "Edit session" : "New session"}
            className="max-h-[85dvh] w-full"
          >
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>
                {editing ? "Edit session" : "New session"}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <TextField fullWidth value={title} onChange={setTitle} isRequired>
                <Label>Title</Label>
                <Input variant="secondary" placeholder="Keynote: …" />
              </TextField>

              <TextField fullWidth value={room} onChange={setRoom}>
                <Label>Room</Label>
                <Input variant="secondary" placeholder="Main Hall" />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  fullWidth
                  value={startTime}
                  onChange={setStartTime}
                  isRequired
                >
                  <Label>Starts (PHT)</Label>
                  <Input variant="secondary" type="datetime-local" />
                </TextField>

                <TextField
                  fullWidth
                  value={endTime}
                  onChange={setEndTime}
                  isRequired
                >
                  <Label>Ends (PHT)</Label>
                  <Input variant="secondary" type="datetime-local" />
                </TextField>
              </div>

              <TextField
                fullWidth
                value={description}
                onChange={setDescription}
              >
                <Label>Description</Label>
                <Input variant="secondary" placeholder="What this covers" />
              </TextField>

              <Separator />

              {/*
                * Seats. Blank capacity is the default and the state of every
                * ordinary talk: no seat limit, and attendees see nothing at
                * all. The preview chip is the same component the attendee card
                * renders, so what an organiser reads here is literally what
                * the room will read on their phones.
                */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Seats
                  </span>
                  {seatPreview ? (
                    <Chip
                      size="sm"
                      color={seatBadgeTone(seatPreview)}
                      variant="soft"
                      className="tabular-nums"
                    >
                      {seatPreview.label}
                    </Chip>
                  ) : (
                    <span className="text-xs text-muted">No seat limit</span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    value={capacity}
                    onChange={setCapacity}
                    inputMode="numeric"
                  >
                    <Label>Capacity</Label>
                    <Input variant="secondary" placeholder="Blank = no limit" />
                  </TextField>

                  <TextField
                    fullWidth
                    value={reservedSeats}
                    onChange={setReservedSeats}
                    inputMode="numeric"
                    isDisabled={nextCapacity === null}
                  >
                    <Label>Registered off-app</Label>
                    <Input variant="secondary" placeholder="0" />
                  </TextField>
                </div>

                <p className="text-xs text-muted">
                  {claimedSeats > 0
                    ? `${claimedSeats} ${claimedSeats === 1 ? "attendee has" : "attendees have"} taken a seat in the app. Lower "Registered off-app" to open more.`
                    : 'Lower "Registered off-app" to open seats for attendees to take in the app.'}
                </p>

                {nextCapacity === null ? null : (
                  <Switch
                    className="w-full"
                    isSelected={seatsClosed}
                    onChange={setSeatsClosed}
                    aria-label="Close seats"
                  >
                    <Switch.Content className="w-full justify-between gap-4">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          Close seats
                        </span>
                        <span className="block text-xs font-normal text-muted">
                          Reads Full and refuses new claims even when seats are
                          free. Seats already taken are kept.
                        </span>
                      </span>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                )}
              </div>

              {editing ? null : (
                <Switch
                  className="w-full"
                  isSelected={publishNow}
                  onChange={setPublishNow}
                  aria-label="Publish immediately"
                >
                  <Switch.Content className="w-full justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        Publish immediately
                      </span>
                      <span className="block text-xs font-normal text-muted">
                        Off keeps it a draft — hidden from attendees, and the
                        scheduled job will not announce it.
                      </span>
                    </span>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              )}
            </Modal.Body>

            <Modal.Footer className="flex shrink-0 gap-3">
              <Button variant="outline" onPress={onClose} isDisabled={pending}>
                Cancel
              </Button>
              <Button onPress={submit} isPending={pending}>
                {editing ? "Save changes" : "Create session"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
