"use client";

import { useState } from "react";
import { setEventPushPreferenceAction } from "@/app/e/[slug]/settings/actions";
import { savePushSubscription } from "@/app/(app)/home/actions";
import { ensurePushSubscription } from "@/lib/push";

export function EventPushSettings({ slug, initiallyEnabled }: { slug: string; initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      const next = !enabled;
      if (next) {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
          throw new Error("Push is not supported in this browser.");
        }
        if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") {
          throw new Error("Allow notifications in your browser to enable this event.");
        }
        const subscription = await ensurePushSubscription();
        const saved = await savePushSubscription(subscription);
        if (saved.error) throw new Error(saved.error);
      }
      const result = await setEventPushPreferenceAction(slug, next);
      if (result.error) throw new Error(result.error);
      setEnabled(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update push notifications.");
    } finally { setBusy(false); }
  }
  return <section className="mt-8 rounded-xl border p-6 platform-rule">
    <h2 className="font-semibold">Push alerts for this event</h2>
    <p className="mt-2 text-sm text-muted">Opt in separately for each event. Turning this off does not unsubscribe your device from other events.</p>
    <button type="button" className="platform-button mt-5 text-sm" disabled={busy} onClick={() => void toggle()}>
      {busy ? "Saving…" : enabled ? "Turn off event push" : "Enable event push"}
    </button>
    <p className="mt-3 text-sm" role="status">{message ?? (enabled ? "Enabled for this event." : "Off for this event.")}</p>
  </section>;
}
