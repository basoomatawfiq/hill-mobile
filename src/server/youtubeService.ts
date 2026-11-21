import type {
  LiveStatusResponse,
  ProgrammeItem,
  RecordedProgrammesResponse,
  VideoDetailResponse,
  YouTubeChannelInfo,
} from '../types.ts';
import { notifyNewLiveBroadcastOnce } from './pushService.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_HANDLE = '@samiwabasriugandatrueislam688';
const OFFICIAL_CHANNEL_URL = 'https://www.youtube.com/@samiwabasriugandatrueislam688';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CHANNEL_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LIVE_TTL_MS = 60 * 1000; // 60 seconds
const VIDEOS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const VIDEO_DETAIL_TTL_MS = 2 * 60 * 1000; // 2 minutes

let channelCache: CacheEntry<YouTubeChannelInfo> | null = null;
let liveCache: CacheEntry<LiveStatusResponse> | null = null;
const videosCache = new Map<string, CacheEntry<RecordedProgrammesResponse>>();
const videoDetailCache = new Map<string, CacheEntry<VideoDetailResponse>>();
let lastLiveVideoId: string | null = null;
let lastErrorMessage: string | null = null;
let lastLiveCheckAt: string | null = null;

function getApiKey(): string {
  return (process.env.YOUTUBE_API_KEY || '').trim();
}

export function getChannelHandle(): string {
  const raw = (process.env.YOUTUBE_CHANNEL_HANDLE || DEFAULT_HANDLE).trim();
  return raw.startsWith('@') ? raw : `@${raw}`;
}

export function isYouTubeConfigured(): boolean {
  return getApiKey().length > 0;
}

export function getServiceDiagnostics() {
  return {
    youtubeConfigured: isYouTubeConfigured(),
    channelHandle: getChannelHandle(),
    resolvedChannelId: channelCache?.value.channelId ?? null,
    lastLiveCheckAt,
    lastError: lastErrorMessage,
  };
}

export function clearYouTubeCaches() {
  channelCache = null;
  liveCache = null;
  videosCache.clear();
  videoDetailCache.clear();
}

export function formatIsoDuration(iso?: string): string | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  const secs = Number(match[3] || 0);
  if (hours === 0 && mins === 0 && secs === 0) return undefined;
  const paddedSecs = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

async function fetchYouTubeJson<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_YOUTUBE_API_KEY');
  }

  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set('key', apiKey);

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const bodyText = await response.text();
      let apiReason = '';
      try {
        const parsed = JSON.parse(bodyText);
        const reason = parsed?.error?.errors?.[0]?.reason || '';
        const msg = parsed?.error?.message || '';
        apiReason = reason && msg && reason !== msg ? `${reason} — ${msg}` : msg || reason;
      } catch {
        apiReason = bodyText.slice(0, 200);
      }

      if (response.status === 403 && apiReason.toLowerCase().includes('quota')) {
        throw new Error(`YOUTUBE_QUOTA_EXCEEDED: ${apiReason}`);
      }

      if (response.status === 429 || response.status >= 500) {
        lastErr = new Error(`YouTube API transient error (${response.status}): ${apiReason}`);
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }

      throw new Error(`YouTube API error (${response.status}): ${apiReason}`);
    } catch (err: unknown) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (
        lastErr.message.includes('MISSING_YOUTUBE_API_KEY') ||
        lastErr.message.includes('YOUTUBE_QUOTA_EXCEEDED') ||
        lastErr.message.includes('YouTube API error (400)') ||
        lastErr.message.includes('YouTube API error (401)') ||
        lastErr.message.includes('YouTube API error (403)') ||
        lastErr.message.includes('YouTube API error (404)')
      ) {
        throw lastErr;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }
  throw lastErr ?? new Error('YouTube API request failed');
}

interface YouTubeChannelApiResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
    };
  }>;
}

