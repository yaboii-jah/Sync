import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/lib/feature-flags", () => ({ isMultiTenantPlatformEnabled: vi.fn(() => true) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/auth", () => ({ getAuthenticatedClaims: vi.fn() }));
vi.mock("@/lib/supabase/queries/events", () => ({ getEventAccessBySlug: vi.fn() }));
vi.mock("@/lib/supabase/queries/event-feedback", () => ({
  submitEventFeedbackEntry: vi.fn(), getEventRaffleSnapshot: vi.fn(), getEventRaffleAttendeeDetail: vi.fn(),
}));
vi.mock("@/lib/supabase/management-auth", () => ({ requireEventManager: vi.fn() }));

import { submitEventFeedback } from "@/app/e/[slug]/feedback/actions";
import { getScopedRaffleAttendeeDetail, getScopedRaffleSnapshot } from "@/app/manage/[slug]/raffle/actions";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { submitEventFeedbackEntry, getEventRaffleSnapshot, getEventRaffleAttendeeDetail } from "@/lib/supabase/queries/event-feedback";
import { requireEventManager } from "@/lib/supabase/management-auth";

const requestId = "93000000-0000-4000-8000-000000000001";
const eventId = "93000000-0000-0000-0000-000000000010";
const emptyState = { error: null, field: null, success: false, completedRequestId: null };
function form(slug = "unit-feedback-a") {
  const data = new FormData();
  data.set("event_slug", slug);
  data.set("category", "idea");
  data.set("message", "  Nice event  ");
  data.set("request_id", requestId);
  return data;
}

afterEach(() => vi.clearAllMocks());

describe("event feedback action", () => {
  it("rejects unauthorized event context before writing", async () => {
    vi.mocked(getAuthenticatedClaims).mockResolvedValue({ sub: "attendee" } as never);
    vi.mocked(getEventAccessBySlug).mockResolvedValue(null);
    const result = await submitEventFeedback(emptyState, form("other-event"));
    expect(result.success).toBe(false);
    expect(submitEventFeedbackEntry).not.toHaveBeenCalled();
  });

  it("sends only the checked event and trimmed message", async () => {
    vi.mocked(getAuthenticatedClaims).mockResolvedValue({ sub: "attendee" } as never);
    vi.mocked(getEventAccessBySlug).mockResolvedValue({
      event: { id: eventId, role: "attendee", membershipStatus: "active", lifecycle: "published", isSuspended: false },
    } as never);
    const result = await submitEventFeedback(emptyState, form());
    expect(result.success).toBe(true);
    expect(submitEventFeedbackEntry).toHaveBeenCalledWith(expect.anything(), {
      eventId, category: "idea", message: "Nice event", requestId,
    });
  });

  it("does not call the database for malformed feedback", async () => {
    const data = form();
    data.set("message", "   ");
    const result = await submitEventFeedback(emptyState, data);
    expect(result.field).toBe("message");
    expect(getAuthenticatedClaims).not.toHaveBeenCalled();
  });
});

describe("scoped raffle actions", () => {
  it("reauthorizes each export and duplicate-detail request", async () => {
    vi.mocked(requireEventManager).mockRejectedValue(new Error("not-found"));
    await expect(getScopedRaffleSnapshot("unit-feedback-a")).rejects.toThrow("not-found");
    await expect(getScopedRaffleAttendeeDetail("unit-feedback-a", requestId)).rejects.toThrow("not-found");
    expect(getEventRaffleSnapshot).not.toHaveBeenCalled();
    expect(getEventRaffleAttendeeDetail).not.toHaveBeenCalled();
  });

  it("rejects a malformed membership before querying", async () => {
    await expect(getScopedRaffleAttendeeDetail("unit-feedback-a", "bad")).rejects.toThrow("Invalid raffle attendee");
    expect(requireEventManager).not.toHaveBeenCalled();
  });

  it("rejects draft and suspended events after authorization", async () => {
    vi.mocked(requireEventManager).mockResolvedValue({ event: { id: eventId, lifecycle: "draft", isSuspended: false }, supabase: {} } as never);
    await expect(getScopedRaffleSnapshot("unit-feedback-a")).rejects.toThrow("Raffle unavailable");
    vi.mocked(requireEventManager).mockResolvedValue({ event: { id: eventId, lifecycle: "published", isSuspended: true }, supabase: {} } as never);
    await expect(getScopedRaffleAttendeeDetail("unit-feedback-a", requestId)).rejects.toThrow("Raffle unavailable");
  });
});
