"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  Button,
  Card,
  Checkbox,
  Chip,
  Description,
  Typography,
} from "@heroui/react";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import {
  changeSessionStatus,
  deleteSessionAction,
  setSessionPublishedAction,
} from "@/app/(admin)/admin/actions";
import { SessionEditor } from "@/components/admin/session-editor";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { formatTimeRange } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast/toast-provider";

type SessionAction = "start" | "end" | "resume_auto";

const ACTION_LABELS: Record<SessionAction, string> = {
  start: "Start session?",
  end: "End session?",
  resume_auto: "Resume automatic status?",
};

export function AdminSessionsClient({
  sessions,
  eventId,
}: {
  sessions: SessionWithSpeakers[];
  eventId: string | null;
}) {
  const [editing, setEditing] = useState<{
    session: SessionWithSpeakers | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{
    session: SessionWithSpeakers;
    action: SessionAction;
    requestId: string;
  } | null>(null);
  const [deletion, setDeletion] = useState<{
    session: SessionWithSpeakers;
    requestId: string;
  } | null>(null);
  const [sendNotification, setSendNotification] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  /** Both take the same shape: mutate, report, refresh. */
  function runMutation(
    run: () => Promise<{ error?: string }>,
    success: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await run();
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      toast(success);
      onSuccess?.();
      router.refresh();
    });
  }

  function togglePublished(session: SessionWithSpeakers) {
    runMutation(
      () =>
        setSessionPublishedAction({
          sessionId: session.id,
          published: !session.published,
          requestId: crypto.randomUUID(),
        }),
      session.published ? "Session unpublished" : "Session published",
    );
  }

  function remove(session: SessionWithSpeakers) {
    setDeletion({ session, requestId: crypto.randomUUID() });
  }

  function confirmDeletion() {
    if (!deletion) return;

    runMutation(
      () =>
        deleteSessionAction({
          sessionId: deletion.session.id,
          requestId: deletion.requestId,
        }),
      "Session deleted",
      () => setDeletion(null),
    );
  }

  function open(session: SessionWithSpeakers, action: SessionAction) {
    setSelection({ session, action, requestId: crypto.randomUUID() });
    setSendNotification(action !== "resume_auto");
  }

  function confirm() {
    if (!selection) return;
    startTransition(async () => {
      try {
        const result = await changeSessionStatus({
          sessionId: selection.session.id,
          action: selection.action,
          sendNotification:
            selection.action === "resume_auto" ? false : sendNotification,
          requestId: selection.requestId,
        });
        if (result.error) {
          toast(result.error, "error");
          return;
        }
        toast("Live session state updated");
        setSelection(null);
        router.refresh();
      } catch {
        toast("Outcome unknown. Retry this same confirmation.", "error");
      }
    });
  }

  return (
    <>
      {eventId ? (
        <div className="mt-6 flex justify-end">
          <Button size="sm" onPress={() => setEditing({ session: null })}>
            <Plus className="size-4" aria-hidden />
            New session
          </Button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {sessions.map((session) => (
          <Card
            key={session.id}
            variant={session.status_override ? "secondary" : "default"}
          >
            <Card.Content className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={
                      session.status as "not_started" | "ongoing" | "finished"
                    }
                  />
                  <Typography type="body-xs" color="muted">
                    {formatTimeRange(session.start_time, session.end_time)}
                  </Typography>
                  {session.status_override ? (
                    <Chip size="sm" variant="tertiary">
                      Manual
                    </Chip>
                  ) : null}
                  {session.published ? null : (
                    <Chip size="sm" variant="soft">
                      Draft
                    </Chip>
                  )}
                </div>

                <Typography type="h6" className="mt-2">
                  {session.title}
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-1">
                  {session.room ?? "TBA"}
                </Typography>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setEditing({ session })}
                >
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={pending}
                  onPress={() => togglePublished(session)}
                >
                  {session.published ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                  {session.published ? "Unpublish" : "Publish"}
                </Button>
                {/* Only unpublished drafts that have not started are deletable;
                    the database RPC enforces the same rule. */}
                {!session.published && session.status === "not_started" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={pending}
                    onPress={() => remove(session)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                ) : null}
                {session.status === "not_started" ? (
                  <Button size="sm" onPress={() => open(session, "start")}>
                    <Radio className="size-4" aria-hidden />
                    Start
                  </Button>
                ) : null}
                {session.status !== "finished" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => open(session, "end")}
                  >
                    <Square className="size-4" aria-hidden />
                    End
                  </Button>
                ) : null}
                {session.status_override ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => open(session, "resume_auto")}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Resume auto
                  </Button>
                ) : null}
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deletion !== null}
          isDismissable={!pending}
          onOpenChange={(isOpen) => {
            if (!isOpen && !pending) setDeletion(null);
          }}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Delete draft?</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>
                <Typography type="body-sm" weight="semibold">
                  {deletion?.session.title}
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-2">
                  This permanently removes the unpublished session. Published
                  or already-started sessions must be kept and unpublished
                  instead.
                </Typography>
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button
                  variant="secondary"
                  isDisabled={pending}
                  onPress={() => setDeletion(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isPending={pending}
                  onPress={confirmDeletion}
                >
                  Delete draft
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={selection !== null}
          isDismissable={!pending}
          onOpenChange={(isOpen) => {
            if (!isOpen && !pending) setSelection(null);
          }}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>
                  {selection ? ACTION_LABELS[selection.action] : ""}
                </AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body className="flex flex-col gap-4">
                <Typography type="body-sm" weight="semibold">
                  {selection?.session.title}
                </Typography>

                <Typography type="body-sm" color="muted">
                  {selection?.action === "resume_auto"
                    ? "The effective status will immediately return to the published schedule."
                    : "This status stays active until another manual action or Resume Auto."}
                </Typography>

                {selection && selection.action !== "resume_auto" ? (
                  <Checkbox
                    isSelected={sendNotification}
                    isDisabled={pending}
                    onChange={setSendNotification}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      Notify every attendee
                    </Checkbox.Content>
                    <Description>
                      Creates an event-wide in-app alert and sends push where
                      available.
                    </Description>
                  </Checkbox>
                ) : null}
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button
                  variant="secondary"
                  isDisabled={pending}
                  onPress={() => setSelection(null)}
                >
                  Cancel
                </Button>
                <Button isPending={pending} onPress={confirm}>
                  Confirm
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
      {editing && eventId ? (
        <SessionEditor
          session={editing.session}
          eventId={eventId}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