export async function resolveOfficialChannel(force = false): Promise<YouTubeChannelInfo> {
  if (!force && channelCache && channelCache.expiresAt > Date.now()) {
    return channelCache.value;
  }

  const configuredId = (process.env.YOUTUBE_CHANNEL_ID || '').trim();
  const handle = getChannelHandle().replace(/^@/, '');

  const queryParams: Record<string, string> = {
    part: 'snippet,contentDetails,statistics',
  };
  if (configuredId) {
    queryParams.id = configuredId;
  } else {
    queryParams.forHandle = handle;
  }

  let data = await fetchYouTubeJson<YouTubeChannelApiResponse>('channels', queryParams);

  // Fallback: if forHandle returned empty, search channel by handle once
  if ((!data.items || data.items.length === 0) && !configuredId) {
    const searchRes = await fetchYouTubeJson<{
      items?: Array<{ id?: { channelId?: string } }>;
    }>('search', {
      part: 'snippet',
      type: 'channel',
      q: handle,
      maxResults: '1',
    });
    const foundId = searchRes.items?.[0]?.id?.channelId;
    if (foundId) {
      data = await fetchYouTubeJson<YouTubeChannelApiResponse>('channels', {
        part: 'snippet,contentDetails,statistics',
        id: foundId,
      });
    }
  }

  const channel = data.items?.[0];
  if (!channel) {
    throw new Error(`Official YouTube channel not found for handle @${handle}`);
  }

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads || '';
  if (!uploadsPlaylistId) {
    throw new Error('Official YouTube channel uploads playlist could not be resolved.');
  }

  const info: YouTubeChannelInfo = {
    channelId: channel.id,
    handle: channel.snippet?.customUrl || `@${handle}`,
    title: channel.snippet?.title || 'HILL MOBILE',
    description: channel.snippet?.description || '',
    thumbnailUrl:
      channel.snippet?.thumbnails?.high?.url ||
      channel.snippet?.thumbnails?.medium?.url ||
      channel.snippet?.thumbnails?.default?.url ||
      '',
    uploadsPlaylistId,
    subscriberCount: channel.statistics?.subscriberCount,
    videoCount: channel.statistics?.videoCount,
    channelUrl: OFFICIAL_CHANNEL_URL,
  };

  channelCache = {
    value: info,
    expiresAt: Date.now() + CHANNEL_TTL_MS,
  };
  return info;
}

interface YouTubeVideoApiItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    liveBroadcastContent?: 'none' | 'live' | 'upcoming';
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  status?: {
    privacyStatus?: string;
    embeddable?: boolean;
    uploadStatus?: string;
  };
  liveStreamingDetails?: {
    actualStartTime?: string;
    actualEndTime?: string;
    scheduledStartTime?: string;
  };
}

function mapVideoItem(item: YouTubeVideoApiItem): ProgrammeItem {
  const privacy = item.status?.privacyStatus;
  const embeddable = item.status?.embeddable !== false;
  const isAvailable = privacy === 'public' && embeddable;
  let unavailableReason: string | undefined;
  if (privacy && privacy !== 'public') {
    unavailableReason = `This programme is currently ${privacy}.`;
  } else if (!embeddable) {
    unavailableReason = 'Embedding is disabled by the channel owner for this video.';
  }

  const thumb =
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.maxres?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

  const durationIso = item.contentDetails?.duration;

  return {
    videoId: item.id,
    title: item.snippet?.title || 'Untitled Programme',
    description: item.snippet?.description || '',
    thumbnailUrl: thumb,
    publishedAt: item.snippet?.publishedAt || '',
    durationIso,
    durationFormatted: formatIsoDuration(durationIso),
    isAvailable,
    unavailableReason,
    liveBroadcastContent: item.snippet?.liveBroadcastContent || 'none',
    actualStartTime: item.liveStreamingDetails?.actualStartTime,
    actualEndTime: item.liveStreamingDetails?.actualEndTime,
    scheduledStartTime: item.liveStreamingDetails?.scheduledStartTime,
  };
}

