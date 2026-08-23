export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

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

  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}
