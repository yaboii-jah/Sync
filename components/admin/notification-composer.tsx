"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Label,
  Separator,
  Tabs,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { Search, Send, Users } from "lucide-react";
import type { Key } from "react-aria-components/Tabs";
import {
  searchAttendeesAction,
  sendAdminNotification,
} from "@/app/(admin)/admin/actions";
import type { AdminAttendee } from "@/lib/supabase/queries/admin";
import { primaryLinkClass } from "@/components/ui/link-button";

interface NotificationComposerProps {
  initialAttendees: AdminAttendee[];
  totalAttendees: number;
  totalPushDevices: number;
}

export function NotificationComposer({
  initialAttendees,
  totalAttendees,
  totalPushDevices,
}: NotificationComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState(initialAttendees);
  const [selected, setSelected] = useState<Map<string, AdminAttendee>>(
    new Map(),
  );
  const [confirming, setConfirming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    id: string;
    recipients: number;
    devices: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedDevices = [...selected.values()].reduce(
    (total, attendee) => total + attendee.push_device_count,
    0,
  );

  function toggle(attendee: AdminAttendee) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(attendee.id)) next.delete(attendee.id);
      else next.set(attendee.id, attendee);
      return next;
    });
  }

  function search() {
    startTransition(async () => {
      try {
        setAttendees(await searchAttendeesAction(query));
      } catch {
        setError("Could not search attendees.");
      }
    });
  }

  function review() {
    setError(null);
    if (!title.trim()) {
      setError("Enter a notification title.");
      return;
    }
    if (title.trim().length > 80 || body.trim().length > 240) {
      setError(
        "Keep the title under 80 characters and body under 240 characters.",
      );
      return;
    }
    if (audience === "selected" && selected.size === 0) {
      setError("Select at least one attendee.");
      return;
    }
    setRequestId((current) => current ?? crypto.randomUUID());
    setConfirming(true);
  }

  function send() {
    if (!requestId) return;
    startTransition(async () => {
      try {
        const result = await sendAdminNotification({
          title,
          body,
          audience,
          recipientIds: [...selected.keys()],
          requestId,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSent({
          id: result.notificationId!,
          recipients: result.recipientCount ?? 0,
          devices: result.deviceCount ?? 0,
        });
        setConfirming(false);
      } catch {
        setError(
          "The outcome is unknown. Retry this same request before starting a new alert.",
        );
      }
    });
  }

  if (sent) {
    return (
      <Card className="mt-8">
        <Card.Content className="flex flex-col items-center gap-2 py-10 text-center">
          <span
            aria-hidden
            className="bg-surface-secondary flex size-12 items-center justify-center rounded-full"
          >
            <Send className="size-5" />
          </span>
          <Typography type="h5" className="mt-2">
            Dispatch created
          </Typography>
          <Typography type="body-sm" color="muted">
            {sent.recipients} recipients, {sent.devices} push devices targeted
          </Typography>
          <Link
            href={`/admin/notifications/${sent.id}`}
            className={`${primaryLinkClass} mt-4`}
          >
            View delivery results
          </Link>
        </Card.Content>
      </Card>
    );
  }

  const recipientCount = audience === "all" ? totalAttendees : selected.size;
  const deviceCount = audience === "all" ? totalPushDevices : selectedDevices;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <Card>
        <Card.Header>
          <Card.Title>Message</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-5">
          <TextField fullWidth value={title} onChange={setTitle}>
            <div className="flex items-baseline justify-between">
              <Label>Title</Label>
              <span className="text-muted text-xs">{title.length}/80</span>
            </div>
            <Input
              variant="secondary"
              maxLength={80}
              placeholder="Venue update"
            />
          </TextField>

          <TextField fullWidth value={body} onChange={setBody}>
            <div className="flex items-baseline justify-between">
              <Label>Body</Label>
              <span className="text-muted text-xs">{body.length}/240</span>
            </div>
            <TextArea
              variant="secondary"
              rows={6}
              maxLength={240}
              placeholder="Share the operational update attendees need right now."
            />
          </TextField>

          <Card variant="secondary">
            <Card.Content className="py-4">
              <Typography type="body-xs" color="muted">
                Push preview
              </Typography>
              <Typography type="body-sm" weight="semibold" className="mt-2">
                {title.trim() || "Notification title"}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-1">
                {body.trim() || "Notification body"}
              </Typography>
            </Card.Content>
          </Card>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Audience</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Tabs
            variant="secondary"
            selectedKey={audience}
            onSelectionChange={(key: Key) =>
              setAudience(key as "all" | "selected")
            }
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Choose the audience">
                <Tabs.Tab id="all">
                  Everyone
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="selected">
                  <Tabs.Separator />
                  Selected
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel {...{ id: "all" }} className="mt-4">
              <Card variant="secondary">
                <Card.Content className="py-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-5" aria-hidden />
                    <Typography type="body-sm" weight="semibold">
                      {totalAttendees} attendees
                    </Typography>
                  </div>
                  <Typography type="body-xs" color="muted" className="mt-1">
                    {totalPushDevices} registered push devices. Everyone still
                    receives the in-app alert.
                  </Typography>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel {...{ id: "selected" }} className="mt-4">
              <Form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  search();
                }}
              >
                <TextField fullWidth value={query} onChange={setQuery}>
                  <Label>Search attendee</Label>
                  <Input variant="secondary" placeholder="Attendee name" />
                </TextField>
                <Button
                  type="submit"
                  variant="secondary"
                  isIconOnly
                  isDisabled={pending}
                  aria-label="Search attendees"
                >
                  <Search className="size-4" aria-hidden />
                </Button>
              </Form>

              <Card className="mt-3 max-h-72 overflow-y-auto">
                {attendees.map((attendee, index) => (
                  <div key={attendee.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className="px-4 py-3">
                      <Checkbox
                        isSelected={selected.has(attendee.id)}
                        onChange={() => toggle(attendee)}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          {attendee.name || "Unnamed attendee"}
                        </Checkbox.Content>
                      </Checkbox>
                      <Typography
                        type="body-xs"
                        color="muted"
                        className="mt-1 pl-7"
                      >
                        {attendee.push_device_count} push devices
                      </Typography>
                    </div>
                  </div>
                ))}

                {attendees.length === 0 ? (
                  <div className="px-4 py-5">
                    <Typography type="body-sm" color="muted">
                      No attendees found.
                    </Typography>
                  </div>
                ) : null}
              </Card>

              <Typography type="body-xs" color="muted" className="mt-3">
                {selected.size} selected, {selectedDevices} push devices
              </Typography>
            </Tabs.Panel>
          </Tabs>

          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <Button fullWidth isDisabled={pending} onPress={review}>
            Review and send
          </Button>
        </Card.Content>
      </Card>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={confirming}
          onOpenChange={(isOpen) => {
            if (!isOpen && !pending) setConfirming(false);
          }}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Send immediately?</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body className="flex flex-col gap-4">
                <Card variant="secondary">
                  <Card.Content className="py-4">
                    <Typography type="body-sm" weight="semibold">
                      {title.trim()}
                    </Typography>
                    {body.trim() ? (
                      <Typography type="body-sm" color="muted" className="mt-1">
                        {body.trim()}
                      </Typography>
                    ) : null}
                    <Typography type="body-xs" className="mt-3" weight="medium">
                      {recipientCount} recipients, {deviceCount} push devices
                    </Typography>
                  </Card.Content>
                </Card>

                <Typography type="body-sm" color="muted">
                  This dispatch cannot be recalled or edited after confirmation.
                </Typography>

                {error ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button
                  variant="secondary"
                  isDisabled={pending}
                  onPress={() => setConfirming(false)}
                >
                  Cancel
                </Button>
                <Button isPending={pending} onPress={send}>
                  Confirm send
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
