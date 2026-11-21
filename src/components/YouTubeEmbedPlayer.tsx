import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2, Radio, RotateCcw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => { destroy: () => void };
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const timeout = window.setTimeout(() => {
      ytApiPromise = null;
      reject(new Error('YouTube player timed out while loading.'));
    }, 12000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      if (prevReady) prevReady();
      resolve();
    };

    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        window.clearTimeout(timeout);
        ytApiPromise = null;
        reject(new Error('Unable to load YouTube player script.'));
      };
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

function mapYouTubeError(code: number): string {
  switch (code) {
    case 2:
      return 'Invalid video identifier. Please verify the programme link.';
    case 5:
      return 'HTML5 player encountered a playback issue in this browser.';
    case 100:
      return 'This programme is no longer available (removed or set to private).';
    case 101:
    case 150:
      return 'Embedded playback is restricted by the video owner on this title.';
    default:
      return 'Unable to play this video right now. Please check your connection and retry.';
  }
}

interface YouTubeEmbedPlayerProps {
  videoId: string;
  title: string;
  isLive?: boolean;
  onBroadcastEnded?: () => void;
}

export const YouTubeEmbedPlayer: React.FC<YouTubeEmbedPlayerProps> = ({
  videoId,
  title,
  isLive = false,
  onBroadcastEnded,
}) => {
  const reactId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const onBroadcastEndedRef = useRef(onBroadcastEnded);
  onBroadcastEndedRef.current = onBroadcastEnded;
  const isOnline = useOnlineStatus();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    if (!isOnline) {
      setLoading(false);
      setErrorMsg('You are offline. Reconnect to the internet to stream YouTube programmes.');
      return;
    }

    loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.YT?.Player) return;
        containerRef.current.innerHTML = '';
        const targetEl = document.createElement('div');
        targetEl.id = `yt-player-${reactId}-${retrySeed}`;
        targetEl.className = 'w-full h-full';
        containerRef.current.appendChild(targetEl);

        playerRef.current = new window.YT.Player(targetEl, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            // Recorded programmes MUST NEVER autoplay
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            fs: 1,
            modestbranding: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!cancelled) setLoading(false);
            },
            onStateChange: (event) => {
              // 0 === ENDED
              if (event.data === 0 && isLive && onBroadcastEndedRef.current) {
                onBroadcastEndedRef.current();
              }
            },
            onError: (event) => {
              if (!cancelled) {
                setLoading(false);
                setErrorMsg(mapYouTubeError(event.data));
              }
            },
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize YouTube player.');
        }
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore cleanup errors
      }
      playerRef.current = null;
    };
  }, [videoId, isLive, retrySeed, isOnline, reactId]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      {isLive && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1C0D1B] px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-red-400">
            <Radio className="h-4 w-4 animate-pulse shrink-0" />
            <span>LIVE NOW</span>
          </div>
          <span className="truncate text-xs text-[#C4B0C2]">{title}</span>
        </div>
      )}

      <div className="relative aspect-video w-full bg-black">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-label={title} />

        {loading && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#120711]/90 text-[#FAF7FA]">
            <Loader2 className="h-8 w-8 animate-spin text-[#EA6C20]" />
            <p className="text-sm text-[#C4B0C2]">Loading official YouTube player…</p>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#120711]/95 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              {isOnline ? <AlertCircle className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="font-display text-base font-semibold text-[#FAF7FA]">
                Playback Unavailable
              </h3>
              <p className="text-sm text-[#C4B0C2] leading-relaxed">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setRetrySeed((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-4 py-2 text-sm font-medium text-white hover:bg-[#941684] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Player</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
