"use client";

import { useEffect, useState } from "react";
import {
  ensurePushSubscription,
  getPushDeviceId,
  getExistingPushSubscription,
  PUSH_DISABLED_KEY,
  PUSH_EXPLAINER_DISMISSED_KEY,
  unsubscribePushSubscription,
} from "@/lib/push";
import {
  hasPushSubscription,
  removePushSubscription,
  savePushSubscription,
} from "@/app/(app)/home/actions";

type NotificationStatus =
  | "checking"
  | "enabled"
  | "disabled"
  | "blocked"
  | "unavailable"
  | "busy";

export function NotificationSettings() {
  const [status, setStatus] = useState<NotificationStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        typeof Notification !== "undefined";

      if (!supported) {
        setStatus("unavailable");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }

      if (Notification.permission !== "granted") {
        setStatus("disabled");
        return;
      }

      try {
        const subscription = await getExistingPushSubscription();
        if (!subscription) {
          if (!cancelled) setStatus("disabled");
          return;
        }

        const stored = await hasPushSubscription(
          subscription.endpoint,
          subscription.device_id,
        );
        if (!cancelled) setStatus(stored ? "enabled" : "disabled");
      } catch {
        if (!cancelled) {
          setStatus("disabled");
          setError("We couldn't check this device's notification status.");
        }
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setStatus("busy");
    setError(null);

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "disabled");
        return;
      }

      const subscription = await ensurePushSubscription();
      const result = await savePushSubscription(subscription);
      if (result.error) {
        setStatus("disabled");
        setError(result.error);
        return;
      }

      localStorage.removeItem(PUSH_DISABLED_KEY);
      localStorage.removeItem(PUSH_EXPLAINER_DISMISSED_KEY);
      setStatus("enabled");
    } catch (caught) {
      setStatus("disabled");
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "Notifications are blocked in this browser. Check your browser settings."
          : "Could not enable notifications on this device.",
      );
    }
  }

  async function disable() {
    setStatus("busy");
    setError(null);

    let endpoint: string | null = null;
    let deviceId: string | null = null;
    let browserError = false;

    try {
      deviceId = getPushDeviceId();
    } catch {
      browserError = true;
    }

    try {
      const current = await getExistingPushSubscription();
      endpoint = current?.endpoint ?? null;
      deviceId = current?.device_id ?? deviceId;
    } catch {
      browserError = true;
    }

    try {
      const result = await unsubscribePushSubscription();
      endpoint = result.subscription?.endpoint ?? endpoint;
      deviceId = result.subscription?.device_id ?? deviceId;
      browserError = !result.unsubscribed;
    } catch {
      browserError = true;
    }

    const serverResult = deviceId
      ? await removePushSubscription(endpoint, deviceId)
      : { error: null };

    localStorage.setItem(PUSH_DISABLED_KEY, "1");
    localStorage.removeItem(PUSH_EXPLAINER_DISMISSED_KEY);
    setStatus("disabled");

    if (browserError || serverResult.error) {
      setError("Notifications were only partially disabled. Please try again.");
    }
  }

  const unavailable = status === "unavailable";
  const blocked = status === "blocked";
  const busy = status === "busy" || status === "checking";
  const enabled = status === "enabled";

  return (
    <section className="mt-8 rounded-2xl border border-border-default bg-bg-base px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Session alerts</h2>
          <p className="mt-1 max-w-sm text-sm leading-snug text-text-muted">
            Receive reminders, live updates, and wrapped alerts on this device.
          </p>
        </div>
        {!unavailable && !blocked ? (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle session alerts"
            onClick={() => void (enabled ? disable() : enable())}
            disabled={busy}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
              enabled
                ? "border-state-success bg-state-success"
                : "border-border-default bg-accent-primary"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-text-primary transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs font-bold tracking-[0.14em] text-text-muted uppercase">
        {busy ? "Checking device..." : enabled ? "Enabled on this device" : null}
        {!busy && !enabled && !blocked && !unavailable
          ? "Disabled on this device"
          : null}
        {blocked ? "Blocked by browser" : null}
        {unavailable ? "Unavailable in this browser" : null}
      </p>

      {blocked ? (
        <p className="mt-2 text-sm leading-snug text-state-error">
          Notifications are blocked. Allow them in your browser or device
          settings, then return here to enable session alerts.
        </p>
      ) : null}
      {unavailable ? (
        <p className="mt-2 text-sm leading-snug text-text-muted">
          This browser does not support push notifications. Try an installed
          PWA or a supported mobile browser.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm leading-snug text-state-error">{error}</p>
      ) : null}
    </section>
  );
}
