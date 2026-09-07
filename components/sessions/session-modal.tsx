"use client";

import { Avatar, Button, Modal, Separator, Typography } from "@/components/ui";
import { CalendarPlus } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatManilaDate,
  formatRelativeTime,
  formatTimeRange,
} from "@/lib/format";
import { googleCalendarUrl, downloadIcs } from "@/lib/calendar";
import { seatAvailability, seatButtonState } from "@/lib/seats";
import { StatusBadge } from "@/components/status-badge";

interface SessionModalProps {
  session: SessionWithSpeakers;
  bookmarked: boolean;
  /** Whether this attendee is holding a seat in this session. */
  seatHeld: boolean;
  /** True while a seat change is in flight, to stop a double claim. */
  seatPending: boolean;
  onToggleBookmark: (sessionId: string) => void;
  onClaimSeat: (sessionId: string) => void;
  onReleaseSeat: (sessionId: string) => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  speaker: "Speaker",
  host: "Host",
  panelist: "Panelist",
  sponsor: "Sponsor",
  facilitator: "Facilitator",
};

const secondaryAction =
  "border-border text-foreground hover:bg-default inline-flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors";

export function SessionModal({
  session,
  bookmarked,
  seatHeld,
  seatPending,
  onToggleBookmark,
  onClaimSeat,
  onReleaseSeat,
  onClose,
}: SessionModalProps) {
  const status = effectiveSessionStatus(session);
  /*
   * Taking a seat is a deliberate act, so it lives here rather than on the
   * card: the card states how full a workshop is, and the decision is made
   * with the description, room and facilitator in front of you.
   */
  const seats = seatAvailability(session);
  const seatState = seatButtonState(seats, {
    held: seatHeld,
    finished: status === "finished",
  });

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        isDismissable
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        {/*
          * Centred at every size rather than a bottom sheet. A flush bottom
          * sheet gets clipped by the device frames this is previewed in, and a
          * centred dialog is what was asked for. `scroll="inside"` plus the
          * `dvh` cap keeps a long session inside the viewport with its actions
           * reachable; `dvh` is browser-measured in the embedding viewport.
          */}
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog
            aria-label={session.title}
            className="squircle max-h-[85dvh] w-full"
          >
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>{session.title}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={status} />
                <Typography type="body-sm" color="muted">
                  {formatManilaDate(session.start_time)}
                  {", "}
                  {formatTimeRange(session.start_time, session.end_time)}
                </Typography>
              </div>

              <Typography type="body-sm" color="muted">
                {session.room ?? "TBA"}
              </Typography>

              {session.status_override ? (
                <Typography type="body-xs" color="muted">
                  Live status updated by event operations
                  {session.status_override === "ongoing" &&
                  session.actual_started_at
                    ? `, started ${formatRelativeTime(session.actual_started_at)}`
                    : null}
                  {session.status_override === "finished" &&
                  session.actual_ended_at
                    ? `, ended ${formatRelativeTime(session.actual_ended_at)}`
                    : null}
                </Typography>
              ) : null}

              {session.description ? (
                <>
                  <Separator />
                  <Typography type="body-sm">{session.description}</Typography>
                </>
              ) : null}

              {session.speakers.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <Typography type="body-sm" weight="semibold">
                      On stage
                    </Typography>
                    <ul className="mt-3 flex flex-col gap-3">
                      {session.speakers.map((speaker) => (
                        <li key={speaker.id} className="flex items-center gap-3">
                          <Avatar size="sm">
                            <Avatar.Fallback>
                              {speaker.name.charAt(0).toUpperCase()}
                            </Avatar.Fallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Typography type="body-sm" weight="medium">
                              {speaker.name}
                            </Typography>
                            <Typography type="body-xs" color="muted">
                              {ROLE_LABELS[speaker.role] ?? speaker.role}
                              {speaker.organization
                                ? `, ${speaker.organization}`
                                : ""}
                            </Typography>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex shrink-0 flex-col gap-3">
              {seats && seatState !== "hidden" ? (
                <div className="flex w-full flex-col gap-2">
                  <Typography
                    type="body-sm"
                    color="muted"
                    className="tabular-nums"
                  >
                    {seatHeld
                      ? `You have a seat · ${seats.label}`
                      : `Seats · ${seats.label}`}
                  </Typography>

                  {seatState === "full" ? (
                    <Button fullWidth variant="secondary" isDisabled>
                      {seats.closed ? "Seats closed" : "No seats left"}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={seatState === "held" ? "outline" : "primary"}
                      isDisabled={seatPending}
                      onPress={() =>
                        seatState === "held"
                          ? onReleaseSeat(session.id)
                          : onClaimSeat(session.id)
                      }
                    >
                      {seatState === "held" ? "Release your seat" : "Take a seat"}
                    </Button>
                  )}
                </div>
              ) : null}

              {status !== "finished" ? (
                <Button
                  fullWidth
                  variant={bookmarked ? "secondary" : "primary"}
                  onPress={() => onToggleBookmark(session.id)}
                >
                  {bookmarked ? "Saved to My Flow" : "Add to My Flow"}
                </Button>
              ) : null}

              <div className="grid w-full grid-cols-2 gap-3">
                <a
                  href={googleCalendarUrl(session)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={secondaryAction}
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  Google Cal
                </a>
                <button
                  type="button"
                  onClick={() => downloadIcs(session)}
                  className={secondaryAction}
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  .ics file
                </button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
