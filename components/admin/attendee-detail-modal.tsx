"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Chip,
  Modal,
  Separator,
  Skeleton,
  Typography,
} from "@/components/ui";
import { ExternalLink, Smartphone } from "lucide-react";
import { getAttendeeDetailAction } from "@/app/(admin)/admin/actions";
import type { AdminAttendee, AdminAttendeeDetail } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { SOCIAL_SPECS, type SocialNetwork } from "@/lib/social";

export function AttendeeAvatar({
  attendee,
  large = false,
}: {
  attendee: Pick<AdminAttendee, "name" | "photo_url">;
  large?: boolean;
}) {
  const size = large ? "size-16" : "size-12";
  return (
    <Avatar size={large ? "lg" : "md"} className={size}>
      {attendee.photo_url ? (
        <Avatar.Image asChild src={attendee.photo_url}>
          <Image
            src={attendee.photo_url}
            alt=""
            width={large ? 64 : 48}
            height={large ? 64 : 48}
            unoptimized
          />
        </Avatar.Image>
      ) : null}
      <Avatar.Fallback>{(attendee.name || "?").charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

export function AttendeeDetailModal({
  attendee,
  onClose,
}: {
  attendee: Pick<AdminAttendee, "id" | "name" | "photo_url">;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminAttendeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;

    void getAttendeeDetailAction(attendee.id)
      .then((nextDetail) => {
        if (current) setDetail(nextDetail);
      })
      .catch(() => {
        if (current) setError("Could not load attendee details.");
      });

    return () => {
      current = false;
    };
  }, [attendee.id]);

  return (
    <Modal>
      <Modal.Backdrop isOpen isDismissable onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container size="md">
          <Modal.Dialog aria-label={`${attendee.name || "Attendee"} details`}>
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>{attendee.name || "Unnamed attendee"}</Modal.Heading></Modal.Header>
            <Modal.Body className="flex flex-col gap-5">
              <div className="flex items-center gap-4"><AttendeeAvatar attendee={detail?.attendee ?? attendee} large /><div><Typography type="body-sm" weight="semibold">Attendee</Typography>{detail ? <Typography type="body-xs" color="muted">Joined {formatRelativeTime(detail.attendee.created_at)}</Typography> : null}</div></div>
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
