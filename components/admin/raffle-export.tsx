"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Button,
  Chip,
  Modal,
  Skeleton,
  TextArea,
  Typography,
} from "@/components/ui";
import { Copy, Download, Ticket, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-states";
import { formatRaffleEntries, raffleText } from "@/lib/raffle";
import { createClient } from "@/lib/supabase/client";
import {
  getAdminRaffleAttendees,
  type AdminAttendee,
  type AdminRaffleSnapshot,
} from "@/lib/supabase/queries/admin";
import { useToast } from "@/components/toast/toast-provider";
import { AttendeeDetailModal } from "./attendee-detail-modal";

function attendeeForDetail(id: string, snapshot: AdminRaffleSnapshot): Pick<AdminAttendee, "id" | "name" | "photo_url"> | null {
  const attendee = snapshot.attendees.find((entry) => entry.id === id);
  if (!attendee) return null;
  return {
    id: attendee.id,
    name: attendee.name,
    photo_url: null,
  };
}

export function RaffleExport() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<AdminRaffleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAttendee, setActiveAttendee] = useState<Pick<AdminAttendee, "id" | "name" | "photo_url"> | null>(null);
  const [loading, startLoading] = useTransition();
  const { toast } = useToast();
  const entries = snapshot ? formatRaffleEntries(snapshot.attendees) : [];
  const text = raffleText(entries);
  const duplicateEntries = entries.filter((entry) => entry.isDuplicate);

  function loadSnapshot() {
    startLoading(async () => {
      try {
        setSnapshot(await getAdminRaffleAttendees(createClient()));
        setError(null);
      } catch {
        setSnapshot(null);
        setError("Could not prepare the raffle list. Try again.");
      }
    });
  }

  function openExport() {
    setOpen(true);
    setSnapshot(null);
    setError(null);
    loadSnapshot();
  }

  function closeExport() {
    if (loading) return;
    setOpen(false);
    setSnapshot(null);
    setError(null);
  }

  async function copyList() {
    if (!text || !navigator.clipboard?.writeText) {
      toast("Clipboard access is unavailable. Download the text file instead.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast("Raffle names copied. Paste them into Wheel of Names.");
    } catch {
      toast("Could not copy the raffle names. Download the text file instead.", "error");
    }
  }

  function downloadList() {
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sync-raffle-attendees.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function openDuplicateDetail(id: string) {
    if (!snapshot) return;
    setActiveAttendee(attendeeForDetail(id, snapshot));
  }

  return (
    <>
      <Button variant="secondary" className="w-full sm:w-auto" onPress={openExport}>
        <Ticket className="size-4" aria-hidden />
        Export raffle names
      </Button>

      <Modal>
        <Modal.Backdrop
          isOpen={open && !activeAttendee}
          isDismissable={!loading}
          isKeyboardDismissDisabled={loading}
          onOpenChange={(nextOpen) => { if (!nextOpen) closeExport(); }}
        >
          <Modal.Container size="md" className="sm:max-w-lg">
            <Modal.Dialog aria-label="Export raffle names" className="max-h-[85dvh] w-full">
              <Modal.CloseTrigger isDisabled={loading} />
              <Modal.Header>
                <Modal.Heading>Export raffle names</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
                <Typography type="body-sm" color="muted">
                  This fresh list includes every non-admin attendee profile with a usable name, not the current directory search.
                </Typography>

                {loading ? <div className="flex flex-col gap-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-44 w-full" /></div> : null}
                {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error}</Alert.Title></Alert.Content></Alert> : null}

                {snapshot && entries.length ? <>
                  <div className="flex flex-wrap gap-2">
                    <Chip size="sm" variant="tertiary">{entries.length} raffle entries</Chip>
                    {snapshot.excluded_blank_count ? <Chip size="sm" variant="tertiary">{snapshot.excluded_blank_count} unnamed skipped</Chip> : null}
                    {duplicateEntries.length ? <Chip size="sm" variant="tertiary">{duplicateEntries.length} duplicate-name entries</Chip> : null}
                  </div>
                  <TextArea
                    aria-label="Copy-ready raffle names"
                    value={text}
                    readOnly
                    rows={Math.min(Math.max(entries.length, 6), 14)}
                    className="font-mono text-xs leading-5"
                  />
                  {duplicateEntries.length ? <section className="flex flex-col gap-2"><Typography type="body-sm" weight="semibold">Confirm duplicate names</Typography><Typography type="body-xs" color="muted">These labels are private to this workspace. Open one to confirm the attendee before awarding a duplicate-name winner.</Typography><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{duplicateEntries.map((entry) => <Button key={entry.id} size="sm" variant="secondary" fullWidth onPress={() => openDuplicateDetail(entry.id)}>{entry.label}</Button>)}</div></section> : null}
                </> : null}

                {snapshot && !entries.length ? <EmptyState icon={<Users />} title="No raffle names are available" description={snapshot.excluded_blank_count ? `${snapshot.excluded_blank_count} profiles were skipped because they do not have usable names.` : "There are no non-admin attendee profiles to export."} /> : null}
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 sm:flex-row sm:justify-between">
                <Button variant="secondary" className="order-3 w-full sm:order-none sm:w-auto" onPress={closeExport} isDisabled={loading}>Close</Button>
                <div className="order-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  {error ? <Button className="w-full whitespace-nowrap sm:w-auto" onPress={loadSnapshot}>Try again</Button> : null}
                  {snapshot && entries.length ? <><Button className="w-full whitespace-nowrap sm:w-auto" onPress={() => void copyList()}><Copy className="size-4" aria-hidden />Copy list</Button><Button variant="secondary" className="w-full whitespace-nowrap sm:w-auto" onPress={downloadList}><Download className="size-4" aria-hidden />Download list</Button></> : null}
                </div>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {activeAttendee ? <AttendeeDetailModal attendee={activeAttendee} onClose={() => setActiveAttendee(null)} /> : null}
    </>
  );
}
