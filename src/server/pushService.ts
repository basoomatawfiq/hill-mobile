import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type webpushTypes from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webpushTypes;

interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

const dataDir = path.resolve(process.cwd(), '.data');
const vapidPath = path.join(dataDir, 'vapid.json');
const subsPath = path.join(dataDir, 'subscriptions.json');
const sentLivePath = path.join(dataDir, 'sent-live.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function normalizeVapidSubject(raw?: string): string {
  const fallback = 'mailto:contact@hillmobile.org';
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;

  // Fix common missing colon or malformed prefix like "https//:email@domain/..."
  const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (trimmed.startsWith('mailto:') || (!trimmed.startsWith('http') && emailMatch)) {
    const candidate = emailMatch ? `mailto:${emailMatch[0]}` : trimmed;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'mailto:') return candidate;
    } catch {
      // fall through
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.toString();
    }
  } catch {
    if (emailMatch) {
      return `mailto:${emailMatch[0]}`;
    }
  }

  console.warn(`Invalid VAPID_SUBJECT "${trimmed}", falling back to ${fallback}`);
  return fallback;
}

function getOrCreateVapidKeys(): VapidKeys {
  const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = normalizeVapidSubject(process.env.VAPID_SUBJECT);

  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate, subject };
  }

  ensureDataDir();
  if (fs.existsSync(vapidPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(vapidPath, 'utf-8')) as VapidKeys;
      if (parsed.publicKey && parsed.privateKey) {
        return { ...parsed, subject };
      }
    } catch {
      // Regenerate below
    }
  }

  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
  fs.writeFileSync(vapidPath, JSON.stringify(keys, null, 2), 'utf-8');
  return keys;
}

let vapidKeys = getOrCreateVapidKeys();
try {
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
} catch (err) {
  console.warn('Invalid VAPID configuration, regenerating safe fallback VAPID keys:', err);
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: 'mailto:contact@hillmobile.org',
  };
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
}

function readSubscriptions(): StoredSubscription[] {
  ensureDataDir();
  if (!fs.existsSync(subsPath)) return [];
  try {
    const raw = fs.readFileSync(subsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubscriptions(subs: StoredSubscription[]) {
  ensureDataDir();
  fs.writeFileSync(subsPath, JSON.stringify(subs, null, 2), 'utf-8');
}

function readSentLiveIds(): string[] {
  ensureDataDir();
  if (!fs.existsSync(sentLivePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(sentLivePath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markLiveIdSent(videoId: string) {
  const ids = readSentLiveIds();
  if (!ids.includes(videoId)) {
    const next = [videoId, ...ids].slice(0, 200);
    ensureDataDir();
    fs.writeFileSync(sentLivePath, JSON.stringify(next, null, 2), 'utf-8');
  }
}

export function getPublicVapidKey(): string {
  return vapidKeys.publicKey;
}

export function getSubscriberCount(): number {
  return readSubscriptions().length;
}

export function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): { total: number } {
  const subs = readSubscriptions();
  const existingIdx = subs.findIndex((s) => s.endpoint === sub.endpoint);
  const record: StoredSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    subs[existingIdx] = record;
  } else {
    subs.push(record);
  }
  writeSubscriptions(subs);
  return { total: subs.length };
}

export function removePushSubscription(endpoint: string): { total: number } {
  const subs = readSubscriptions().filter((s) => s.endpoint !== endpoint);
  writeSubscriptions(subs);
  return { total: subs.length };
}

export async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  url: string;
  tag: string;
}): Promise<{ sent: number; failed: number; removed: number }> {
  const subs = readSubscriptions();
  if (subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints = new Set<string>();
  const message = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          message,
          { TTL: 3600 }
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.add(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.size > 0) {
    const remaining = subs.filter((s) => !expiredEndpoints.has(s.endpoint));
    writeSubscriptions(remaining);
  }

  return { sent, failed, removed: expiredEndpoints.size };
}

export async function notifyNewLiveBroadcastOnce(videoId: string, title: string) {
  const alreadySent = readSentLiveIds();
  if (alreadySent.includes(videoId)) {
    return { skipped: true };
  }
  markLiveIdSent(videoId);
  const result = await broadcastPushNotification({
    title: 'HILL MOBILE is Live Now',
    body: title,
    url: '/#/live',
    tag: `live-${videoId}`,
  });
  return { skipped: false, ...result };
}
