import { useCallback, useEffect, useState } from 'react';
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

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setSupported(isSupported);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if (isSupported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsSubscribed(Boolean(sub));
        })
        .catch(() => {
          // Service worker may still be registering
        });
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError(
        'Push notifications are not supported in this browser context. On iPhone or iPad, first add HILL MOBILE to your Home Screen (iOS 16.4+).'
      );
      return false;
    }

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setError('Notification permission was not granted. You can enable it in browser settings.');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const publicKey = await fetchVapidPublicKey();
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await subscribeWebPush(subscription.toJSON());
      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to enable notifications.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disableNotifications = useCallback(async () => {
    setError(null);
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeWebPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable notifications.');
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return {
    supported,
    permission,
    isSubscribed,
    busy,
    error,
    enableNotifications,
    disableNotifications,
  };
}
