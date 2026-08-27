"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ensurePushSubscription,
  PUSH_DISABLED_KEY,
  PUSH_EXPLAINER_DISMISSED_KEY,
} from "@/lib/push";
import { savePushSubscription } from "@/app/(app)/home/actions";

type Stage = "checking" | "hidden" | "explain" | "busy" | "done" | "dismissed";

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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-gate-title"
        aria-describedby="push-gate-description"
        className="push-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onClick={stage === "explain" ? dismiss : undefined}
      >
        <div
          className="push-modal-card relative w-full max-w-md rounded-3xl border border-border-default bg-bg-base px-6 py-6 shadow-[0_0_40px_rgba(188,131,48,0.3)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={dismiss}
            disabled={stage === "busy"}
            aria-label="Dismiss"
            className="absolute top-4 right-4 rounded-lg p-1.5 text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-pastel-yellow" />
            <div>
              <p id="push-gate-title" className="text-sm font-bold text-text-primary">
                Get session alerts
              </p>
              <p id="push-gate-description" className="mt-1 text-sm leading-snug text-text-muted">
                We&apos;ll send reminders, session-start alerts, and wrapped updates
                even when the app is closed.
              </p>
              {blockedNote ? (
                <p className="mt-2 rounded-lg bg-state-error/20 px-3 py-1.5 text-xs leading-snug text-state-error">
                  Notifications seem blocked in this browser. Try allowing push
                  messaging in your browser settings, or use another browser.
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={enable}
                  disabled={stage === "busy"}
                  className="rounded-full bg-pastel-yellow px-4 py-2 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green disabled:opacity-60 active:scale-95"
                >
                  {stage === "busy" ? "Enabling…" : "Enable alerts"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  disabled={stage === "busy"}
                  className="rounded-full px-4 py-2 text-xs font-bold tracking-[0.14em] text-text-muted uppercase hover:text-text-primary"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

