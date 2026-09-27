import { describe, expect, it } from "vitest";
import { validateManagedSeatInput, validateManagedSession, validateManagedSpeaker, validateSpeakerIds } from "./program-management";

describe("program management validation", () => {
  const eventStart = "2026-10-10T00:00:00.000Z";
  const eventEnd = "2026-10-11T00:00:00.000Z";

  it("interprets session times in the event timezone", () => {
    expect(validateManagedSession({ title: "Opening", description: "", room: "Hall", startsAt: "2026-10-10T09:00", endsAt: "2026-10-10T10:00", published: false }, "Asia/Manila", eventStart, eventEnd)).toEqual({
      startsAt: "2026-10-10T01:00:00.000Z",
      endsAt: "2026-10-10T02:00:00.000Z",
    });
    expect(validateManagedSession({ title: "Closing", description: "", room: "Hall", startsAt: "2026-10-10T23:00", endsAt: "2026-10-11T00:00", published: false }, "UTC", "2026-10-10T00:00:00+00:00", "2026-10-11T00:00:00+00:00").error).toBeUndefined();
  });

  it("rejects ambiguous and out-of-window session times", () => {
    expect(validateManagedSession({ title: "Repeated", description: "", room: "", startsAt: "2026-11-01T01:30", endsAt: "2026-11-01T02:30", published: false }, "America/New_York", "2026-11-01T00:00:00.000Z", "2026-11-02T00:00:00.000Z").error).toContain("unambiguous");
    expect(validateManagedSession({ title: "Early", description: "", room: "", startsAt: "2026-10-09T23:00", endsAt: "2026-10-10T01:00", published: false }, "UTC", eventStart, eventEnd).error).toContain("event dates");
  });

  it("validates speaker roles and public URLs", () => {
    expect(validateManagedSpeaker({ name: "Ada", role: "speaker", organization: "", bio: "", photoUrl: "https://images.example/ada.jpg", linkedinUrl: "https://www.linkedin.com/in/ada", published: false }).error).toBeUndefined();
    expect(validateManagedSpeaker({ name: "Ada", role: "owner", organization: "", bio: "", photoUrl: "http://images.example/ada.jpg", linkedinUrl: "", published: false }).error).toContain("role");
    expect(validateManagedSpeaker({ name: "Ada", role: "speaker", organization: "", bio: "", photoUrl: "", linkedinUrl: "https://example.com/ada", published: false }).error).toContain("LinkedIn");
  });

  it("rejects duplicate, malformed, and oversized speaker selections", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(validateSpeakerIds([id, id])).toContain("duplicates");
    expect(validateSpeakerIds(["bad"])).toContain("invalid");
    expect(validateSpeakerIds(Array.from({ length: 51 }, (_, index) => `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`))).toContain("50");
  });

  it("normalizes unlimited seats and validates limited capacity", () => {
    expect(validateManagedSeatInput({ capacity: "", reservedSeats: "9", seatsClosed: true }, 0)).toEqual({ capacity: null, reservedSeats: 0, seatsClosed: false });
    expect(validateManagedSeatInput({ capacity: "12", reservedSeats: "3", seatsClosed: true }, 2)).toEqual({ capacity: 12, reservedSeats: 3, seatsClosed: true });
    expect(validateManagedSeatInput({ capacity: "4", reservedSeats: "3", seatsClosed: false }, 2).error).toContain("cover");
    expect(validateManagedSeatInput({ capacity: "", reservedSeats: "0", seatsClosed: false }, 1).error).toContain("Release");
  });

  it("rejects invalid seat numbers", () => {
    for (const capacity of ["0", "-1", "1.5", "999999999999999999999"]) {
      expect(validateManagedSeatInput({ capacity, reservedSeats: "0", seatsClosed: false }, 0).error).toContain("Capacity");
    }
    expect(validateManagedSeatInput({ capacity: "5", reservedSeats: "-1", seatsClosed: false }, 0).error).toContain("Reserved");
  });
});
