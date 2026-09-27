/**
 * Seat capacity for the sessions that have a seat limit — in practice the
 * three workshop tracks. Everything else carries a null capacity and shows no
 * seat information at all.
 *
 * Two independent writers move the numbers. Event operations owns
 * `reserved_seats`, the count registered off-app through the organiser export;
 * attendee claim rows drive `claimed_seats` through database triggers. Taken seats
 * are the sum, so an organiser freeing seats and an attendee taking one never
 * overwrite each other's number.
 *
 * These helpers are pure so the same reading drives the attendee badge, the
 * seat button and the admin console without any of them re-deriving it.
 */

export interface SessionSeats {
  /** Total seats, or null when the session has no seat limit. */
  capacity: number | null;
  /** Seats registered off-app. The only seat number an admin edits. */
  reserved_seats: number;
  /** Seats attendees hold in the app. */
  claimed_seats: number;
  /** Organiser override that reads Full however many seats are free. */
  seats_closed: boolean;
}

export interface SeatAvailability {
  capacity: number;
  taken: number;
  remaining: number;
  isFull: boolean;
  /** True when fullness comes from the organiser's switch, not the count. */
  closed: boolean;
  /** Badge text: `33/33 · Full`, `30/33 · 3 left`. */
  label: string;
}

/** Bad data should render as a number, not crash a card. */
function toCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * The one reading of a session's seats, or null when the session has no seat
 * limit and the UI should stay exactly as it is today.
 *
 * `taken` is clamped to capacity: if the two writers ever disagree, a card
 * should read `33/33 · Full` rather than announce a room holding 40 of 33.
 */
export function seatAvailability(seats: SessionSeats): SeatAvailability | null {
  const capacity = seats.capacity;
  if (capacity === null || !Number.isFinite(capacity) || capacity <= 0) {
    return null;
  }

  const total = Math.floor(capacity);
  const taken = Math.min(
    total,
    toCount(seats.reserved_seats) + toCount(seats.claimed_seats),
  );
  const free = total - taken;
  const closed = seats.seats_closed;
  const isFull = closed || free <= 0;
  const remaining = isFull ? 0 : free;

  return {
    capacity: total,
    taken,
    remaining,
    isFull,
    closed,
    label: `${taken}/${total} · ${
      isFull ? "Full" : `${remaining} left`
    }`,
  };
}

/** A full workshop reads as a closed door; an open one as an invitation. */
export function seatBadgeTone(
  availability: SeatAvailability,
): "danger" | "success" {
  return availability.isFull ? "danger" : "success";
}

export interface SeatClaimNotice {
  message: string;
  tone: "success" | "warning";
}

/**
 * What to tell an attendee who just took a seat.
 *
 * A seat also saves the session to My Flow, so it inherits My Flow's overlap
 * warning — the workshop tracks run alongside the tech talks, and a seat taken
 * in silence would hide that. As with a bookmark, the overlap is a warning and
 * never a refusal.
 */
export function seatClaimNotice(conflictCount: number): SeatClaimNotice {
  const overlaps = Number.isFinite(conflictCount)
    ? Math.max(0, Math.floor(conflictCount))
    : 0;

  if (overlaps === 0) {
    return { message: "Seat saved. Added to My Flow.", tone: "success" };
  }

  return {
    message: `Seat saved. Overlaps with ${overlaps} saved ${
      overlaps === 1 ? "session" : "sessions"
    }.`,
    tone: "warning",
  };
}

export type SeatButtonState =
  /** No seat limit, or the session is over: show nothing. */
  | "hidden"
  /** The attendee is sitting in this one and can give the seat back. */
  | "held"
  /** A seat is there for the taking. */
  | "available"
  /** No seat to take. */
  | "full";

export function seatButtonState(
  availability: SeatAvailability | null,
  context: { held: boolean; finished: boolean },
): SeatButtonState {
  if (availability === null || context.finished) return "hidden";
  // Holding a seat outranks fullness — the attendee is already in the room.
  if (context.held) return "held";
  return availability.isFull ? "full" : "available";
}
