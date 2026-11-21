import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Play, Radio, Share2 } from 'lucide-react';
import { formatPublishedDate, ProgrammeCard } from '../components/ProgrammeCard.tsx';
import { YouTubeEmbedPlayer } from '../components/YouTubeEmbedPlayer.tsx';
import { fetchVideoDetail } from '../lib/api.ts';
import type { ProgrammeItem } from '../types.ts';

interface ProgrammeDetailsScreenProps {
  programme: ProgrammeItem;
  related: ProgrammeItem[];
  onBack: () => void;
  onWatch: (programme: ProgrammeItem) => void;
  onSelectProgramme: (programme: ProgrammeItem) => void;
}

export const ProgrammeDetailsScreen: React.FC<ProgrammeDetailsScreenProps> = ({
  programme,
  related,
  onBack,
  onWatch,
  onSelectProgramme,
}) => {
  const [freshItem, setFreshItem] = useState<ProgrammeItem>(programme);
  const [unavailableMsg, setUnavailableMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFreshItem(programme);
    setUnavailableMsg(null);
    let cancelled = false;
    fetchVideoDetail(programme.videoId)
      .then((res) => {
        if (cancelled) return;
        if (res.item) {
          setFreshItem((prev) => ({
            ...res.item!,
            categoryId: prev.categoryId,
            categoryName: prev.categoryName,
          }));
        }
        if (res.configured && !res.available) {
          setUnavailableMsg(
            res.errorMessage || 'This video is currently private, restricted, or unavailable.'
          );
        }
      })
      .catch(() => {
        // Keep cached metadata if transient error
      });
    return () => {
      cancelled = true;
    };
  }, [programme]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#/programme/${freshItem.videoId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: freshItem.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User dismissed share sheet
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#C4B0C2] hover:text-[#FAF7FA] cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 overflow-hidden rounded-2xl border border-white/10 bg-[#1C0D1B]">
          <div className="relative aspect-video w-full bg-black">
            <img
              src={freshItem.thumbnailUrl}
              alt={freshItem.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#C4B0C2] tabular-nums">
            <span>{freshItem.categoryName || 'Recorded Programme'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatPublishedDate(freshItem.publishedAt)}</span>
            {freshItem.durationFormatted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{freshItem.durationFormatted}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA] leading-tight">
            {freshItem.title}
          </h1>

          {unavailableMsg ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200">
              {unavailableMsg}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onWatch(freshItem)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#941684] transition-colors cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Recording</span>
              </button>

              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#1C0D1B] px-4 py-3 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? 'Link Copied' : 'Share'}</span>
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C4B0C2]">
              Programme Description
            </h2>
            <p className="mt-2 text-sm text-[#C4B0C2] whitespace-pre-line leading-relaxed">
              {freshItem.description || 'No additional description provided for this programme.'}
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-6 border-t border-white/10">
          <h2 className="font-display text-xl font-semibold text-[#FAF7FA] mb-4">
            Related Programmes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.slice(0, 3).map((item) => (
              <ProgrammeCard
                key={item.videoId}
                programme={item}
                onSelect={onSelectProgramme}
                onWatch={onWatch}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

interface VideoPlayerScreenProps {
  programme: ProgrammeItem;
  related: ProgrammeItem[];
  isChannelLive: boolean;
  onSwitchToLive: () => void;
  onBack: () => void;
  onWatch: (programme: ProgrammeItem) => void;
  onSelectProgramme: (programme: ProgrammeItem) => void;
}

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  programme,
  related,
  isChannelLive,
  onSwitchToLive,
  onBack,
  onWatch,
  onSelectProgramme,
}) => {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#C4B0C2] hover:text-[#FAF7FA] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Programmes</span>
        </button>

        {isChannelLive && (
          <button
            type="button"
            onClick={onSwitchToLive}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live Broadcast Active · Switch to Live TV</span>
          </button>
        )}
      </div>

      <YouTubeEmbedPlayer videoId={programme.videoId} title={programme.title} isLive={false} />

      <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#C4B0C2] tabular-nums">
          <span>{programme.categoryName || 'Recorded Programme'}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPublishedDate(programme.publishedAt)}</span>
          {programme.durationFormatted && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{programme.durationFormatted}</span>
            </>
          )}
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#FAF7FA]">
          {programme.title}
        </h1>
        {programme.description && (
          <p className="text-sm text-[#C4B0C2] whitespace-pre-line leading-relaxed pt-2 border-t border-white/5">
            {programme.description}
          </p>
        )}
      </div>

      {related.length > 0 && (
        <section className="pt-4">
          <h2 className="font-display text-lg font-semibold text-[#FAF7FA] mb-4">
            Up Next in Library (Select to Watch)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.slice(0, 3).map((item) => (
              <ProgrammeCard
                key={item.videoId}
                programme={item}
                onSelect={onSelectProgramme}
                onWatch={onWatch}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
