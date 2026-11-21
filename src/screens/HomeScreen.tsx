import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Clock,
  Film,
  Play,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { ProgrammeCard } from '../components/ProgrammeCard.tsx';
import { YouTubeErrorCard } from '../components/YouTubeErrorCard.tsx';
import type {
  AppSettingsRecord,
  CategoryRecord,
  FeaturedProgrammeRecord,
  LiveStatusResponse,
  ProgrammeItem,
  ScreenRoute,
} from '../types.ts';

const HERO_STUDIO_IMAGE = `${import.meta.env.BASE_URL}assets/aistudio/WhatsApp_Image_2026-11-21_at_05.08.28_8c28203a.jpeg`;

interface HomeScreenProps {
  liveStatus: LiveStatusResponse | null;
  liveLoading: boolean;
  programmes: ProgrammeItem[];
  programmesLoading: boolean;
  programmesError: string | null;
  featured: FeaturedProgrammeRecord[];
  categories: CategoryRecord[];
  settings: AppSettingsRecord;
  onRefresh: () => void;
  onNavigate: (route: ScreenRoute) => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectProgramme: (programme: ProgrammeItem) => void;
  onWatchProgramme: (programme: ProgrammeItem) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  liveStatus,
  liveLoading,
  programmes,
  programmesLoading,
  programmesError,
  featured,
  categories,
  settings,
  onRefresh,
  onNavigate,
  onSelectCategory,
  onSelectProgramme,
  onWatchProgramme,
}) => {
  const isLive = Boolean(liveStatus?.isLive && liveStatus.liveBroadcast);
  const latestRecordings = programmes.slice(0, 6);

  const featuredAsItems: ProgrammeItem[] = featured.map((f) => ({
    videoId: f.videoId,
    title: f.title,
    description: f.note || '',
    thumbnailUrl: f.thumbnailUrl,
    publishedAt: f.publishedAt,
    categoryName: f.categoryName || 'Featured',
    isFeatured: true,
    isAvailable: true,
    liveBroadcastContent: 'none',
  }));

  return (
    <div className="space-y-12 pb-8">
      {/* Dominant Hero Anchor: LIVE TV when on-air, Offline Sanctuary & Library CTA when off-air */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1C0D1B]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div>
              {liveLoading ? (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#C4B0C2]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#EA6C20]" />
                  <span>Checking broadcast status…</span>
                </div>
              ) : isLive ? (
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-red-400">
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>LIVE BROADCAST ON AIR</span>
                </div>
              ) : (
                <p className="text-xs font-medium text-[#C4B0C2]">
                  Channel Offline · Free On-Demand Streaming
                </p>
              )}

              <h1
                className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#FAF7FA]"
                style={{ textWrap: 'balance' }}
              >
                {isLive
                  ? liveStatus?.liveBroadcast?.title
                  : `${settings.stationName} Live & Recorded Programmes`}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-[#C4B0C2] leading-relaxed max-w-xl">
                {isLive
                  ? 'A live broadcast is currently streaming on our official YouTube channel. Watch directly inside HILL MOBILE.'
                  : liveStatus?.hasUpcoming && liveStatus.upcomingBroadcast
                    ? `No live broadcast is active right now. Next scheduled broadcast: "${liveStatus.upcomingBroadcast.title}". Meanwhile, choose any recorded programme below.`
                    : 'No live broadcast is currently active. Browse and select any recorded programme from our library — playback only begins when you choose a video.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isLive ? (
                <button
                  type="button"
                  onClick={() => onNavigate('live')}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Watch Live Broadcast</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#941684] transition-colors cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>Browse Recorded Programmes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#120711] px-4 py-3 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] transition-colors cursor-pointer"
              >
                <Bell className="h-4 w-4 text-[#EA6C20]" />
                <span>Live Alerts</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative min-h-[240px] sm:min-h-[300px] lg:min-h-full bg-[#120711]">
            <img
              src={
                isLive && liveStatus?.liveBroadcast?.thumbnailUrl
                  ? liveStatus.liveBroadcast.thumbnailUrl
                  : HERO_STUDIO_IMAGE
              }
              alt={isLive ? liveStatus?.liveBroadcast?.title || 'Live broadcast' : 'HILL MOBILE Broadcast Camera Team'}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C0D1B] via-black/25 to-transparent lg:bg-gradient-to-r lg:from-[#1C0D1B] lg:via-transparent lg:to-transparent" />
            {isLive && (
              <button
                type="button"
                onClick={() => onNavigate('live')}
                aria-label="Open Live TV Player"
                className="absolute inset-0 flex items-center justify-center group cursor-pointer"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/95 text-white shadow-2xl transition-transform group-hover:scale-105">
                  <Play className="h-7 w-7 fill-current ml-0.5" />
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Configuration / API warning when YOUTUBE_API_KEY is missing */}
      {liveStatus && !liveStatus.configured && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-200">YouTube Data API Key Needed</p>
              <p className="mt-1 text-amber-200/80">
                Add <code className="font-mono text-xs">YOUTUBE_API_KEY</code> to your server environment secrets to sync live broadcasts and recorded programmes from{' '}
                <span className="font-medium text-white">{settings.channelHandle}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 px-4 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/10 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Recheck</span>
          </button>
        </section>
      )}

      {/* Programme Categories Explorer */}
      {categories.length > 0 && (
        <section aria-labelledby="home-categories-heading">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 id="home-categories-heading" className="font-display text-xl font-semibold text-[#FAF7FA]">
              Programme Categories
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EA6C20] hover:text-[#F5843D] cursor-pointer"
            >
              <span>All Programmes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="rounded-xl border border-white/10 bg-[#1C0D1B] px-4 py-2.5 text-sm font-medium text-[#FAF7FA] hover:border-[#EA6C20]/50 hover:bg-[#271325] transition-colors cursor-pointer whitespace-nowrap"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Programmes (Curated by Admins) */}
      {featuredAsItems.length > 0 && (
        <section aria-labelledby="home-featured-heading">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 id="home-featured-heading" className="font-display text-xl font-semibold text-[#FAF7FA]">
                Featured Programmes
              </h2>
              <p className="mt-0.5 text-xs text-[#C4B0C2]">Selected highlights from the channel</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredAsItems.slice(0, 3).map((item) => (
              <ProgrammeCard
                key={item.videoId}
                programme={item}
                onSelect={onSelectProgramme}
                onWatch={onWatchProgramme}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Recorded Programmes (Newest First, Never Autoplayed) */}
      <section aria-labelledby="home-latest-heading">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 id="home-latest-heading" className="font-display text-xl font-semibold text-[#FAF7FA]">
              Latest Recordings
            </h2>
            <p className="mt-0.5 text-xs text-[#C4B0C2]">
              Newest uploads appear first · Select any programme to watch
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('latest')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EA6C20] hover:text-[#F5843D] cursor-pointer whitespace-nowrap"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>View All Latest</span>
          </button>
        </div>

        {programmesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl border border-white/10 bg-[#1C0D1B] animate-pulse"
              />
            ))}
          </div>
        ) : programmesError ? (
          <YouTubeErrorCard error={programmesError} onRetry={onRefresh} />
        ) : latestRecordings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-8 text-center">
            <p className="text-sm text-[#C4B0C2]">
              No recorded programmes loaded yet. Connect your YouTube Data API key or check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {latestRecordings.map((item) => (
              <ProgrammeCard
                key={item.videoId}
                programme={item}
                onSelect={onSelectProgramme}
                onWatch={onWatchProgramme}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
