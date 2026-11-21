import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { ProgrammeItem } from '../types.ts';

const FALLBACK_ART = `${import.meta.env.BASE_URL}src/assets/images/category_lectures_1795184235217.jpg`;

export function formatPublishedDate(iso: string): string {
  if (!iso) return 'Date unavailable';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ProgrammeCardProps {
  programme: ProgrammeItem;
  onSelect: (programme: ProgrammeItem) => void;
  onWatch?: (programme: ProgrammeItem) => void;
}

export const ProgrammeCard: React.FC<ProgrammeCardProps> = ({
  programme,
  onSelect,
  onWatch,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1C0D1B] transition-colors hover:border-[#EA6C20]/40 hover:bg-[#241122]">
      <button
        type="button"
        onClick={() => (onWatch ? onWatch(programme) : onSelect(programme))}
        className="relative aspect-video w-full overflow-hidden bg-[#120711] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6C20]"
      >
        {!imgError ? (
          <img
            src={programme.thumbnailUrl || FALLBACK_ART}
            alt={programme.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7A0F6D] to-[#120711] p-4 text-center">
            <span className="font-display text-sm font-medium text-[#C4B0C2]">
              HILL MOBILE Programme
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#7A0F6D]/95 text-white shadow-lg transition-transform duration-200 group-hover:scale-105">
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </span>
          {programme.durationFormatted && (
            <span className="rounded-md bg-black/75 px-2 py-0.5 font-mono text-xs text-[#FAF7FA] tabular-nums">
              {programme.durationFormatted}
            </span>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <button
            type="button"
            onClick={() => onSelect(programme)}
            className="text-left cursor-pointer focus-visible:outline-none focus-visible:underline"
          >
            <h3 className="font-display text-base font-semibold leading-snug text-[#FAF7FA] line-clamp-2 group-hover:text-[#EA6C20] transition-colors">
              {programme.title}
            </h3>
          </button>

          {/* Zero-pill metadata discipline: unboxed inline text separated by middots */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#C4B0C2] tabular-nums">
            <span>{programme.categoryName || 'Recorded Programme'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatPublishedDate(programme.publishedAt)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => onSelect(programme)}
            className="text-xs font-medium text-[#C4B0C2] hover:text-[#FAF7FA] transition-colors cursor-pointer whitespace-nowrap"
          >
            Programme Details
          </button>
          <button
            type="button"
            onClick={() => (onWatch ? onWatch(programme) : onSelect(programme))}
            className="text-xs font-semibold text-[#EA6C20] hover:text-[#F5843D] transition-colors cursor-pointer whitespace-nowrap"
          >
            Watch Recording
          </button>
        </div>
      </div>
    </article>
  );
};
