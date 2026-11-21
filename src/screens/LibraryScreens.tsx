import React, { useMemo, useState } from 'react';
import { RefreshCw, Search as SearchIcon, X } from 'lucide-react';
import { ProgrammeCard } from '../components/ProgrammeCard.tsx';
import { YouTubeErrorCard } from '../components/YouTubeErrorCard.tsx';
import type { CategoryRecord, ProgrammeItem } from '../types.ts';

interface RecordedLibraryScreenProps {
  title?: string;
  subtitle?: string;
  programmes: ProgrammeItem[];
  categories: CategoryRecord[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  loading: boolean;
  loadingMore: boolean;
  loadMoreError?: string | null;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectProgramme: (p: ProgrammeItem) => void;
  onWatchProgramme: (p: ProgrammeItem) => void;
}

export const RecordedLibraryScreen: React.FC<RecordedLibraryScreenProps> = ({
  title = 'Recorded Programmes',
  subtitle = 'Free to watch anytime · Newest recordings appear first · Select a programme to play',
  programmes,
  categories,
  selectedCategoryId,
  onCategoryChange,
  loading,
  loadingMore,
  loadMoreError,
  hasMore,
  error,
  onLoadMore,
  onRetry,
  onSelectProgramme,
  onWatchProgramme,
}) => {
  const filtered = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'all') return programmes;
    return programmes.filter((p) => p.categoryId === selectedCategoryId);
  }, [programmes, selectedCategoryId]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">{title}</h1>
        <p className="mt-1 text-sm text-[#C4B0C2]">{subtitle}</p>
      </div>

      {/* Category Filter Bar */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Programme Categories">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategoryId === 'all'}
            onClick={() => onCategoryChange('all')}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategoryId === 'all'
                ? 'bg-[#7A0F6D] text-white'
                : 'border border-white/10 bg-[#1C0D1B] text-[#C4B0C2] hover:text-[#FAF7FA]'
            }`}
          >
            All Programmes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategoryId === cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategoryId === cat.id
                  ? 'bg-[#7A0F6D] text-white'
                  : 'border border-white/10 bg-[#1C0D1B] text-[#C4B0C2] hover:text-[#FAF7FA]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl border border-white/10 bg-[#1C0D1B] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <YouTubeErrorCard error={error} onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-10 text-center">
          <p className="font-display text-base font-semibold text-[#FAF7FA]">
            No programmes in this category yet
          </p>
          <p className="mt-1.5 text-sm text-[#C4B0C2]">
            Try selecting All Programmes or check back after new recordings are categorized.
          </p>
          {selectedCategoryId !== 'all' && (
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-[#EA6C20] hover:bg-white/5 cursor-pointer"
            >
              Show All Programmes
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <ProgrammeCard
                key={item.videoId}
                programme={item}
                onSelect={onSelectProgramme}
                onWatch={onWatchProgramme}
              />
            ))}
          </div>

          {loadMoreError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-center text-xs text-amber-200">
              {loadMoreError}
            </div>
          )}

          {hasMore && selectedCategoryId === 'all' && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#1C0D1B] px-6 py-3 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] disabled:opacity-60 cursor-pointer"
              >
                {loadingMore && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{loadingMore ? 'Loading more…' : 'Load More Programmes'}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface SearchScreenProps {
  programmes: ProgrammeItem[];
  categories: CategoryRecord[];
  onSearchServer: (q: string) => Promise<ProgrammeItem[]>;
  onSelectProgramme: (p: ProgrammeItem) => void;
  onWatchProgramme: (p: ProgrammeItem) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  programmes,
  categories,
  onSearchServer,
  onSelectProgramme,
  onWatchProgramme,
}) => {
  const [queryText, setQueryText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [remoteResults, setRemoteResults] = useState<ProgrammeItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const trimmed = queryText.trim().toLowerCase();

  const localMatches = useMemo(() => {
    return programmes.filter((item) => {
      const catOk = categoryFilter === 'all' || item.categoryId === categoryFilter;
      if (!catOk) return false;
      if (!trimmed) return true;
      return (
        item.title.toLowerCase().includes(trimmed) ||
        item.description.toLowerCase().includes(trimmed) ||
        (item.categoryName || '').toLowerCase().includes(trimmed)
      );
    });
  }, [programmes, categoryFilter, trimmed]);

  const displayed = useMemo(() => {
    if (!remoteResults || !trimmed) return localMatches;
    const seen = new Set(localMatches.map((i) => i.videoId));
    const merged = [...localMatches];
    for (const r of remoteResults) {
      if (!seen.has(r.videoId)) {
        if (categoryFilter === 'all' || r.categoryId === categoryFilter) {
          merged.push(r);
        }
      }
    }
    return merged;
  }, [localMatches, remoteResults, trimmed, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    if (!trimmed) {
      setRemoteResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await onSearchServer(trimmed);
      setRemoteResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to search server right now.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
          Search Programmes
        </h1>
        <p className="mt-1 text-sm text-[#C4B0C2]">
          Search by programme title, topic, or description
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4B0C2]" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              if (!e.target.value.trim()) setRemoteResults(null);
            }}
            placeholder="Search lectures, Tafsir, Friday sermons, topics…"
            className="w-full rounded-xl border border-white/15 bg-[#1C0D1B] pl-11 pr-10 py-3 text-sm text-[#FAF7FA] placeholder:text-[#C4B0C2]/70 focus:border-[#EA6C20] focus:outline-none"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => {
                setQueryText('');
                setRemoteResults(null);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4B0C2] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={searching}
          className="rounded-xl bg-[#7A0F6D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#941684] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#EA6C20] text-[#120711]'
                : 'border border-white/10 bg-[#1C0D1B] text-[#C4B0C2] hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-[#EA6C20] text-[#120711]'
                  : 'border border-white/10 bg-[#1C0D1B] text-[#C4B0C2] hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {searchError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200">
          {searchError} — Showing matching programmes from the loaded library below.
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-10 text-center">
          <p className="font-display text-base font-semibold text-[#FAF7FA]">
            No matching programmes found
          </p>
          <p className="mt-1.5 text-sm text-[#C4B0C2]">
            {trimmed
              ? `No recorded programmes matched "${queryText}". Try a different keyword or clear category filters.`
              : 'Type a keyword above to search recorded programmes.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((item) => (
            <ProgrammeCard
              key={item.videoId}
              programme={item}
              onSelect={onSelectProgramme}
              onWatch={onWatchProgramme}
            />
          ))}
        </div>
      )}
    </div>
  );
};
