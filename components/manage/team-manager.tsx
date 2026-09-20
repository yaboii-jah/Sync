"use client";

import { useState, useTransition } from "react";
import { Copy, Crown, Mail, RefreshCw, Send, Shield, Trash2, UserRoundPlus } from "lucide-react";
import { issueEventAdminInvitationAction, removeEventAdminAction, revokeEventAdminInvitationAction, transferEventOwnershipAction } from "@/app/manage/actions";
import { Alert, Button, Card, Input, Label, Modal, TextArea, TextField } from "@/components/ui";
import { useToast } from "@/components/toast/toast-provider";
import type { ManagedEventInvitation, ManagedEventTeamMember } from "@/lib/supabase/queries/management";

type Target = { kind: "revoke"; invitation: ManagedEventInvitation } | { kind: "remove" | "transfer"; member: ManagedEventTeamMember } | null;

export function TeamManager({ slug, eventName, members, invitations, readOnly }: { slug: string; eventName: string; members: ManagedEventTeamMember[]; invitations: ManagedEventInvitation[]; readOnly: boolean }) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now] = useState(Date.now);
  const { toast } = useToast();
  const expired = (value: string) => new Date(value).getTime() <= now;

  function invite(address = email) {
    setError(null); setLink(null);
    startTransition(async () => {
      const result = await issueEventAdminInvitationAction({ slug, email: address, requestId: crypto.randomUUID(), deliveryRequestId: crypto.randomUUID() });
      if (result.error) return setError(result.error);
      setEmail(""); setLink(result.invitationUrl ?? null);
      toast(result.delivery === "sent" ? "Invitation email sent" : result.delivery === "limit_reached" ? "Email limit reached; copy the link instead" : "Invitation link ready to copy");
    });
  }

  async function copyLink() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast("Invitation link copied"); }
    catch { setError("Copy the invitation link from the field below."); }
  }

  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-tight">Team</h2><p className="mt-2 max-w-2xl leading-7 text-muted">Owners control access. Admins can manage event content but cannot invite, remove, or transfer ownership.</p></div></div>
    {readOnly ? <Alert status="warning" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>This event is read-only, or you are an admin. Only the active owner can change the team.</Alert.Description></Alert.Content></Alert> : null}
    {error ? <Alert status="danger" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    {!readOnly ? <Card variant="secondary" className="mt-8"><Card.Content className="gap-4"><div><h3 className="font-semibold">Invite an admin</h3><p className="mt-1 text-sm text-muted">The invitation only works for the exact verified email address and expires after seven days.</p></div><div className="flex flex-col gap-3 sm:flex-row"><TextField fullWidth value={email} onChange={setEmail}><Label className="sr-only">Admin email</Label><Input type="email" placeholder="admin@example.com" /></TextField><Button isPending={pending} onPress={() => invite()}><UserRoundPlus className="size-4" aria-hidden />Create invitation</Button></div>{link ? <div className="rounded-xl border p-3 platform-rule"><p className="text-sm font-medium">Copy this one-time invitation link now. It is not shown again after refresh.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="organizer-input min-w-0 flex-1" readOnly value={link} aria-label="Invitation link" /><Button size="sm" variant="outline" onPress={() => void copyLink()}><Copy className="size-4" aria-hidden />Copy link</Button></div></div> : null}</Card.Content></Card> : null}
    <div className="mt-8 grid gap-8 xl:grid-cols-2"><div><h3 className="text-lg font-semibold">Active team</h3><div className="mt-4 grid gap-3">{members.map((member) => <Card key={member.id} variant="secondary"><Card.Content className="gap-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-semibold">{member.name || member.email || "Unnamed member"}</p>{member.role === "owner" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning"><Crown className="size-3" aria-hidden />Owner</span> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Shield className="size-3" aria-hidden />Admin</span>}</div><p className="mt-1 text-sm text-muted">{member.email ?? "Email unavailable"}</p></div></div>{!readOnly && member.role === "admin" ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" isDisabled={pending} onPress={() => setTarget({ kind: "transfer", member })}><Crown className="size-4" aria-hidden />Transfer ownership</Button><Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setTarget({ kind: "remove", member })}><Trash2 className="size-4" aria-hidden />Remove</Button></div> : null}</Card.Content></Card>)}</div></div>
      <div><h3 className="text-lg font-semibold">Pending invitations</h3><div className="mt-4 grid gap-3">{invitations.length ? invitations.map((invitation) => <Card key={invitation.id} variant="secondary"><Card.Content className="gap-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{invitation.email}</p><p className="mt-1 text-sm text-muted">{expired(invitation.expiresAt) ? "Expired" : `Expires ${new Date(invitation.expiresAt).toLocaleString()}`}</p></div><Mail className="size-5 text-muted" aria-hidden /></div>{!readOnly ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" isDisabled={pending} onPress={() => invite(invitation.email)}><RefreshCw className="size-4" aria-hidden />Reissue</Button><Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setTarget({ kind: "revoke", invitation })}><Trash2 className="size-4" aria-hidden />Revoke</Button></div> : null}</Card.Content></Card>) : <div className="rounded-2xl border border-dashed p-8 text-center platform-rule"><Send className="mx-auto size-8 text-muted" aria-hidden /><p className="mt-3 font-semibold">No pending invitations</p></div>}</div></div></div>
    <TeamConfirmation target={target} eventName={eventName} onClose={() => setTarget(null)} onError={setError} onSuccess={(message) => { setTarget(null); toast(message); }} slug={slug} />
  </section>;
}

function TeamConfirmation({ target, eventName, slug, onClose, onError, onSuccess }: { target: Target; eventName: string; slug: string; onClose: () => void; onError: (value: string) => void; onSuccess: (value: string) => void }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  if (!target) return null;
  const name = target.kind === "revoke" ? target.invitation.email : target.member.name || target.member.email || "this admin";
  const submit = () => {
    onError("");
    startTransition(async () => {
      const requestId = crypto.randomUUID();
      const result = target.kind === "revoke" ? await revokeEventAdminInvitationAction({ slug, invitationId: target.invitation.id, reason, requestId })
        : target.kind === "remove" ? await removeEventAdminAction({ slug, membershipId: target.member.id, reason, requestId })
        : await transferEventOwnershipAction({ slug, membershipId: target.member.id, confirmation, requestId });
      if (result.error) return onError(result.error);
      onSuccess(result.success ?? "Team updated");
    });
  };
  const title = target.kind === "revoke" ? "Revoke invitation?" : target.kind === "remove" ? "Remove admin?" : "Transfer ownership?";
  return <Modal><Modal.Backdrop isOpen isDismissable={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><Modal.Container size="sm"><Modal.Dialog aria-label={title}><Modal.Header><Modal.Heading>{title}</Modal.Heading></Modal.Header><Modal.Body className="grid gap-4"><p><strong>{name}</strong></p>{target.kind === "transfer" ? <><p className="text-muted">This person becomes the owner. You remain an admin and lose owner-only controls.</p><TextField fullWidth value={confirmation} onChange={setConfirmation} isRequired><Label>Type “{eventName}” to confirm</Label><Input /></TextField></> : <><p className="text-muted">This change is recorded in the event audit log.</p><TextField fullWidth value={reason} onChange={setReason} isRequired><Label>Reason</Label><TextArea rows={3} maxLength={1000} /></TextField></>}</Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={pending} onPress={onClose}>Cancel</Button><Button variant={target.kind === "transfer" ? "danger" : "primary"} isPending={pending} onPress={submit}>{target.kind === "transfer" ? "Transfer ownership" : target.kind === "remove" ? "Remove admin" : "Revoke invitation"}</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>;
}
