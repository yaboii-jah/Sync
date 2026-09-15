import type { EventBasicsErrors } from "./basics";

export interface OrganizerActionState {
  errors?: EventBasicsErrors;
  message?: string;
  success?: boolean;
  nextRequestId?: string;
}

export function organizerErrorMessage(error: unknown): string {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const message = typeof record.message === "string" ? record.message : "";
  if (record.code === "23505") return "That event URL is already in use. Choose another slug.";
  if (message.includes("active owned event limit")) return "You have reached your active event limit. Archive an event before creating another.";
  if (message.includes("event window")) return "These dates exclude an existing session. Adjust the schedule before narrowing the event dates.";
  if (message.includes("draft has activity")) return "This draft has event activity and cannot be deleted. Archive it instead.";
  if (message.includes("read-only") || message.includes("suspended")) return "This event is read-only. Reload to see its current state.";
  if (message.includes("access required") || message.includes("authentication required")) return "Your permission changed. Reload the page before trying again.";
  if (message.includes("only draft") || message.includes("already archived") || message.includes("only untouched")) return "The event state changed. Reload before trying this action again.";
  if (message.includes("setup is incomplete") || message.includes("timezone") || message.includes("event end")) return "Event setup is incomplete. Check the dates and timezone, then try again.";
  return "The event could not be saved. Retry, or reload if the problem continues.";
}
