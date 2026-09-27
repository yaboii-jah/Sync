"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ScanLine } from "lucide-react";
import { EmptyState } from "@/components/empty-states";
import { Avatar, Card, Separator, Typography } from "@/components/ui";

export interface ScannedAttendee {
  name: string;
  photoUrl: string | null;
  cardUrl: string | null;
}

interface ScannedAttendeesCardProps {
  scans: ScannedAttendee[];
}

export function ScannedAttendeesCard({ scans }: ScannedAttendeesCardProps) {
  return (
    <Card className="h-full">
      <Card.Content className="gap-4">
        <div>
          <Typography type="h6">Scanned attendees</Typography>
          <Typography type="body-sm" color="muted" className="mt-1">
            Open a saved connection to view their social links.
          </Typography>
        </div>

        {scans.length ? (
          <div className="flex flex-col">
            {scans.map((scan, index) => (
              <div key={scan.cardUrl ?? `${scan.name}-${index}`}>
                {index ? <Separator /> : null}
                {scan.cardUrl ? <Link
                  href={scan.cardUrl}
                  className="flex min-h-16 w-full items-center justify-start gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-default focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
                  aria-label={`Open ${scan.name || "attendee"}'s social card`}
                >
                  <AttendeeAvatar name={scan.name} photoUrl={scan.photoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{scan.name || "Attendee"}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link> : <div className="flex min-h-16 items-center gap-2 px-2 py-2 text-sm text-muted">
                  <AttendeeAvatar name={scan.name} photoUrl={scan.photoUrl} />
                  <span className="min-w-0 flex-1 truncate">{scan.name || "Former attendee"}</span>
                  <span>Card unavailable</span>
                </div>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ScanLine />}
            title="No scans yet"
            description="After you open another attendee’s QR, their card will be saved here."
          />
        )}
      </Card.Content>
    </Card>
  );
}

function AttendeeAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  return (
    <Avatar size="md">
      {photoUrl ? (
        <Avatar.Image asChild src={photoUrl}>
          <Image src={photoUrl} alt="" width={40} height={40} unoptimized />
        </Avatar.Image>
      ) : null}
      <Avatar.Fallback>{(name || "?").charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}
