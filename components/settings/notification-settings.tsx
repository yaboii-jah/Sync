"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Switch, Typography } from "@/components/ui";
import {
  useInstall,
  type InstallPlatform,
} from "@/components/push/install-provider";
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
  | "install-required"
  | "busy";

interface NotificationGuidance {
  title: string;
  description: string;
  steps: string[];
}

function getNotificationGuidance(
  platform: InstallPlatform,
  isInstalled: boolean,
): NotificationGuidance {
  if (platform === "ios" && !isInstalled) {
    return {
      title: "Install Sync before enabling alerts",
      description:
        "iPhone and iPad support web push notifications for Home Screen web apps.",
      steps: [
        "In Safari, tap Share, then choose Add to Home Screen.",
        "Open Sync from the new Home Screen icon.",
        "Open Settings > Notifications > Sync and turn on Allow Notifications.",
      ],
    };
  }

  if (platform === "ios") {
    return {
      title: "Allow alerts for Sync",
      description:
        "Sync is installed, but notifications are blocked in the device settings.",
      steps: [
        "Open your device Settings app and choose Notifications > Sync.",
        "Turn on Allow Notifications and choose an alert style.",
        "Return to Sync and tap Check again.",
      ],
    };
  }

  if (platform === "android" && isInstalled) {
    return {
      title: "Allow alerts for Sync",
      description:
        "Sync is installed, but notifications are blocked in the device settings.",
      steps: [
        "Long-press the Sync app icon and tap App info.",
        "Tap Notifications and turn on Allow notifications.",
        "Return to Sync and tap Check again.",
      ],
    };
  }

  if (platform === "android") {
    return {
      title: "Allow notifications for this site",
      description:
        "Your browser is blocking notifications for Sync.",
      steps: [
        "Open the browser's site controls for this page.",
        "Open Permissions or Site settings and set Notifications to Allow.",
        "Return to Sync and tap Check again.",
      ],
    };
  }

  return {
    title: "Allow notifications for this site",
    description:
      "Your browser is blocking notifications for Sync. Chrome and Edge use Site settings; Safari uses Safari > Settings > Websites > Notifications.",
    steps: [
      "Open the site controls icon beside the address bar.",
      "Set Notifications to Allow for Sync.",
      "Return to Sync and tap Check again.",
    ],
  };
}

function isPermissionBlockedError(caught: unknown): boolean {
  return (
    caught instanceof DOMException &&
    (caught.name === "AbortError" || caught.name === "NotAllowedError")
  );
}

export function NotificationSettings() {
  const { ready: installReady, isInstalled, platform } = useInstall();
  const [status, setStatus] = useState<NotificationStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const statusCheckId = useRef(0);

  const refreshStatus = useCallback(async () => {
    const checkId = ++statusCheckId.current;
    setStatus("checking");
    setError(null);

    if (!installReady) return;

    const updateStatus = (nextStatus: NotificationStatus) => {
      if (checkId === statusCheckId.current) setStatus(nextStatus);
    };

    const iosBrowser = platform === "ios" && !isInstalled;
    if (iosBrowser) {
      updateStatus("install-required");
      return;
    }

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      typeof Notification !== "undefined";

    if (!supported) {
      updateStatus("unavailable");
      return;
    }

    if (Notification.permission === "denied") {
      updateStatus("blocked");
      return;
    }

    if (Notification.permission !== "granted") {
      updateStatus("disabled");
      return;
    }

    try {
      const subscription = await getExistingPushSubscription();
      if (!subscription) {
        updateStatus("disabled");
        return;
      }

      const stored = await hasPushSubscription(
        subscription.endpoint,
        subscription.device_id,
      );
      updateStatus(stored ? "enabled" : "disabled");
    } catch {
      if (checkId === statusCheckId.current) {
        setStatus("disabled");
        setError("We couldn't check this device's notification status.");
      }
    }
  }, [installReady, isInstalled, platform]);

  useEffect(() => {
    void Promise.resolve().then(() => refreshStatus());
  }, [refreshStatus]);

  useEffect(() => {
    function refreshWhenActive() {
      if (
        document.visibilityState !== "visible" ||
        status === "busy" ||
        status === "checking"
      ) {
        return;
      }

      void refreshStatus();
    }

    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    return () => {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [refreshStatus, status]);

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
      const blockedByBrowser =
        (typeof Notification !== "undefined" &&
          Notification.permission === "denied") ||
        isPermissionBlockedError(caught);

      setStatus(blockedByBrowser ? "blocked" : "disabled");
      setError(
        blockedByBrowser
          ? null
          : "Could not enable notifications on this device.",
      );
    }
  }

  async function checkAgain() {
    setError(null);

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      await enable();
      return;
    }

    await refreshStatus();
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
  const installRequired = status === "install-required";
  const blocked = status === "blocked";
  const busy = status === "busy" || status === "checking";
  const enabled = status === "enabled";
  const guidance = getNotificationGuidance(platform, isInstalled);
  const needsRecoveryGuidance = blocked || installRequired;

  const statusLabel = busy
    ? "Checking this device"
    : enabled
      ? "Enabled on this device"
      : blocked
        ? "Blocked by browser or device"
        : installRequired
          ? "Install Sync to enable alerts"
          : unavailable
            ? "Unavailable in this browser"
            : "Disabled on this device";

  return (
    <Card className="mt-4">
      <Card.Header>
        <Card.Title>Session alerts</Card.Title>
        <Card.Description>
          Reminders, live updates, and wrapped alerts on this device.
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4">
        {!unavailable && !blocked && !installRequired ? (
          <Switch
            className="w-full"
            isSelected={enabled}
            isDisabled={busy}
            aria-label="Toggle session alerts"
            onChange={() => void (enabled ? disable() : enable())}
          >
            <Switch.Content className="w-full justify-between gap-4">
              <span className="text-sm font-normal text-muted">{statusLabel}</span>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        ) : (
          <Typography type="body-sm" color="muted">
            {statusLabel}
          </Typography>
        )}

        {needsRecoveryGuidance ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content className="flex flex-col gap-2">
              <Alert.Title>{guidance.title}</Alert.Title>
              <Alert.Description>
                {guidance.description}
              </Alert.Description>
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-5 text-muted">
                {guidance.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {blocked ? (
                <Button
                  className="w-fit"
                  variant="outline"
                  size="sm"
                  isDisabled={busy}
                  onPress={() => void checkAgain()}
                >
                  Check again
                </Button>
              ) : null}
            </Alert.Content>
          </Alert>
        ) : null}

        {unavailable ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Push notifications unavailable</Alert.Title>
              <Alert.Description>
                This browser does not support push notifications. Try an
                installed PWA or a supported mobile browser.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>
    </Card>
  );
}
