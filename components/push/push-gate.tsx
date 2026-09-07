"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Modal } from "@/components/ui";
import { Bell } from "lucide-react";
import {
  ensurePushSubscription,
  PUSH_DISABLED_KEY,
  PUSH_EXPLAINER_DISMISSED_KEY,
} from "@/lib/push";
import { savePushSubscription } from "@/app/(app)/home/actions";
import { holdInstallPrompt } from "@/components/push/first-run-signal";

type Stage = "checking" | "hidden" | "explain" | "busy" | "done" | "dismissed";

// Stages where this dialog no longer owns the first run. "checking" is not one
// of them: the permission check runs before anything is drawn, and releasing
// there would let the install card open next to the dialog again.
const TERMINAL_STAGES: ReadonlySet<Stage> = new Set<Stage>([
  "dismissed",
  "done",
  "hidden",
]);

export function PushGate() {
  const [stage, setStage] = useState<Stage>("checking");
  const [blockedNote, setBlockedNote] = useState(false);

  function markBlocked(err: unknown) {
    if (
      err instanceof DOMException &&
      err.name === "AbortError"
    ) {
      setBlockedNote(true);
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;

      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        typeof Notification !== "undefined";

      if (!supported || Notification.permission === "denied") {
        setStage("dismissed");
        return;
      }

      if (localStorage.getItem(PUSH_DISABLED_KEY)) {
        setStage("dismissed");
        return;
      }

      if (Notification.permission === "granted") {
        // Permission already given earlier — make sure a subscription is
        // actually stored (an early failure can leave this out of sync).
        try {
          const subscription = await ensurePushSubscription();
          const result = await savePushSubscription(subscription);
          if (result.error) console.error("[push] save failed:", result.error);
          setStage(result.error ? "explain" : "done");
        } catch (err) {
          if (!markBlocked(err)) {
            console.error("[push] resync failed:", err);
            setStage("hidden");
          } else {
            setStage("explain");
          }
        }
        return;
      }

      if (localStorage.getItem(PUSH_EXPLAINER_DISMISSED_KEY)) {
        setStage("dismissed");
        return;
      }

      setStage("explain");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage !== "explain") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        localStorage.setItem(PUSH_EXPLAINER_DISMISSED_KEY, "1");
        setStage("dismissed");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage]);

  // FR-5 / D-2: the install card waits on this dialog. Every stage change is
  // reported, so all four ways out — dismissed, done, hidden, and the Escape
  // path above, which lands on dismissed — release the card through one place.
  useEffect(() => {
    holdInstallPrompt(!TERMINAL_STAGES.has(stage));
  }, [stage]);

  // Leaving the page also releases the card, so an unresolved check cannot
  // strand it.
  useEffect(() => {
    return () => holdInstallPrompt(false);
  }, []);

  async function enable() {
    setStage("busy");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStage("dismissed");
        return;
      }

      const subscription = await ensurePushSubscription();
      const result = await savePushSubscription(subscription);

      if (result.error) {
        setStage("explain");
        return;
      }

      localStorage.removeItem(PUSH_DISABLED_KEY);
      localStorage.removeItem(PUSH_EXPLAINER_DISMISSED_KEY);
      setStage("done");
    } catch (err) {
      markBlocked(err);
      setStage("explain");
    }
  }

  function dismiss() {
    localStorage.setItem(PUSH_EXPLAINER_DISMISSED_KEY, "1");
    setStage("dismissed");
  }

  if (stage === "explain" || stage === "busy") {
    return (
      <Modal>
          <Modal.Backdrop
            isOpen
            isDismissable={stage === "explain"}
            {...{ isKeyboardDismissDisabled: stage === "busy" }}
            onOpenChange={(open) => {
              if (!open) dismiss();
            }}
          >
          <Modal.Container size="sm">
            <Modal.Dialog aria-label="Get session alerts">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Bell className="size-5" aria-hidden />
                </Modal.Icon>
                <Modal.Heading>Get session alerts</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                We will send organizer announcements and deliberate session
                status alerts even when the app is closed.
                {blockedNote ? (
                  <Alert status="danger" className="mt-4">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        Notifications seem blocked in this browser. Try allowing
                        push messaging in your browser settings, or use another
                        browser.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  isDisabled={stage === "busy"}
                  onPress={dismiss}
                >
                  Not now
                </Button>
                <Button isPending={stage === "busy"} onPress={enable}>
                  Enable alerts
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return null;
}