export async function getLiveStatus(force = false): Promise<LiveStatusResponse> {
  if (!isYouTubeConfigured()) {
    return {
      configured: false,
      isLive: false,
      hasUpcoming: false,
      liveBroadcast: null,
      upcomingBroadcast: null,
      channel: null,
      checkedAt: new Date().toISOString(),
      fromCache: false,
      errorCode: 'MISSING_YOUTUBE_API_KEY',
      errorMessage:
        'YouTube Data API key is not configured on the server. Add YOUTUBE_API_KEY to Secrets to enable automatic live detection.',
    };
  }

  if (!force && liveCache && liveCache.expiresAt > Date.now()) {
    return { ...liveCache.value, fromCache: true };
  }

  try {
    const channel = await resolveOfficialChannel(force);

    // Search active live broadcasts strictly for the resolved channelId
    const liveSearch = await fetchYouTubeJson<{
      items?: Array<{ id?: { videoId?: string } }>;
    }>('search', {
      part: 'snippet',
      channelId: channel.channelId,
      eventType: 'live',
      type: 'video',
      maxResults: '3',
    });

    const liveIds = (liveSearch.items || [])
      .map((i) => i.id?.videoId)
      .filter((id): id is string => Boolean(id));

    let activeLive: ProgrammeItem | null = null;
    if (liveIds.length > 0) {
      const details = await fetchYouTubeJson<{ items?: YouTubeVideoApiItem[] }>('videos', {
        part: 'snippet,contentDetails,status,liveStreamingDetails',
        id: liveIds.join(','),
      });
      for (const raw of details.items || []) {
        const mapped = mapVideoItem(raw);
        // Strictly confirm active live broadcast: liveBroadcastContent === 'live', started, not ended, public & embeddable
        if (
          mapped.isAvailable &&
          mapped.liveBroadcastContent === 'live' &&
          Boolean(mapped.actualStartTime) &&
          !mapped.actualEndTime
        ) {
          activeLive = mapped;
          break;
        }
      }
    }

    // Check upcoming broadcast (never marked as active live!)
    let upcomingBroadcast: ProgrammeItem | null = null;
    if (!activeLive) {
      const upcomingSearch = await fetchYouTubeJson<{
        items?: Array<{ id?: { videoId?: string } }>;
      }>('search', {
        part: 'snippet',
        channelId: channel.channelId,
        eventType: 'upcoming',
        type: 'video',
        maxResults: '1',
      });
      const upcomingId = upcomingSearch.items?.[0]?.id?.videoId;
      if (upcomingId) {
        const upDetails = await fetchYouTubeJson<{ items?: YouTubeVideoApiItem[] }>('videos', {
          part: 'snippet,contentDetails,status,liveStreamingDetails',
          id: upcomingId,
        });
        const rawUp = upDetails.items?.[0];
        if (rawUp) {
          const mappedUp = mapVideoItem(rawUp);
          if (mappedUp.isAvailable && mappedUp.liveBroadcastContent === 'upcoming') {
            upcomingBroadcast = mappedUp;
          }
        }
      }
    }

    // Trigger deduplicated Web Push if a new live broadcast started
    if (activeLive && activeLive.videoId !== lastLiveVideoId) {
      lastLiveVideoId = activeLive.videoId;
      notifyNewLiveBroadcastOnce(activeLive.videoId, activeLive.title).catch((err) => {
        console.error('Failed to send live broadcast push notification:', err);
      });
    } else if (!activeLive) {
      lastLiveVideoId = null;
    }

    lastLiveCheckAt = new Date().toISOString();
    lastErrorMessage = null;

    const result: LiveStatusResponse = {
      configured: true,
      isLive: Boolean(activeLive),
      hasUpcoming: Boolean(upcomingBroadcast),
      liveBroadcast: activeLive,
      upcomingBroadcast,
      channel,
      checkedAt: lastLiveCheckAt,
      fromCache: false,
    };

    liveCache = {
      value: result,
      expiresAt: Date.now() + LIVE_TTL_MS,
    };
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    lastErrorMessage = msg;
    lastLiveCheckAt = new Date().toISOString();
    return {
      configured: true,
      isLive: false,
      hasUpcoming: false,
      liveBroadcast: null,
      upcomingBroadcast: null,
      channel: channelCache?.value ?? null,
      checkedAt: lastLiveCheckAt,
      fromCache: false,
      errorCode: msg.includes('QUOTA') ? 'YOUTUBE_QUOTA_EXCEEDED' : 'YOUTUBE_API_ERROR',
      errorMessage: msg,
    };
  }
}

