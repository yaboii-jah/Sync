"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Input,
  Label,
  Modal,
  Switch,
  TextField,
} from "@heroui/react";
import {
  createSessionAction,
  updateSessionAction,
} from "@/app/(admin)/admin/actions";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { useToast } from "@/components/toast/toast-provider";
import { formatManilaDateTimeInput } from "@/lib/format";

interface SessionEditorProps {
  /** Absent when creating; the session being edited otherwise. */
  session: SessionWithSpeakers | null;
  /** Required to create; the event the new session belongs to. */
  eventId: string;
  onClose: () => void;
}

/**
 * `datetime-local` inputs speak wall-clock time with no zone. The event is
 * always in Manila, so format the instant explicitly instead of using the
 * browser's local timezone.
 */
function toLocalInputValue(iso: string): string {
  return formatManilaDateTimeInput(iso);
}

export function SessionEditor({
  session,
  eventId,
  onClose,
}: SessionEditorProps) {
  const editing = session !== null;
  const [title, setTitle] = useState(session?.title ?? "");
  const [room, setRoom] = useState(session?.room ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [startTime, setStartTime] = useState(
    session ? toLocalInputValue(session.start_time) : "",
  );
  const [endTime, setEndTime] = useState(
    session ? toLocalInputValue(session.end_time) : "",
  );
  const [publishNow, setPublishNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function submit() {
    setError(null);

    /*
     * The request id is minted once per submission and replayed on retry: the
     * RPCs key their idempotency off it, so a double-click cannot create the
     * same session twice.
     */
    const requestId = crypto.randomUUID();
    const form = { title, description, room, startTime, endTime, requestId };

    startTransition(async () => {
      const result = editing
        ? await updateSessionAction({ ...form, sessionId: session.id })
        : await createSessionAction({ ...form, eventId, published: publishNow });

      if (result.error) {
        setError(result.error);
        return;
      }

      toast(editing ? "Session updated" : "Session created");
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog
            aria-label={editing ? "Edit session" : "New session"}
            className="max-h-[85dvh] w-full"
          >
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>
                {editing ? "Edit session" : "New session"}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <TextField fullWidth value={title} onChange={setTitle} isRequired>
                <Label>Title</Label>
                <Input variant="secondary" placeholder="Keynote: …" />
              </TextField>

              <TextField fullWidth value={room} onChange={setRoom}>
                <Label>Room</Label>
                <Input variant="secondary" placeholder="Main Hall" />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  fullWidth
                  value={startTime}
                  onChange={setStartTime}
                  isRequired
                >
                  <Label>Starts (PHT)</Label>
                  <Input variant="secondary" type="datetime-local" />
                </TextField>

                <TextField
                  fullWidth
                  value={endTime}
                  onChange={setEndTime}
                  isRequired
                >
                  <Label>Ends (PHT)</Label>
                  <Input variant="secondary" type="datetime-local" />
                </TextField>
              </div>

              <TextField
                fullWidth
                value={description}
                onChange={setDescription}
              >
                <Label>Description</Label>
                <Input variant="secondary" placeholder="What this covers" />
              </TextField>

              {editing ? null : (
                <Switch
                  className="w-full"
                  isSelected={publishNow}
                  onChange={setPublishNow}
                  aria-label="Publish immediately"
                >
                  <Switch.Content className="w-full justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        Publish immediately
                      </span>
                      <span className="block text-xs font-normal text-muted">
                        Off keeps it a draft — hidden from attendees, and the
                        scheduled job will not announce it.
                      </span>
                    </span>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              )}
            </Modal.Body>

            <Modal.Footer className="flex shrink-0 gap-3">
              <Button variant="outline" onPress={onClose} isDisabled={pending}>
                Cancel
              </Button>
              <Button onPress={submit} isPending={pending}>
                {editing ? "Save changes" : "Create session"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
