import "server-only";
import { Resend } from "resend";
import type { InvitationDeliveryStatus } from "@/lib/events/team";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

export async function sendEventAdminInvitation(input: {
  deliveryId: string;
  email: string;
  eventName: string;
  invitationUrl: string;
}): Promise<{ status: InvitationDeliveryStatus; providerMessageId?: string; failureCode?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EVENT_INVITE_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { status: "not_configured" };
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [input.email],
      subject: `You are invited to manage ${input.eventName}`,
      html: `<p>You have been invited to help manage <strong>${escapeHtml(input.eventName)}</strong> in Sync.</p><p><a href="${escapeHtml(input.invitationUrl)}">Review invitation</a></p><p>This link expires in seven days and must be opened while signed in with this email address.</p>`,
    }, { idempotencyKey: `event-admin-invitation/${input.deliveryId}` });
    if (error || !data?.id) return { status: "failed", failureCode: "provider_error" };
    return { status: "sent", providerMessageId: data.id };
  } catch {
    return { status: "failed", failureCode: "provider_error" };
  }
}

export function isEventAdminInvitationEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EVENT_INVITE_FROM_EMAIL?.trim());
}
