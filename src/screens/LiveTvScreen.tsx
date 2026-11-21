import React, { useState } from 'react';
import { Calendar, Film, Radio, RefreshCw, Tv } from 'lucide-react';
import { YouTubeEmbedPlayer } from '../components/YouTubeEmbedPlayer.tsx';
import { YouTubeErrorCard } from '../components/YouTubeErrorCard.tsx';
import { formatPublishedDate } from '../components/ProgrammeCard.tsx';
import type { LiveStatusResponse, ScreenRoute } from '../types.ts';

interface LiveTvScreenProps {
  liveStatus: LiveStatusResponse | null;
  loading: boolean;
  onRefreshLive: () => void;
  onNavigate: (route: ScreenRoute) => void;
}

export const LiveTvScreen: React.FC<LiveTvScreenProps> = ({
  liveStatus,
  loading,
  onRefreshLive,
  onNavigate,
}) => {
  const [broadcastEndedLocally, setBroadcastEndedLocally] = useState(false);

  const activeBroadcast =
    !broadcastEndedLocally && liveStatus?.isLive && liveStatus.liveBroadcast
      ? liveStatus.liveBroadcast
      : null;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
            HILL MOBILE Live TV
          </h1>
          <p className="mt-1 text-sm text-[#C4B0C2]">
            Official live stream from {liveStatus?.channel?.handle || '@samiwabasriugandatrueislam688'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setBroadcastEndedLocally(false);
            onRefreshLive();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#1C0D1B] px-4 py-2.5 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] disabled:opacity-60 transition-colors cursor-pointer self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Check Live Status</span>
        </button>
      </div>

      {loading && !liveStatus ? (
        <div className="aspect-video w-full rounded-2xl border border-white/10 bg-[#1C0D1B] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-[#EA6C20]" />
          <p className="text-sm text-[#C4B0C2]">Checking channel for active live broadcasts…</p>
        </div>
      ) : activeBroadcast ? (
        <div className="space-y-5">
          <YouTubeEmbedPlayer
            videoId={activeBroadcast.videoId}
            title={activeBroadcast.title}
            isLive
            onBroadcastEnded={() => {
              setBroadcastEndedLocally(true);
              onRefreshLive();
            }}
          />

          <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>LIVE BROADCAST</span>
              {activeBroadcast.actualStartTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#C4B0C2] font-normal">
                    Started {formatPublishedDate(activeBroadcast.actualStartTime)}
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold text-[#FAF7FA]">
              {activeBroadcast.title}
            </h2>
            {activeBroadcast.description && (
              <p className="mt-3 text-sm text-[#C4B0C2] whitespace-pre-line leading-relaxed">
                {activeBroadcast.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-[#1C0D1B] p-8 sm:p-12 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#120711] border border-white/10 text-[#EA6C20]">
            <Tv className="h-7 w-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#FAF7FA]">
              {broadcastEndedLocally
                ? 'The Live Broadcast Has Ended'
                : 'Channel Is Currently Offline'}
            </h2>
            <p className="text-sm text-[#C4B0C2] leading-relaxed">
              {liveStatus?.errorMessage
                ? 'Unable to verify live stream status due to a YouTube Data API configuration issue.'
                : 'There is no active live broadcast on the official HILL MOBILE channel right now. You can select and watch any recorded programme from our library.'}
            </p>
          </div>

          {liveStatus?.errorMessage && (
            <div className="max-w-xl mx-auto text-left">
              <YouTubeErrorCard error={liveStatus.errorMessage} onRetry={onRefreshLive} />
            </div>
          )}

          {liveStatus?.hasUpcoming && liveStatus.upcomingBroadcast && (
            <div className="mx-auto max-w-md rounded-2xl border border-[#EA6C20]/30 bg-[#120711] p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-medium text-[#EA6C20]">
                <Calendar className="h-4 w-4" />
                <span>Upcoming Broadcast Scheduled</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-[#FAF7FA]">
                {liveStatus.upcomingBroadcast.title}
              </p>
              {liveStatus.upcomingBroadcast.scheduledStartTime && (
                <p className="mt-1 text-xs text-[#C4B0C2]">
                  Scheduled:{' '}
                  {new Date(liveStatus.upcomingBroadcast.scheduledStartTime).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#941684] transition-colors cursor-pointer"
            >
              <Film className="h-4 w-4" />
              <span>Browse Recorded Programmes</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#120711] px-5 py-3 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] transition-colors cursor-pointer"
            >
              <span>Get Live Alerts</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
