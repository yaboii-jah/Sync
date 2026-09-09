"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Card,
  SearchField,
  Separator,
  Typography,
} from "@/components/ui";
import {
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  searchAdminAttendees,
  type AdminAttendee,
} from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";
import { AttendeeAvatar, AttendeeDetailModal } from "./attendee-detail-modal";

const PAGE_SIZE = 50;

export function AttendeeDirectory({ initialAttendees, initialQuery = "" }: { initialAttendees: AdminAttendee[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [hasMore, setHasMore] = useState(initialAttendees.length === PAGE_SIZE);
  const [active, setActive] = useState<AdminAttendee | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  function openDetails(attendee: AdminAttendee) {
    setActive(attendee);
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
            <button type="button" onClick={() => void openDetails(attendee)} aria-haspopup="dialog" className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:scale-[0.99] hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
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

      {active ? <AttendeeDetailModal attendee={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
