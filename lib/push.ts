export interface StoredPushSubscription {
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const PUSH_EXPLAINER_DISMISSED_KEY = "push-explainer-dismissed";
export const PUSH_DISABLED_KEY = "push-disabled";
const PUSH_DEVICE_ID_KEY = "push-device-id";

export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);

  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

export async function ensurePushSubscription(): Promise<StoredPushSubscription> {
  console.info("[push] waiting for service worker…");
  const registration = await navigator.serviceWorker.ready;
  console.info("[push] service worker ready");

  let subscription = await registration.pushManager.getSubscription();
  console.info("[push] existing subscription:", subscription?.endpoint ?? null);

  if (!subscription) {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error("Missing VAPID public key");

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.info("[push] new subscription created");
  }

  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Incomplete push subscription");
  }

  return toStoredPushSubscription(json);
}

export async function getExistingPushSubscription(): Promise<StoredPushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Incomplete push subscription");
  }

  return toStoredPushSubscription(json);
}

export async function unsubscribePushSubscription(): Promise<{
  subscription: StoredPushSubscription | null;
  unsubscribed: boolean;
}> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { subscription: null, unsubscribed: true };

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Incomplete push subscription");
  }

  const unsubscribed = await subscription.unsubscribe();
  return {
    subscription: toStoredPushSubscription(json),
    unsubscribed,
  };
}

export function getPushDeviceId(): string {
  const stored = localStorage.getItem(PUSH_DEVICE_ID_KEY);
  if (stored && isUuid(stored)) return stored;

  const deviceId = crypto.randomUUID();
  localStorage.setItem(PUSH_DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function toStoredPushSubscription(
  json: PushSubscriptionJSON,
): StoredPushSubscription {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Incomplete push subscription");
  }

  return {
    device_id: getPushDeviceId(),
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
