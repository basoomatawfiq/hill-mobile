import type {
  LiveStatusResponse,
  RecordedProgrammesResponse,
  ServerStatusResponse,
  VideoDetailResponse,
} from '../types.ts';
import { auth } from './firebase.ts';

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (attempt < maxAttempts - 1 && (typeof navigator === 'undefined' || navigator.onLine)) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw new Error(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'Unable to reach HILL MOBILE server. Please check your connection and retry.'
      );
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      if (contentType.includes('application/json')) {
        try {
          const body = JSON.parse(text) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore parse error
        }
      }
      throw new Error(message);
    }

    if (!contentType.includes('application/json')) {
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw new Error('Server is restarting or returned a non-JSON response. Please retry.');
    }

    return JSON.parse(text) as T;
  }

  throw new Error('Unable to reach HILL MOBILE server. Please retry.');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Administrator sign-in required.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function fetchLiveStatus(force = false): Promise<LiveStatusResponse> {
  return getJson<LiveStatusResponse>(`/api/youtube/live${force ? '?force=true' : ''}`);
}

export function fetchRecordedVideos(params?: {
  pageToken?: string;
  maxResults?: number;
  q?: string;
}): Promise<RecordedProgrammesResponse> {
  const sp = new URLSearchParams();
  if (params?.pageToken) sp.set('pageToken', params.pageToken);
  if (params?.maxResults) sp.set('maxResults', String(params.maxResults));
  if (params?.q) sp.set('q', params.q);
  const qs = sp.toString();
  return getJson<RecordedProgrammesResponse>(`/api/youtube/videos${qs ? `?${qs}` : ''}`);
}

export function fetchVideoDetail(videoId: string): Promise<VideoDetailResponse> {
  return getJson<VideoDetailResponse>(`/api/youtube/video/${encodeURIComponent(videoId)}`);
}

export function fetchPublicHealth(): Promise<ServerStatusResponse> {
  return getJson<ServerStatusResponse>('/api/health');
}

export async function fetchVapidPublicKey(): Promise<string> {
  const data = await getJson<{ publicKey: string }>('/api/notifications/vapid-key');
  return data.publicKey;
}

export async function subscribeWebPush(subscription: PushSubscriptionJSON): Promise<void> {
  await getJson('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribeWebPush(endpoint: string): Promise<void> {
  await getJson('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

export async function adminFetchStatus(): Promise<ServerStatusResponse> {
  const headers = await getAuthHeaders();
  return getJson<ServerStatusResponse>('/api/admin/status', { headers });
}

export async function adminTriggerSync(): Promise<{
  syncedAt: string;
  live: LiveStatusResponse;
  videosCount: number;
  videos: RecordedProgrammesResponse;
}> {
  const headers = await getAuthHeaders();
  return getJson('/api/admin/sync', { method: 'POST', headers });
}

export async function adminSendPushBroadcast(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ ok: boolean; delivery: { sent: number; failed: number; removed: number } }> {
  const headers = await getAuthHeaders();
  return getJson('/api/admin/notifications/broadcast', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}
