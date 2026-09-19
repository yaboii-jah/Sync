"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteManagedSpeakerAction, saveManagedSpeakerAction, setManagedSpeakerPublishedAction } from "@/app/manage/actions";
import { Alert, Avatar, Button, Card, Input, Label, Modal, Switch, TextArea, TextField, Typography } from "@/components/ui";
import { useToast } from "@/components/toast/toast-provider";
import { EVENT_SPEAKER_ROLES, type ManagedSpeakerInput } from "@/lib/events/program-management";
import type { ManagedSpeaker } from "@/lib/supabase/queries/management";

export function SpeakersManager({ slug, speakers, readOnly }: { slug: string; speakers: ManagedSpeaker[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<ManagedSpeaker | null | undefined>();
  const [deleting, setDeleting] = useState<ManagedSpeaker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function publish(speaker: ManagedSpeaker) {
    setError(null);
    startTransition(async () => {
      const result = await setManagedSpeakerPublishedAction({ slug, speakerId: speaker.id, published: !speaker.published, requestId: crypto.randomUUID() });
      if (result.error) return setError(result.error);
      toast(speaker.published ? "Speaker unpublished" : "Speaker published");
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteManagedSpeakerAction({ slug, speakerId: target.id, requestId: crypto.randomUUID() });
      if (result.error) return setError(result.error);
      setDeleting(null);
      toast("Speaker deleted");
      router.refresh();
    });
  }

  return <>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-tight">Speakers</h2><p className="mt-2 max-w-2xl leading-7 text-muted">Build the event directory, then publish each person when their profile is ready.</p></div>{!readOnly ? <Button size="sm" onPress={() => setEditing(null)}><Plus className="size-4" aria-hidden />New speaker</Button> : null}</div>
    {error ? <Alert status="danger" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    {speakers.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2">{speakers.map((speaker) => <Card key={speaker.id} variant="secondary"><Card.Content className="gap-4"><div className="flex items-start gap-3"><Avatar><Avatar.Fallback>{speaker.name.slice(0, 1).toUpperCase()}</Avatar.Fallback></Avatar><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Typography type="h6">{speaker.name}</Typography><span className={`text-xs font-semibold ${speaker.published ? "text-success" : "text-muted"}`}>{speaker.published ? "Published" : "Draft"}</span></div><p className="text-sm capitalize text-muted">{speaker.role}{speaker.organization ? ` · ${speaker.organization}` : ""}</p><p className="mt-1 text-xs text-muted">{speaker.linkedSessionIds.length} linked {speaker.linkedSessionIds.length === 1 ? "session" : "sessions"}</p></div></div>{!readOnly ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setEditing(speaker)}><Pencil className="size-4" aria-hidden />Edit</Button><Button size="sm" variant="outline" isDisabled={pending} onPress={() => publish(speaker)}>{speaker.published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}{speaker.published ? "Unpublish" : "Publish"}</Button>{!speaker.published && speaker.linkedSessionIds.length === 0 ? <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setDeleting(speaker)}><Trash2 className="size-4" aria-hidden />Delete</Button> : null}</div> : null}</Card.Content></Card>)}</div> : <div className="mt-8 rounded-2xl border border-dashed p-8 text-center platform-rule"><Users className="mx-auto size-8 text-muted" aria-hidden /><h3 className="mt-3 font-semibold">No speakers yet</h3><p className="mt-1 text-sm text-muted">Add speakers, hosts, panelists, or sponsors to the event directory.</p></div>}
    {editing !== undefined ? <SpeakerForm key={editing?.id ?? "new"} slug={slug} speaker={editing} onClose={() => setEditing(undefined)} /> : null}
    <Modal><Modal.Backdrop isOpen={deleting !== null} isDismissable={!pending} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><Modal.Container size="sm"><Modal.Dialog aria-label="Delete speaker"><Modal.Header><Modal.Heading>Delete speaker?</Modal.Heading></Modal.Header><Modal.Body><p className="font-semibold">{deleting?.name}</p><p className="mt-2 text-muted">This permanently removes the unpublished, unlinked profile.</p></Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={pending} onPress={() => setDeleting(null)}>Cancel</Button><Button variant="danger" isPending={pending} onPress={remove}>Delete speaker</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </>;
}

function SpeakerForm({ slug, speaker, onClose }: { slug: string; speaker: ManagedSpeaker | null; onClose: () => void }) {
  const [values, setValues] = useState<ManagedSpeakerInput>({ name: speaker?.name ?? "", role: speaker?.role ?? "speaker", organization: speaker?.organization ?? "", bio: speaker?.bio ?? "", photoUrl: speaker?.photoUrl ?? "", linkedinUrl: speaker?.linkedinUrl ?? "", published: speaker?.published ?? false });
  const [requestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const change = (key: keyof ManagedSpeakerInput, value: string | boolean) => setValues((previous) => ({ ...previous, [key]: value }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveManagedSpeakerAction({ slug, speakerId: speaker?.id ?? null, values, requestId });
      if (result.error) return setError(result.error);
      toast(speaker ? "Speaker updated" : "Speaker created");
      router.refresh();
      onClose();
    });
  }

  return <Modal><Modal.Backdrop isOpen isDismissable={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><Modal.Container size="md"><Modal.Dialog aria-label={speaker ? "Edit speaker" : "New speaker"} className="max-h-[90dvh]"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header><Modal.Heading>{speaker ? "Edit speaker" : "New speaker"}</Modal.Heading></Modal.Header><Modal.Body className="grid gap-4 overflow-y-auto">
    {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    <TextField fullWidth value={values.name} onChange={(value) => change("name", value)} isRequired><Label>Name</Label><Input maxLength={200} /></TextField>
    <div className="grid gap-1.5"><label className="text-sm font-medium" htmlFor="speaker-role">Role</label><select id="speaker-role" className="organizer-input" value={values.role} onChange={(event) => change("role", event.target.value)}>{EVENT_SPEAKER_ROLES.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}</select></div>
    <TextField fullWidth value={values.organization} onChange={(value) => change("organization", value)}><Label>Organization</Label><Input maxLength={240} /></TextField>
    <TextField fullWidth value={values.bio} onChange={(value) => change("bio", value)}><Label>Biography</Label><TextArea rows={4} maxLength={4000} /></TextField>
    <TextField fullWidth value={values.photoUrl} onChange={(value) => change("photoUrl", value)}><Label>Portrait URL</Label><Input type="url" placeholder="https://…" maxLength={2048} /></TextField>
    <TextField fullWidth value={values.linkedinUrl} onChange={(value) => change("linkedinUrl", value)}><Label>LinkedIn URL</Label><Input type="url" placeholder="https://www.linkedin.com/in/…" maxLength={2048} /></TextField>
    {!speaker ? <Switch isSelected={values.published} onChange={(value) => change("published", value)}><Switch.Content className="w-full justify-between gap-4"><span><span className="block text-sm font-medium">Publish immediately</span><span className="block text-xs text-muted">Draft profiles stay hidden from attendees.</span></span><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content></Switch> : null}
  </Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={pending} onPress={onClose}>Cancel</Button><Button isPending={pending} onPress={submit}>{speaker ? "Save changes" : "Create speaker"}</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>;
}
