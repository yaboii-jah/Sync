import Link from "next/link";
import {
  Button,
  Card,
  Chip,
  Form,
  Label,
  SearchField,
  Separator,
  Typography,
} from "@heroui/react";
import { Search, Smartphone, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchAdminAttendees } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";

export default async function AdminAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const supabase = await createClient();
  const attendees = await searchAdminAttendees(supabase, q, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Attendees
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Read-only directory. Search identity and notification reachability. This
        workspace cannot edit attendee accounts.
      </Typography>

      <Form
        action="/admin/attendees"
        method="get"
        className="mt-6 flex max-w-xl items-end gap-2"
      >
        <SearchField fullWidth name="q" defaultValue={q}>
          <Label>Search by attendee name</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Attendee name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button type="submit">
          <Search className="size-4" aria-hidden />
          Search
        </Button>
      </Form>

      <Card className="mt-8">
        {attendees.map((attendee, index) => (
          <div key={attendee.id}>
            {index > 0 ? <Separator /> : null}
            <article className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Typography type="body-sm" weight="semibold">
                  {attendee.name || "Unnamed attendee"}
                </Typography>
                <Typography type="body-xs" color="muted" className="mt-1">
                  Joined {formatRelativeTime(attendee.created_at)}
                </Typography>
                {attendee.linkedin_url ? (
                  <Link
                    href={attendee.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground mt-1 block truncate text-xs underline-offset-4 hover:underline"
                  >
                    {attendee.linkedin_url}
                  </Link>
                ) : (
                  <Typography type="body-xs" color="muted" className="mt-1">
                    No exact LinkedIn URL saved
                  </Typography>
                )}
              </div>

              <Chip size="sm" variant="tertiary">
                <Smartphone className="size-3.5" aria-hidden />
                {attendee.push_device_count} push device
                {attendee.push_device_count === 1 ? "" : "s"}
              </Chip>
            </article>
          </div>
        ))}

        {attendees.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No attendees match this search"
            description="Try a different name, or clear the search to see everyone."
          />
        ) : null}
      </Card>
    </div>
  );
}
