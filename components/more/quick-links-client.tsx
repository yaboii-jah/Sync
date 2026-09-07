"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, Globe, MessageSquare, type LucideIcon } from "lucide-react";
import { Button, Card, Modal, Typography } from "@/components/ui";
import type { QuickLink } from "@/lib/supabase/queries/quick-links";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  camera: Camera,
  "message-square": MessageSquare,
};

function isInternalQuickLink(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

function isPhotoBoothLink(link: QuickLink) {
  return link.label === "Photo Booth" || link.url === "/more/photo-booth";
}

export function QuickLinksClient({
  quickLinks,
  photoBoothEnabled,
}: {
  quickLinks: QuickLink[];
  photoBoothEnabled: boolean;
}) {
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {quickLinks.map((link) => {
          const Icon = (link.icon && ICONS[link.icon]) || Globe;
          const content = (
            <Card className="hover:bg-default h-full transition-colors">
              <Card.Content className="flex items-center gap-3 py-4">
                <span
                  aria-hidden
                  className="bg-surface-secondary flex size-10 shrink-0 items-center justify-center rounded-full"
                >
                  <Icon className="size-5" />
                </span>
                <Typography type="body-sm" weight="medium">
                  {link.label}
                </Typography>
              </Card.Content>
            </Card>
          );

          if (isPhotoBoothLink(link) && !photoBoothEnabled) {
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setAvailabilityOpen(true)}
                aria-haspopup="dialog"
                className="block w-full rounded-xl text-left"
              >
                {content}
              </button>
            );
          }

          if (isInternalQuickLink(link.url)) {
            return (
              <Link key={link.id} href={link.url} className="block rounded-xl">
                {content}
              </Link>
            );
          }

          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl"
            >
              {content}
            </a>
          );
        })}
      </div>

      {!photoBoothEnabled && availabilityOpen ? (
        <Modal>
          <Modal.Backdrop
            isOpen
            isDismissable
            onOpenChange={(open) => {
              if (!open) setAvailabilityOpen(false);
            }}
          >
            <Modal.Container size="sm">
              <Modal.Dialog aria-label="Photo Booth availability">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Icon>
                    <Camera className="size-5" aria-hidden />
                  </Modal.Icon>
                  <Modal.Heading>Photo Booth coming soon</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Typography type="body-sm" color="muted">
                    The Photo Booth will be available on the day of the event.
                  </Typography>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => setAvailabilityOpen(false)}
                  >
                    Close
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </>
  );
}
