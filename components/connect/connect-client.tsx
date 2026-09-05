"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, Typography } from "@heroui/react";
import { QrCode, Settings } from "lucide-react";
import { primaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_NETWORKS, type SocialLinks } from "@/lib/social";
import { ConnectCard } from "./connect-card";

interface ConnectClientProps {
  cardUrl: string;
  initialLinks: SocialLinks;
}

export function ConnectClient({
  cardUrl,
  initialLinks,
}: ConnectClientProps) {
  const configuredNetworks = SOCIAL_NETWORKS.filter(
    (network) => initialLinks[network],
  );
  const hasSavedLinks = configuredNetworks.length > 0;
  const [showSetup, setShowSetup] = useState(!hasSavedLinks);

  return (
    <>
      <ConnectCard
        configuredNetworks={configuredNetworks}
        cardUrl={cardUrl}
        hasSavedLinks={hasSavedLinks}
      />

      {!hasSavedLinks ? (
        <Modal>
          <Modal.Backdrop
            isOpen={showSetup}
            isDismissable
            onOpenChange={setShowSetup}
          >
            <Modal.Container size="sm">
              <Modal.Dialog aria-label="Set up your networking card">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Icon>
                    <QrCode className="size-5" aria-hidden />
                  </Modal.Icon>
                  <Modal.Heading>Set up your card</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-3">
                  <Typography type="body-sm">
                    Your stable QR code is ready, but it stays unavailable until
                    you add at least one social profile.
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    Open Account Settings, add the profiles you want to share,
                    and save your changes. Existing QR copies will activate
                    automatically.
                  </Typography>
                </Modal.Body>
                <Modal.Footer>
                  <Link href="/settings" className={`${primaryLinkClass} w-full`}>
                    <Settings className="size-4" aria-hidden />
                    Open Account Settings
                  </Link>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </>
  );
}
