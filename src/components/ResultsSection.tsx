import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, SearchX } from 'lucide-react';
import type { WildlifeArticle } from '../types/wildlife';
import { SpeciesCard } from './SpeciesCard';

interface ResultsSectionProps {
  activeQuery: string;
  results: WildlifeArticle[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  searchDurationMs: number | null;
  savedIds: Set<number>;
  onOpenModal: (article: WildlifeArticle) => void;
  onToggleSave: (article: WildlifeArticle) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onClearResults: () => void;
}

type MediaFilter = 'all' | 'with-photo';

export function ResultsSection({
  activeQuery,
  results,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  searchDurationMs,
  savedIds,
  onOpenModal,
  onToggleSave,
  onLoadMore,
  onRetry,
  onClearResults,
}: ResultsSectionProps) {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMediaFilter('all');
  }, [activeQuery]);

  const filteredResults = useMemo(() => {
    if (mediaFilter === 'with-photo') {
      return results.filter((item) => Boolean(item.imageUrl));
    }
    return results;
  }, [results, mediaFilter]);

  const photoCount = useMemo(
    () => results.filter((item) => Boolean(item.imageUrl)).length,
    [results]
  );

  // Infinite scroll trigger when scrolling near bottom of search results
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading || isLoadingMore || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '360px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, error, onLoadMore]);

  if (!isLoading && !error && !activeQuery) {
    return null;
  }

  return (
    <section
      aria-label="Wildlife search results"
      className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6"
    >
      {isLoading && (
        <div>
          <div className="mb-5 flex items-center justify-between border-b border-emerald-200/12 pb-3">
            <p className="text-sm text-[#9EB3A7]">
              Searching wild animal records for{' '}
              <span className="font-medium text-white">“{activeQuery}”</span>...
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-emerald-200/10 bg-[#0D1611]/80"
              >
                <div className="aspect-[4/3] w-full animate-pulse bg-emerald-200/8" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-36 animate-pulse rounded bg-emerald-200/10" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-emerald-200/12" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-full animate-pulse rounded bg-emerald-200/8" />
                    <div className="h-3.5 w-5/6 animate-pulse rounded bg-emerald-200/8" />
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-emerald-200/8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && results.length === 0 && (
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-xl border border-red-400/25 bg-[#191212]/90 p-6 text-center backdrop-blur-md"
        >
          <AlertCircle
            aria-hidden="true"
            className="mx-auto mb-3 h-7 w-7 text-red-300"
          />
          <h2 className="font-editorial text-xl font-semibold text-white">
            Unable to load Wikipedia results
          </h2>
          <p className="mt-2 text-sm text-[#D6C5C5]">{error}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={onClearResults}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-200/16 px-4 py-2 text-sm font-medium text-[#D1E0D7] transition-colors hover:border-emerald-200/30 hover:text-white cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && activeQuery && results.length === 0 && (
        <div className="mx-auto max-w-xl rounded-xl border border-emerald-200/12 bg-[#0D1611]/90 p-8 text-center backdrop-blur-md">
          <SearchX
            aria-hidden="true"
            className="mx-auto mb-3 h-7 w-7 text-[#8EA397]"
          />
          <h2 className="font-editorial text-xl font-semibold text-[#F2F7F4]">
            No wildlife records found for “{activeQuery}”
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#9EB3A7]">
            WildSearch focuses strictly on animals and wildlife. Try a species name such as African Lion, Jaguar, Snow Leopard, or Komodo Dragon.
          </p>
          <button
            type="button"
            onClick={onClearResults}
            className="mt-5 inline-flex min-h-[44px] items-center rounded-lg border border-emerald-200/16 px-4 py-2 text-sm font-medium text-[#D1E0D7] transition-colors hover:border-emerald-200/30 hover:text-white cursor-pointer"
          >
            Back to Discovery
          </button>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-200/12 pb-4">
            <div className="text-sm text-[#C5D4CB] tabular-nums">
              <span className="font-semibold text-white">
                {filteredResults.length}
              </span>{' '}
              wildlife {filteredResults.length === 1 ? 'record' : 'records'} for{' '}
              <span className="font-medium text-white">“{activeQuery}”</span>
              {searchDurationMs !== null && (
                <>
                  <span aria-hidden="true" className="mx-2 text-[#566B5F]">
                    ·
                  </span>
                  <span className="text-[#8EA397]">
                    {(searchDurationMs / 1000).toFixed(2)}s
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Filter results by photography"
                className="flex items-center gap-1 rounded-lg border border-emerald-200/14 bg-[#0D1611]/90 p-1"
              >
                <button
                  type="button"
                  onClick={() => setMediaFilter('all')}
                  aria-pressed={mediaFilter === 'all'}
                  className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    mediaFilter === 'all'
                      ? 'bg-[#10B981] text-[#041E14]'
                      : 'text-[#9EB3A7] hover:text-white'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('with-photo')}
                  aria-pressed={mediaFilter === 'with-photo'}
                  className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    mediaFilter === 'with-photo'
                      ? 'bg-[#10B981] text-[#041E14]'
                      : 'text-[#9EB3A7] hover:text-white'
                  }`}
                >
                  With Photo ({photoCount})
                </button>
              </div>

              <button
                type="button"
                onClick={onClearResults}
                className="min-h-[40px] rounded-lg border border-emerald-200/14 px-3 py-1.5 text-xs font-medium text-[#9EB3A7] transition-colors hover:border-emerald-200/30 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-xl border border-emerald-200/12 bg-[#0D1611]/85 p-8 text-center">
              <p className="text-sm text-[#C5D4CB]">
                None of the loaded entries include a preview photograph. Switch to All ({results.length}) or load more records.
              </p>
              <button
                type="button"
                onClick={() => setMediaFilter('all')}
                className="mt-4 min-h-[44px] rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] hover:bg-[#34D399] cursor-pointer"
              >
                Show All Results
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredResults.map((article) => (
                <SpeciesCard
                  key={article.pageid}
                  article={article}
                  isSaved={savedIds.has(article.pageid)}
                  onOpenModal={onOpenModal}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div
            ref={sentinelRef}
            className="mt-10 flex flex-col items-center justify-center gap-3 text-center"
          >
            {isLoadingMore && (
              <div className="inline-flex items-center gap-2 text-sm text-[#9EB3A7]">
                <Loader2
                  className="h-4 w-4 animate-spin text-[#34D399]"
                  aria-hidden="true"
                />
                <span>Loading more wild animal records...</span>
              </div>
            )}

            {!isLoadingMore && hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className="min-h-[44px] rounded-lg border border-emerald-200/16 bg-[#0D1611]/90 px-5 py-2.5 text-xs font-semibold text-[#6EE7B7] transition-colors hover:border-[#34D399] hover:text-white cursor-pointer"
              >
                Load More Matching Animals
              </button>
            )}

            {!isLoadingMore && !hasMore && results.length > 0 && (
              <p className="text-xs text-[#7E9487] tabular-nums">
                End of matching Wikipedia records ({results.length} loaded)
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
