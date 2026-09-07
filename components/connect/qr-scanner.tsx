"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, ImagePlus, QrCode } from "lucide-react";
import { Alert, Button, Modal, Typography } from "@/components/ui";

const MAX_SCAN_WIDTH = 1280;
const SCAN_INTERVAL = 120;
const CARD_PATH =
  /^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

type ScannerStatus = "idle" | "starting" | "scanning" | "decoding";

function getNetworkingCardPath(value: string): string | null {
  try {
    const url = new URL(value.trim(), window.location.origin);
    const match = url.pathname.match(CARD_PATH);
    return match ? `/c/${match[1]}` : null;
  } catch {
    return null;
  }
}

function decodeImageData(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): string | null {
  const imageData = context.getImageData(0, 0, width, height);
  return jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function decodeImageFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const scale = Math.min(1, MAX_SCAN_WIDTH / image.naturalWidth);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("The image could not be read.");

        context.drawImage(image, 0, 0, width, height);
        resolve(decodeImageData(context, width, height));
      } catch (cause) {
        reject(cause instanceof Error ? cause : new Error("The image could not be read."));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be opened."));
    };
    image.src = objectUrl;
  });
}

function getCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera access was blocked. Choose a QR screenshot instead, or allow camera access in your browser settings.";
    }
    if (error.name === "NotFoundError") {
      return "No camera was found on this device. Choose a QR screenshot instead.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is busy in another app. Close that app, then try again.";
    }
  }

  return "The camera could not start. Choose a QR screenshot instead.";
}

export function QrScanner() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanRequestRef = useRef(0);
  const lastInvalidValueRef = useRef<string | null>(null);

  const stopScanner = useCallback(() => {
    scanRequestRef.current += 1;
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      stopScanner();
      setStatus("idle");
      setError(null);
    } else {
      setError(null);
      setStatus("starting");
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const requestId = scanRequestRef.current + 1;
    scanRequestRef.current = requestId;
    lastInvalidValueRef.current = null;

    function isCurrentRequest() {
      return scanRequestRef.current === requestId;
    }

    function scheduleScan() {
      if (!isCurrentRequest()) return;
      scanTimerRef.current = window.setTimeout(scanFrame, SCAN_INTERVAL);
    }

    function scanFrame() {
      if (!isCurrentRequest()) return;

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
        scheduleScan();
        return;
      }

      const width = Math.min(video.videoWidth, MAX_SCAN_WIDTH);
      const height = Math.max(1, Math.round(video.videoHeight * (width / video.videoWidth)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const decodedValue = decodeImageData(context, width, height);
        if (decodedValue) {
          const cardPath = getNetworkingCardPath(decodedValue);
          if (cardPath) {
            stopScanner();
            setStatus("idle");
            setIsOpen(false);
            router.push(cardPath);
            return;
          }

          if (lastInvalidValueRef.current !== decodedValue) {
            lastInvalidValueRef.current = decodedValue;
            setError("That QR code is not a Sync networking card. Keep scanning or try another code.");
          }
        }
      }

      scheduleScan();
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("idle");
        setError("This browser cannot open a camera. Choose a QR screenshot instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!isCurrentRequest()) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (!isCurrentRequest()) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStatus("scanning");
        scanFrame();
      } catch (cause) {
        if (!isCurrentRequest()) return;
        stopScanner();
        setStatus("idle");
        setError(getCameraError(cause));
      }
    }

    function stopForLifecycle() {
      stopScanner();
      setIsOpen(false);
      setStatus("idle");
    }

    function handleVisibilityChange() {
      if (document.hidden) stopForLifecycle();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", stopForLifecycle);
    void startCamera();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", stopForLifecycle);
      stopScanner();
    };
  }, [isOpen, router, stopScanner]);

  async function handleScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopScanner();
    const requestId = scanRequestRef.current;
    setStatus("decoding");
    setError(null);

    try {
      const decodedValue = await decodeImageFile(file);
      if (scanRequestRef.current !== requestId || !isOpen) return;

      const cardPath = decodedValue ? getNetworkingCardPath(decodedValue) : null;
      if (cardPath) {
        setStatus("idle");
        setIsOpen(false);
        router.push(cardPath);
        return;
      }

      setStatus("idle");
      setError(
        decodedValue
          ? "That QR code is not a Sync networking card. Choose another image."
          : "No readable QR code was found in that image.",
      );
    } catch (cause) {
      if (scanRequestRef.current !== requestId || !isOpen) return;
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "The selected image could not be read.");
    }
  }

  return (
    <>
      <Button fullWidth onPress={() => handleOpenChange(true)}>
        <Camera className="size-4" aria-hidden />
        Scan attendee QR
      </Button>

      <Modal>
        <Modal.Backdrop isOpen={isOpen} isDismissable onOpenChange={handleOpenChange}>
          <Modal.Container size="sm">
            <Modal.Dialog aria-label="Scan attendee QR">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Camera className="size-5" aria-hidden />
                </Modal.Icon>
                <Modal.Heading>Scan attendee QR</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    aria-label="Live QR scanner camera"
                    className="size-full object-cover"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-accent"
                  />
                  {status === "starting" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-6 text-center">
                      <Typography type="body-sm" className="text-white">
                        Opening the rear camera...
                      </Typography>
                    </div>
                  ) : null}
                  {status === "decoding" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-6 text-center">
                      <Typography type="body-sm" className="text-white">
                        Reading your QR screenshot...
                      </Typography>
                    </div>
                  ) : null}
                </div>

                <Typography type="body-sm" color="muted">
                  Point the camera at another attendee&apos;s Sync QR code. Only Sync networking cards are opened; other QR links are ignored.
                </Typography>

                {error ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <Button
                  variant="secondary"
                  fullWidth
                  isDisabled={status === "decoding"}
                  onPress={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" aria-hidden />
                  Choose QR screenshot
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleScreenshotChange}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
