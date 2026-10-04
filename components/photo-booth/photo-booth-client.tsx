"use client";
/* eslint-disable @next/next/no-img-element -- Browser object URLs and live booth imagery cannot use Next's image optimizer. */

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { Alert, Button, Card, Chip, Typography } from "@/components/ui";
import { PHOTO_BOOTH_FRAME } from "@/lib/photo-booth/frame";
import {
  Camera,
  Download,
  ImagePlus,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";

const OUTPUT_WIDTH = PHOTO_BOOTH_FRAME.width;
const OUTPUT_HEIGHT = PHOTO_BOOTH_FRAME.height;

type CameraFacing = "user" | "environment";
type BoothStage = "intro" | "starting" | "capture" | "countdown" | "composing" | "review";
type SlotPhotos = [string | null, string | null, string | null];
type CompletedPhotos = [string, string, string];
type CameraDevice = { deviceId: string; label: string };

const EMPTY_SLOTS: SlotPhotos = [null, null, null];

function copySlots(slots: SlotPhotos): SlotPhotos {
  return [slots[0], slots[1], slots[2]];
}

function hasCompletedPhotos(slots: SlotPhotos): slots is CompletedPhotos {
  return slots.every((slot): slot is string => slot !== null);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare that image."));
    image.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not create the photo file."));
      },
      "image/jpeg",
      quality,
    );
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height,
  );
}

function getCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera access is blocked. Allow it in your browser settings, or choose a photo instead.";
    }
    if (error.name === "NotFoundError") {
      return "No camera was found on this device. Choose a photo instead.";
    }
    if (error.name === "NotReadableError") {
      return "Your camera is busy in another app. Close that app, then try again.";
    }
  }

  return "The camera could not start. Try again or choose a photo instead.";
}

interface PhotoStripProps {
  slots: SlotPhotos;
  activeSlot?: number;
  cameraFacing?: CameraFacing;
  countdown?: number | null;
  isComposing?: boolean;
  showCamera?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
}

