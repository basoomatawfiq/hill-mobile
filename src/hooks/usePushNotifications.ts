import { useEffect, useState } from 'react';
import { fetchVapidPublicKey, subscribeWebPush, unsubscribeWebPush } from '../lib/api.ts';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectStaticPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.github.io');
}

/**
 * Passively reads notification permission granted from device/browser settings
 * and syncs the Web Push subscription without ever triggering an in-app prompt.
 */
export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [staticHost, setStaticHost] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const pages = detectStaticPagesHost();
    setStaticHost(pages);

    const isSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setSupported(isSupported);

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    if (!isSupported || pages) {
      return;
    }

    let cancelled = false;

    const syncSubscriptionWithDeviceSetting = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || cancelled) return;
        const existingSub = await reg.pushManager.getSubscription();

        if (currentPerm === 'granted') {
          if (existingSub) {
            await subscribeWebPush(existingSub.toJSON());
            if (!cancelled) setIsSubscribed(true);
          } else {
            const publicKey = await fetchVapidPublicKey();
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
            await subscribeWebPush(sub.toJSON());
            if (!cancelled) setIsSubscribed(true);
          }
        } else if (existingSub) {
          await unsubscribeWebPush(existingSub.endpoint).catch(() => {});
          await existingSub.unsubscribe().catch(() => {});
          if (!cancelled) setIsSubscribed(false);
        }
      } catch {
        // Device settings / background service worker sync failed silently
      }
    };

    void syncSubscriptionWithDeviceSetting();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    supported,
    staticHost,
    permission,
    isSubscribed,
  };
}
