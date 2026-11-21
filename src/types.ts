export type ScreenRoute =
  | 'home'
  | 'live'
  | 'library'
  | 'latest'
  | 'details'
  | 'player'
  | 'search'
  | 'notifications'
  | 'about'
  | 'contact'
  | 'settings'
  | 'admin-login'
  | 'admin';

export interface YouTubeChannelInfo {
  channelId: string;
  handle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  uploadsPlaylistId: string;
  subscriberCount?: string;
  videoCount?: string;
  channelUrl: string;
}

export interface ProgrammeItem {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationIso?: string;
  durationFormatted?: string;
  categoryId?: string;
  categoryName?: string;
  isFeatured?: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
  liveBroadcastContent: 'none' | 'live' | 'upcoming';
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledStartTime?: string;
}

export interface LiveStatusResponse {
  configured: boolean;
  isLive: boolean;
  hasUpcoming: boolean;
  liveBroadcast: ProgrammeItem | null;
  upcomingBroadcast: ProgrammeItem | null;
  channel: YouTubeChannelInfo | null;
  checkedAt: string;
  fromCache: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface RecordedProgrammesResponse {
  configured: boolean;
  items: ProgrammeItem[];
  nextPageToken: string | null;
  totalResults: number;
  channel: YouTubeChannelInfo | null;
  checkedAt: string;
  fromCache: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface VideoDetailResponse {
  configured: boolean;
  available: boolean;
  item: ProgrammeItem | null;
  errorCode?: string;
  errorMessage?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FirestoreProgrammeRecord {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  categoryId: string;
  categoryName: string;
  isFeatured: boolean;
  isAvailable: boolean;
  updatedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FeaturedProgrammeRecord {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  categoryName: string;
  note: string;
  sortOrder: number;
  updatedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationRecord {
  id: string;
  type: 'live' | 'announcement';
  title: string;
  body: string;
  videoId: string;
  sentByUid: string;
  createdAt?: unknown;
}

export interface AppSettingsRecord {
  stationName: string;
  channelHandle: string;
  aboutTitle: string;
  aboutBody: string;
  missionStatement: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  updatedByUid?: string;
  updatedAt?: unknown;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  createdAt?: unknown;
}

export interface ServerStatusResponse {
  status: 'ok';
  youtubeConfigured: boolean;
  channelHandle: string;
  resolvedChannelId: string | null;
  vapidConfigured: boolean;
  pushSubscriberCount: number;
  lastLiveCheckAt: string | null;
  lastError: string | null;
}