function PhotoStrip({
  slots,
  activeSlot,
  cameraFacing,
  countdown,
  isComposing,
  showCamera,
  videoRef,
}: PhotoStripProps) {
  const frame = PHOTO_BOOTH_FRAME;

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-surface-secondary">
      {slots.map((photo, index) => {
        const slot = frame.slots[index];

        return (
          <div
            key={index}
            className={`absolute overflow-hidden ${
              activeSlot === index ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
            }`}
            style={{
              left: `${(slot.left / OUTPUT_WIDTH) * 100}%`,
              top: `${(slot.top / OUTPUT_HEIGHT) * 100}%`,
              width: `${(slot.width / OUTPUT_WIDTH) * 100}%`,
              height: `${(slot.height / OUTPUT_HEIGHT) * 100}%`,
            }}
          >
            <div className="absolute inset-0 overflow-hidden bg-surface-secondary">
              {activeSlot === index && showCamera && videoRef ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`size-full object-cover ${cameraFacing === "user" ? "-scale-x-100" : ""}`}
                />
              ) : photo ? (
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-muted flex size-full items-center justify-center text-sm font-medium">
                  Photo {index + 1}
                </span>
              )}
              {activeSlot === index && countdown ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <span className="text-7xl font-bold tabular-nums text-white">{countdown}</span>
                </div>
              ) : null}
              {activeSlot === index && isComposing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 px-3 text-center">
                  <span className="text-sm font-medium text-white">Preparing your photo</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <img
        src={frame.src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
}

export function PhotoBoothClient() {
  const [stage, setStage] = useState<BoothStage>("intro");
  const [slots, setSlots] = useState<SlotPhotos>(EMPTY_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [streamVersion, setStreamVersion] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const slotsRef = useRef<SlotPhotos>(EMPTY_SLOTS);
  const resultUrlRef = useRef<string | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const cameraRequestRef = useRef(0);
  const compositionRequestRef = useRef(0);
  const capturingPhotoRef = useRef(false);

  function isCurrentCameraRequest(requestId: number) {
    return isMountedRef.current && cameraRequestRef.current === requestId && !document.hidden;
  }

  function invalidateCameraRequest() {
    cameraRequestRef.current += 1;
  }

  function invalidateComposition() {
    compositionRequestRef.current += 1;
  }

  function replaceSlot(index: number, url: string | null): SlotPhotos {
    const next = copySlots(slotsRef.current);
    const previous = next[index];
    if (previous && previous !== url) URL.revokeObjectURL(previous);

    next[index] = url;
    slotsRef.current = next;
    setSlots(next);
    return next;
  }

  function replaceResult(url: string | null) {
    if (resultUrlRef.current && resultUrlRef.current !== url) {
      URL.revokeObjectURL(resultUrlRef.current);
    }

    resultUrlRef.current = url;
    setResultUrl(url);
  }

  function clearCountdown() {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);

    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function composeStrip(completedSlots: CompletedPhotos) {
    const requestId = compositionRequestRef.current + 1;
    compositionRequestRef.current = requestId;
    replaceResult(null);
    setStage("composing");
    setError(null);

    try {
      const selectedFrame = PHOTO_BOOTH_FRAME;
      const [frame, ...photos] = await Promise.all([
        loadImage(selectedFrame.src),
        ...completedSlots.map((slot) => loadImage(slot)),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the photo canvas.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = selectedFrame.backgroundColor;
      context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      selectedFrame.slots.forEach((slot, index) => {
        const photo = photos[index];
        drawCover(context, photo, photo.width, photo.height, slot.left, slot.top, slot.width, slot.height);
      });

      context.drawImage(frame, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      const result = URL.createObjectURL(await canvasToJpeg(canvas, 0.95));
      if (!isMountedRef.current || compositionRequestRef.current !== requestId) {
        URL.revokeObjectURL(result);
        return;
      }

      replaceResult(result);
      setStage("review");
    } catch (cause) {
      if (!isMountedRef.current || compositionRequestRef.current !== requestId) return;
      setError(cause instanceof Error ? cause.message : "Could not finish your photo strip.");
      setStage("review");
    }
  }

  async function startCamera(facing: CameraFacing, deviceId?: string) {
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    invalidateComposition();
    clearCountdown();
    stopCamera();
    setError(null);
    setCameraDevices([]);
    setActiveDeviceId(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open a camera. Choose a photo instead.");
      setStage("intro");
      return;
    }

    setStage("starting");
    try {
      const preferredVideo = {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facing } }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: 16 / 9 },
      };
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: preferredVideo,
        });
      } catch (cause) {
        const errorName = cause instanceof DOMException ? cause.name : "";
        const canRetry = ["NotFoundError", "OverconstrainedError", "TypeError"].includes(errorName);
        if (!canRetry) throw cause;

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
      }

      if (!isCurrentCameraRequest(requestId)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraReady(true);
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const actualFacing = settings?.facingMode;
      setActiveDeviceId(settings?.deviceId ?? deviceId ?? null);
      if (actualFacing === "environment" || actualFacing === "user") {
        setCameraFacing(actualFacing);
      }
      setStage("capture");
      setStreamVersion((value) => value + 1);

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (!isCurrentCameraRequest(requestId)) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          setCameraDevices(
            devices
              .filter((device) => device.kind === "videoinput" && device.deviceId)
              .map((device) => ({ deviceId: device.deviceId, label: device.label })),
          );
        } catch {
          if (isCurrentCameraRequest(requestId)) setCameraDevices([]);
        }
      }
    } catch (cause) {
      if (isCurrentCameraRequest(requestId)) {
        setError(getCameraError(cause));
        setStage("intro");
      }
    }
  }

  async function takePhoto() {
    const video = videoRef.current;
    const requestId = cameraRequestRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("The camera is still getting ready. Try again in a moment.");
      return;
    }

    setStage("composing");
    setError(null);
    capturingPhotoRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture this photo.");

      if (cameraFacing === "user") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const snapshotUrl = URL.createObjectURL(await canvasToJpeg(canvas, 0.94));
      if (!isCurrentCameraRequest(requestId)) {
        URL.revokeObjectURL(snapshotUrl);
        return;
      }

      const nextSlots = replaceSlot(selectedSlot, snapshotUrl);
      const nextOpenSlot = nextSlots.findIndex((slot) => slot === null);
      if (hasCompletedPhotos(nextSlots)) {
        capturingPhotoRef.current = false;
        stopCamera();
        invalidateCameraRequest();
        await composeStrip(nextSlots);
        return;
      }

      setSelectedSlot(nextOpenSlot);
      setStage("capture");
    } catch (cause) {
      if (!isCurrentCameraRequest(requestId)) return;
      setError(cause instanceof Error ? cause.message : "Could not capture this photo.");
      setStage("capture");
    } finally {
      capturingPhotoRef.current = false;
    }
  }

  function beginCountdown() {
    if (stage !== "capture") return;

    setError(null);
    setCountdown(3);
    setStage("countdown");
    let next = 3;
    countdownTimerRef.current = window.setInterval(() => {
      next -= 1;
      if (next > 0) {
        setCountdown(next);
        return;
      }

      clearCountdown();
      void takePhoto();
    }, 1000);
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file to add it to this slot.");
      return;
    }

    setError(null);
    const nextSlots = replaceSlot(selectedSlot, URL.createObjectURL(file));
    const nextOpenSlot = nextSlots.findIndex((slot) => slot === null);
    if (hasCompletedPhotos(nextSlots)) {
      stopCamera();
      void composeStrip(nextSlots);
      return;
    }

    setSelectedSlot(nextOpenSlot);
    setStage("intro");
  }

  function retakeSlot(index: number) {
    clearCountdown();
    invalidateCameraRequest();
    invalidateComposition();
    stopCamera();
    replaceResult(null);
    replaceSlot(index, null);
    setSelectedSlot(index);
    void startCamera(cameraFacing);
  }

  function downloadPhoto() {
    if (!resultUrl) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = "sync-photo-booth-story.jpg";
    link.click();
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || (stage !== "capture" && stage !== "countdown")) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      if (!isMountedRef.current || streamRef.current !== stream) return;
      invalidateCameraRequest();
      stopCamera();
      setError("The camera preview could not start. Try opening the camera again.");
      setStage("intro");
    });
  }, [stage, streamVersion]);

  useEffect(() => {
    isMountedRef.current = true;

    function stopForLifecycle() {
      invalidateCameraRequest();
      invalidateComposition();
      clearCountdown();
      stopCamera();
      setStage((current) => {
        if (current === "starting" || current === "capture" || current === "countdown") {
          return "intro";
        }
        return current === "composing"
          ? capturingPhotoRef.current
            ? "intro"
            : "review"
          : current;
      });
    }

    function handleVisibilityChange() {
      if (document.hidden) stopForLifecycle();
    }

    function handlePageHide() {
      stopForLifecycle();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      isMountedRef.current = false;
      invalidateCameraRequest();
      invalidateComposition();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      clearCountdown();
      stopCamera();
      slotsRef.current.forEach((slot) => {
        if (slot) URL.revokeObjectURL(slot);
      });
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const completedCount = slots.filter((slot) => slot !== null).length;
  const cameraStage = stage === "capture" || stage === "countdown" || stage === "composing";
  const showCamera = cameraStage && cameraReady;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {stage === "review" ? (
        <Card>
          <Card.Content className="flex flex-col gap-4 p-3">
            {resultUrl ? (
              <img
                src={resultUrl}
                alt="Your completed three-photo event strip"
                className="w-full rounded-xl"
              />
            ) : (
              <PhotoStrip slots={slots} />
            )}
            <div className="px-1">
              <Typography type="body-sm" weight="medium">
                {resultUrl ? "Your story strip is ready." : "Your three photos are ready to finish."}
              </Typography>
              <Typography type="body-xs" color="muted" className="mt-1">
                {resultUrl
                  ? "Download a 9:16 JPEG made for Stories and Reels."
                  : "Try finishing the strip again, or retake one photo."}
              </Typography>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content className="flex flex-col gap-4 p-3">
            <PhotoStrip
              slots={slots}
              activeSlot={selectedSlot}
              cameraFacing={cameraFacing}
              countdown={countdown}
              isComposing={stage === "composing"}
              showCamera={showCamera}
              videoRef={videoRef}
            />
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <Typography type="body-sm" weight="medium">
                  {stage === "starting"
                    ? "Opening your camera."
                    : stage === "composing"
                      ? "Preparing your photo."
                      : cameraStage
                        ? `Photo ${selectedSlot + 1} of 3`
                        : "Three moments, one story."}
                </Typography>
                <Typography type="body-xs" color="muted">
                  {stage === "starting"
                    ? "Approve the browser prompt to continue, or choose a photo if camera access is unavailable."
                    : stage === "composing"
                      ? "Keeping your event frame in place while this photo is prepared."
                      : cameraStage
                        ? "Three-second countdown"
                        : "Your camera frames and finished strip stay on this device."}
                </Typography>
              </div>
              {cameraStage && cameraDevices.length > 1 ? (
                <Button
                  isIconOnly
                  variant="secondary"
                  aria-label="Switch camera"
                  isDisabled={stage !== "capture"}
                  onPress={() => {
                    const nextDevice =
                      cameraDevices.find((device) => device.deviceId !== activeDeviceId) ??
                      cameraDevices[0];
                    void startCamera(
                      cameraFacing === "user" ? "environment" : "user",
                      nextDevice?.deviceId,
                    );
                  }}
                >
                  <SwitchCamera className="size-5" aria-hidden />
                </Button>
              ) : null}
            </div>
          </Card.Content>
        </Card>
      )}

      {stage === "intro" ? (
        <>
          <Button fullWidth onPress={() => void startCamera(cameraFacing)}>
            <Camera className="size-4" aria-hidden />
            Open camera
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            Choose photo
          </Button>
        </>
      ) : stage === "capture" ? (
        <Button fullWidth onPress={beginCountdown}>
          <Camera className="size-4" aria-hidden />
          Take photo
        </Button>
      ) : stage === "review" ? (
        <>
          {resultUrl ? (
            <Button fullWidth onPress={downloadPhoto}>
              <Download className="size-4" aria-hidden />
              Download photo
            </Button>
          ) : (
            <Button
              fullWidth
              onPress={() => {
                if (hasCompletedPhotos(slotsRef.current)) void composeStrip(slotsRef.current);
              }}
            >
              <RefreshCw className="size-4" aria-hidden />
              Finish photo strip
            </Button>
          )}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot, index) => (
              <Button
                key={index}
                variant="secondary"
                isDisabled={!slot}
                onPress={() => retakeSlot(index)}
              >
                Retake {index + 1}
              </Button>
            ))}
          </div>
        </>
      ) : null}

      {stage !== "review" ? (
        <div className="flex items-center justify-between px-1">
          <Chip size="sm" variant="secondary">
            {completedCount} of 3 saved
          </Chip>
          <Typography type="body-xs" color="muted">
            JPEG download only
          </Typography>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={choosePhoto}
      />

      {stage === "starting" ? (
        <div className="sr-only" role="status">
          Opening camera
        </div>
      ) : null}
    </div>
  );
}