export async function getRecordedProgrammes(options: {
  pageToken?: string;
  maxResults?: number;
  query?: string;
  force?: boolean;
}): Promise<RecordedProgrammesResponse> {
  if (!isYouTubeConfigured()) {
    return {
      configured: false,
      items: [],
      nextPageToken: null,
      totalResults: 0,
      channel: null,
      checkedAt: new Date().toISOString(),
      fromCache: false,
      errorCode: 'MISSING_YOUTUBE_API_KEY',
      errorMessage:
        'YouTube Data API key is not configured on the server. Add YOUTUBE_API_KEY to Secrets to load channel programmes.',
    };
  }

  const pageToken = (options.pageToken || '').trim();
  const maxResults = Math.min(Math.max(options.maxResults || 24, 1), 50);
  const query = (options.query || '').trim().toLowerCase();
  const cacheKey = `${pageToken}::${maxResults}::${query}`;

  if (!options.force) {
    const cached = videosCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, fromCache: true };
    }
  }

  try {
    const channel = await resolveOfficialChannel(options.force);

    const playlistRes = await fetchYouTubeJson<{
      nextPageToken?: string;
      pageInfo?: { totalResults?: number };
      items?: Array<{
        contentDetails?: { videoId?: string; videoPublishedAt?: string };
        snippet?: { resourceId?: { videoId?: string } };
      }>;
    }>('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: channel.uploadsPlaylistId,
      maxResults: String(maxResults),
      pageToken,
    });

    const videoIds = Array.from(
      new Set(
        (playlistRes.items || [])
          .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
          .filter((id): id is string => Boolean(id))
      )
    );

    let items: ProgrammeItem[] = [];
    if (videoIds.length > 0) {
      const detailsRes = await fetchYouTubeJson<{ items?: YouTubeVideoApiItem[] }>('videos', {
        part: 'snippet,contentDetails,status,liveStreamingDetails',
        id: videoIds.join(','),
      });

      items = (detailsRes.items || [])
        .map(mapVideoItem)
        // Exclude unplayable, active live, and upcoming streams from recorded library
        .filter(
          (vid) =>
            vid.isAvailable &&
            vid.liveBroadcastContent !== 'live' &&
            vid.liveBroadcastContent !== 'upcoming'
        );

      if (query) {
        items = items.filter(
          (vid) =>
            vid.title.toLowerCase().includes(query) ||
            vid.description.toLowerCase().includes(query)
        );
      }

      // Guarantee newest recordings first
      items.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    lastErrorMessage = null;

    const result: RecordedProgrammesResponse = {
      configured: true,
      items,
      nextPageToken: playlistRes.nextPageToken || null,
      totalResults: playlistRes.pageInfo?.totalResults ?? items.length,
      channel,
      checkedAt: new Date().toISOString(),
      fromCache: false,
    };

    videosCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + VIDEOS_TTL_MS,
    });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    lastErrorMessage = msg;
    return {
      configured: true,
      items: [],
      nextPageToken: null,
      totalResults: 0,
      channel: channelCache?.value ?? null,
      checkedAt: new Date().toISOString(),
      fromCache: false,
      errorCode: msg.includes('QUOTA') ? 'YOUTUBE_QUOTA_EXCEEDED' : 'YOUTUBE_API_ERROR',
      errorMessage: msg,
    };
  }
}

export async function getVideoById(videoId: string): Promise<VideoDetailResponse> {
  if (!/^[a-zA-Z0-9_-]{6,32}$/.test(videoId)) {
    return {
      configured: isYouTubeConfigured(),
      available: false,
      item: null,
      errorCode: 'INVALID_VIDEO_ID',
      errorMessage: 'Invalid YouTube video identifier.',
    };
  }

  if (!isYouTubeConfigured()) {
    return {
      configured: false,
      available: false,
      item: null,
      errorCode: 'MISSING_YOUTUBE_API_KEY',
      errorMessage: 'YouTube Data API key is not configured on the server.',
    };
  }

  const cached = videoDetailCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const res = await fetchYouTubeJson<{ items?: YouTubeVideoApiItem[] }>('videos', {
      part: 'snippet,contentDetails,status,liveStreamingDetails',
      id: videoId,
    });

    const raw = res.items?.[0];
    if (!raw) {
      return {
        configured: true,
        available: false,
        item: null,
        errorCode: 'VIDEO_NOT_FOUND',
        errorMessage: 'This programme could not be found. It may have been removed or made private.',
      };
    }

    const mapped = mapVideoItem(raw);
    const result: VideoDetailResponse = {
      configured: true,
      available: mapped.isAvailable,
      item: mapped,
      errorCode: mapped.isAvailable ? undefined : 'VIDEO_UNAVAILABLE',
      errorMessage: mapped.unavailableReason,
    };

    videoDetailCache.set(videoId, {
      value: result,
      expiresAt: Date.now() + VIDEO_DETAIL_TTL_MS,
    });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      available: false,
      item: null,
      errorCode: 'YOUTUBE_API_ERROR',
      errorMessage: msg,
    };
  }
}
