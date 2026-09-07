import { describe, expect, it } from "vitest";
import {
  seatAvailability,
  seatBadgeTone,
  seatButtonState,
  seatClaimNotice,
  type SessionSeats,
} from "./seats";

/** A session with no seat limit, which is every non-workshop row. */
const unlimited: SessionSeats = {
  capacity: null,
  reserved_seats: 0,
  claimed_seats: 0,
  seats_closed: false,
};

function seats(overrides: Partial<SessionSeats>): SessionSeats {
  return { ...unlimited, ...overrides };
}

describe("seatAvailability", () => {
  it("returns nothing for a session with no seat limit", () => {
    expect(seatAvailability(unlimited)).toBeNull();
  });

  it("reads a workshop that starts full from the organiser export", () => {
    // Workshop Tracks A and B: 33 seats, all 33 registered off-app.
    expect(
      seatAvailability(seats({ capacity: 33, reserved_seats: 33 })),
    ).toEqual({
      capacity: 33,
      taken: 33,
      remaining: 0,
      isFull: true,
      closed: false,
      label: "33/33 · Full",
    });
  });

  it("reads the BuilderCards tournament's four teams of four", () => {
    expect(
      seatAvailability(seats({ capacity: 16, reserved_seats: 16 })),
    ).toMatchObject({ capacity: 16, taken: 16, isFull: true });
  });

  it("opens seats when an organiser lowers the reserved count", () => {
    expect(
      seatAvailability(seats({ capacity: 33, reserved_seats: 30 })),
    ).toEqual({
      capacity: 33,
      taken: 30,
      remaining: 3,
      isFull: false,
      closed: false,
      label: "30/33 · 3 left",
    });
  });

  it("counts attendee claims against the same capacity", () => {
    // The organiser freed three seats and two attendees took one each.
    expect(
      seatAvailability(
        seats({ capacity: 33, reserved_seats: 30, claimed_seats: 2 }),
      ),
    ).toMatchObject({ taken: 32, remaining: 1, label: "32/33 · 1 left" });
  });

  it("fills up again once attendees have taken every freed seat", () => {
    expect(
      seatAvailability(
        seats({ capacity: 33, reserved_seats: 30, claimed_seats: 3 }),
      ),
    ).toMatchObject({ taken: 33, remaining: 0, isFull: true });
  });

  it("reads Full when an organiser closes seats that are still free", () => {
    expect(
      seatAvailability(
        seats({ capacity: 33, reserved_seats: 20, seats_closed: true }),
      ),
    ).toEqual({
      capacity: 33,
      taken: 20,
      remaining: 0,
      isFull: true,
      closed: true,
      label: "20/33 · Full",
    });
  });

  it("clamps a count that somehow exceeds capacity instead of over-reporting", () => {
    expect(
      seatAvailability(seats({ capacity: 33, reserved_seats: 40 })),
    ).toMatchObject({ taken: 33, remaining: 0, isFull: true });
  });

  it("treats a negative or non-finite count as zero rather than throwing", () => {
    expect(
      seatAvailability(
        seats({ capacity: 33, reserved_seats: -5, claimed_seats: Number.NaN }),
      ),
    ).toMatchObject({ taken: 0, remaining: 33, label: "0/33 · 33 left" });
  });

  it("returns nothing for a capacity that is zero or negative", () => {
    expect(seatAvailability(seats({ capacity: 0 }))).toBeNull();
    expect(seatAvailability(seats({ capacity: -3 }))).toBeNull();
  });
});

describe("seatBadgeTone", () => {
  it("marks a full workshop as danger and an open one as success", () => {
    const full = seatAvailability(seats({ capacity: 33, reserved_seats: 33 }))!;
    const open = seatAvailability(seats({ capacity: 33, reserved_seats: 30 }))!;

    expect(seatBadgeTone(full)).toBe("danger");
    expect(seatBadgeTone(open)).toBe("success");
  });
});

describe("seatClaimNotice", () => {
  it("confirms a clean claim", () => {
    expect(seatClaimNotice(0)).toEqual({
      message: "Seat saved. Added to My Flow.",
      tone: "success",
    });
  });

  it("warns about a single overlapping saved session", () => {
    // Workshop Track A runs alongside Tech Talk 1, so this is the common case.
    expect(seatClaimNotice(1)).toEqual({
      message: "Seat saved. Overlaps with 1 saved session.",
      tone: "warning",
    });
  });

  it("pluralises more than one overlap", () => {
    expect(seatClaimNotice(3)).toMatchObject({
      message: "Seat saved. Overlaps with 3 saved sessions.",
      tone: "warning",
    });
  });

  it("treats a nonsense count as no overlap rather than warning falsely", () => {
    expect(seatClaimNotice(-1).tone).toBe("success");
    expect(seatClaimNotice(Number.NaN).tone).toBe("success");
  });
});

describe("seatButtonState", () => {
  const open = seatAvailability(seats({ capacity: 33, reserved_seats: 30 }))!;
  const full = seatAvailability(seats({ capacity: 33, reserved_seats: 33 }))!;

  it("hides the control for a session with no seat limit", () => {
    expect(seatButtonState(null, { held: false, finished: false })).toBe(
      "hidden",
    );
  });

  it("hides the control once the session has finished", () => {
    expect(seatButtonState(open, { held: false, finished: true })).toBe(
      "hidden",
    );
    expect(seatButtonState(open, { held: true, finished: true })).toBe("hidden");
  });

  it("offers a free seat", () => {
    expect(seatButtonState(open, { held: false, finished: false })).toBe(
      "available",
    );
  });

  it("offers to release a seat the attendee already holds", () => {
    expect(seatButtonState(open, { held: true, finished: false })).toBe("held");
  });

  it("keeps the release offer even when the workshop is now full", () => {
    // Holding a seat outranks fullness: the attendee is already sitting in it.
    expect(seatButtonState(full, { held: true, finished: false })).toBe("held");
  });

  it("refuses a seat in a full workshop", () => {
    expect(seatButtonState(full, { held: false, finished: false })).toBe("full");
  });
});
