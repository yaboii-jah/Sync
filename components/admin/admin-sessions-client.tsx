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
import { Radio, RotateCcw, Square } from "lucide-react";
import { changeSessionStatus } from "@/app/(admin)/admin/actions";
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
}: {
  sessions: SessionWithSpeakers[];
}) {
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{
    session: SessionWithSpeakers;
    action: SessionAction;
    requestId: string;
  } | null>(null);
  const [sendNotification, setSendNotification] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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
      <div className="mt-8 flex flex-col gap-3">
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
                </div>

                <Typography type="h6" className="mt-2">
                  {session.title}
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-1">
                  {session.room ?? "TBA"}
                </Typography>
              </div>

              <div className="flex flex-wrap gap-2">
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
          isOpen={selection !== null}
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
    </>
  );
}
