"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Modal,
  SearchField,
  Separator,
  Skeleton,
  Typography,
} from "@heroui/react";
import {
  ChevronRight,
  ExternalLink,
  Search,
  Smartphone,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getAdminAttendee,
  searchAdminAttendees,
  type AdminAttendee,
  type AdminAttendeeDetail,
} from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";
import { SOCIAL_SPECS, type SocialNetwork } from "@/lib/social";

const PAGE_SIZE = 50;

function AttendeeAvatar({ attendee, large = false }: { attendee: Pick<AdminAttendee, "name" | "photo_url">; large?: boolean }) {
  const size = large ? "size-16" : "size-12";
  return (
    <Avatar size={large ? "lg" : "md"} className={size}>
      {attendee.photo_url ? (
        <Avatar.Image asChild src={attendee.photo_url}>
          <Image src={attendee.photo_url} alt="" width={large ? 64 : 48} height={large ? 64 : 48} unoptimized />
        </Avatar.Image>
      ) : null}
      <Avatar.Fallback>{(attendee.name || "?").charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

export function AttendeeDirectory({ initialAttendees, initialQuery = "" }: { initialAttendees: AdminAttendee[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [hasMore, setHasMore] = useState(initialAttendees.length === PAGE_SIZE);
  const [active, setActive] = useState<AdminAttendee | null>(null);
  const [detail, setDetail] = useState<AdminAttendeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingMore, startLoadingMore] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setAttendees(initialAttendees);
        setHasMore(initialAttendees.length === PAGE_SIZE);
        setError(null);
        return;
      }
      try {
        const rows = await searchAdminAttendees(createClient(), query.trim(), PAGE_SIZE, 0);
        setAttendees(rows);
        setHasMore(rows.length === PAGE_SIZE);
        setError(null);
      } catch {
        setError("Could not search attendees. Try again.");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [initialAttendees, query]);

  async function openDetails(attendee: AdminAttendee) {
    setActive(attendee);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await getAdminAttendee(createClient(), attendee.id));
    } catch {
      setDetailError("Could not load attendee details.");
    }
  }

  function loadMore() {
    startLoadingMore(async () => {
      try {
        const rows = await searchAdminAttendees(createClient(), query.trim(), PAGE_SIZE, attendees.length);
        setAttendees((current) => [...current, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
      } catch {
        setError("Could not load more attendees. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchField value={query} onChange={setQuery} aria-label="Search by attendee name" className="w-full max-w-xl">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search attendee names" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error}</Alert.Title></Alert.Content></Alert> : null}

      <Card>
        {attendees.map((attendee, index) => (
          <div key={attendee.id}>
            {index > 0 ? <Separator /> : null}
            <button type="button" onClick={() => void openDetails(attendee)} aria-haspopup="dialog" className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:scale-[0.99] hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <AttendeeAvatar attendee={attendee} />
              <span className="min-w-0 flex-1">
                <Typography type="body-sm" weight="semibold" truncate>{attendee.name || "Unnamed attendee"}</Typography>
                <Typography type="body-xs" color="muted" className="mt-1">Joined {formatRelativeTime(attendee.created_at)}</Typography>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </button>
          </div>
        ))}
        {attendees.length === 0 ? <EmptyState icon={<Users />} title="No attendees match this search" description="Try a different name, or clear the search to see everyone." /> : null}
      </Card>

      {hasMore ? <Button variant="secondary" className="self-center" onPress={loadMore} isPending={loadingMore}><Search className="size-4" aria-hidden />Load more attendees</Button> : null}

      {active ? <AttendeeDetailModal attendee={active} detail={detail} error={detailError} onClose={() => setActive(null)} /> : null}
    </div>
  );
}

function AttendeeDetailModal({ attendee, detail, error, onClose }: { attendee: AdminAttendee; detail: AdminAttendeeDetail | null; error: string | null; onClose: () => void }) {
  return (
    <Modal>
      <Modal.Backdrop isOpen isDismissable onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container size="md">
          <Modal.Dialog aria-label={`${attendee.name || "Attendee"} details`}>
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>{attendee.name || "Unnamed attendee"}</Modal.Heading></Modal.Header>
            <Modal.Body className="flex flex-col gap-5">
              <div className="flex items-center gap-4"><AttendeeAvatar attendee={detail?.attendee ?? attendee} large /><div><Typography type="body-sm" weight="semibold">Attendee</Typography><Typography type="body-xs" color="muted">Joined {formatRelativeTime(attendee.created_at)}</Typography></div></div>
              {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error}</Alert.Title></Alert.Content></Alert> : detail ? <>
                <section className="flex flex-col gap-3"><Typography type="body-sm" weight="semibold">Push devices <Chip size="sm" variant="tertiary">{detail.push_devices.length}</Chip></Typography>{detail.push_devices.length ? detail.push_devices.map((device, index) => <div key={`${device.created_at}-${index}`} className="flex items-center gap-3"><Smartphone className="size-4 text-muted" aria-hidden /><Typography type="body-sm">Device {index + 1}</Typography><Typography type="body-xs" color="muted" className="ml-auto">Enabled {formatRelativeTime(device.created_at)}</Typography></div>) : <Typography type="body-sm" color="muted">No push devices enabled.</Typography>}</section>
                <Separator />
                <section className="flex flex-col gap-3"><Typography type="body-sm" weight="semibold">Activated socials</Typography>{detail.social_profiles.length ? detail.social_profiles.map((social) => <a key={social.network} href={social.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-medium p-2 hover:bg-surface-secondary"><ExternalLink className="size-4" aria-hidden /><Typography type="body-sm" className="flex-1">{SOCIAL_SPECS[social.network as SocialNetwork]?.label ?? social.network}</Typography><ExternalLink className="size-4 text-muted" aria-hidden /></a>) : <Typography type="body-sm" color="muted">No social profiles activated.</Typography>}</section>
              </> : <div className="flex flex-col gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" fullWidth onPress={onClose}>Close</Button></Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
