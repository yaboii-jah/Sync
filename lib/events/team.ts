import { createHash, randomBytes } from "node:crypto";

const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type InvitationDeliveryStatus = "sent" | "not_configured" | "limit_reached" | "failed";

export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function invitationTokenHash(token: string): string | null {
  if (!INVITATION_TOKEN_PATTERN.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

export function eventInvitationUrl(token: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  let url: URL;
  try { url = new URL(base); } catch { throw new Error("A valid site URL is required to create an invitation link."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new Error("A valid site URL is required to create an invitation link.");
  }
  url.pathname = "/invite";
  url.search = "";
  url.hash = token;
  return url.toString();
}

export function teamInputError(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized) || normalized.length > 320) return "Enter a valid email address.";
  return null;
}

export function isTeamReason(value: string): boolean {
  const length = value.trim().length;
  return length >= 8 && length <= 1000;
}
