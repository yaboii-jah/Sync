"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronRight, QrCode, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { EmptyState } from "@/components/empty-states";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { Avatar, Button, Card, Modal, Separator, Typography } from "@/components/ui";
const QR_FOREGROUND = "#024056";
const QR_BACKGROUND = "#FFFFFF";

export interface ScannedAttendee {
  name: string;
  photoUrl: string | null;
  cardUrl: string;
}

interface ScannedAttendeesCardProps {
  scans: ScannedAttendee[];
}

export function ScannedAttendeesCard({ scans }: ScannedAttendeesCardProps) {
  const [selectedScan, setSelectedScan] = useState<ScannedAttendee | null>(null);

  function returnToMyQr() {
    setSelectedScan(null);
    document.getElementById("my-qr")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Card className="h-full">
        <Card.Content className="gap-4">
          <div>
            <Typography type="h6">Scanned attendees</Typography>
            <Typography type="body-sm" color="muted" className="mt-1">
              Open a saved connection to view their QR again.
            </Typography>
          </div>

          {scans.length ? (
            <div className="flex flex-col">
              {scans.map((scan, index) => (
                <div key={scan.cardUrl}>
                  {index ? <Separator /> : null}
                  <Button
                    variant="ghost"
                    fullWidth
                    className="min-h-16 justify-start rounded-xl px-2 py-2 text-left"
                    onPress={() => setSelectedScan(scan)}
                    aria-label={`View ${scan.name || "attendee"}'s scanned QR`}
                    >
                      <AttendeeAvatar name={scan.name} photoUrl={scan.photoUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{scan.name || "Attendee"}</span>
                      </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Button>
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

      <Modal>
        <Modal.Backdrop
          isOpen={selectedScan !== null}
          isDismissable
          onOpenChange={(open) => {
            if (!open) setSelectedScan(null);
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog aria-label={selectedScan ? `${selectedScan.name || "Attendee"}'s scanned QR` : "Scanned QR"}>
              <Modal.CloseTrigger />
              {selectedScan ? (
                <>
                  <Modal.Header>
                    <Modal.Icon>
                      <QrCode className="size-5" aria-hidden />
                    </Modal.Icon>
                    <Modal.Heading>{selectedScan.name || "Attendee"}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col items-center gap-4">
                    <AttendeeAvatar name={selectedScan.name} photoUrl={selectedScan.photoUrl} large />
                    <div
                      className="border-border w-full max-w-[272px] rounded-2xl border p-4"
                      style={{ backgroundColor: QR_BACKGROUND }}
                    >
                      <QRCodeSVG
                        value={selectedScan.cardUrl}
                        size={240}
                        className="block size-full"
                        fgColor={QR_FOREGROUND}
                        bgColor={QR_BACKGROUND}
                      />
                    </div>
                    <Typography type="body-xs" color="muted" className="text-center">
                      Open this attendee&apos;s card whenever you need it.
                    </Typography>
                  </Modal.Body>
                  <Modal.Footer className="flex-col gap-3">
                    <a href={selectedScan.cardUrl} className={`${secondaryLinkClass} w-full`}>
                      Open saved card
                    </a>
                    <Button variant="ghost" fullWidth onPress={returnToMyQr}>
                      Back to my QR
                    </Button>
                  </Modal.Footer>
                </>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function AttendeeAvatar({
  name,
  photoUrl,
  large = false,
}: {
  name: string;
  photoUrl: string | null;
  large?: boolean;
}) {
  return (
    <Avatar size={large ? "lg" : "md"} className={large ? "size-16" : undefined}>
      {photoUrl ? (
        <Avatar.Image asChild src={photoUrl}>
          <Image src={photoUrl} alt="" width={large ? 64 : 40} height={large ? 64 : 40} unoptimized />
        </Avatar.Image>
      ) : null}
      <Avatar.Fallback>{(name || "?").charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}
