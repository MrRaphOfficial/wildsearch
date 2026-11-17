import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { searchBiomeWildlife } from '../services/wikipedia';
import type { BiomeCategory, WildlifeArticle } from '../types/wildlife';
import { SpeciesCard } from './SpeciesCard';

interface FeaturedAtlasProps {
  savedIds: Set<number>;
  onOpenModal: (article: WildlifeArticle) => void;
  onToggleSave: (article: WildlifeArticle) => void;
}

const BIOMES: BiomeCategory[] = [
  'All',
  'Savanna',
  'Forest',
  'Alpine',
  'Marine',
  'Polar',
  'Desert',
  'Wetlands',
];

export function FeaturedAtlas({
  savedIds,
  onOpenModal,
  onToggleSave,
}: FeaturedAtlasProps) {
  const [selectedBiome, setSelectedBiome] = useState<BiomeCategory>('All');
  const [articles, setArticles] = useState<WildlifeArticle[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadBiomeInitial = useCallback(async (biome: BiomeCategory) => {
    abortRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    setArticles([]);
    setNextOffset(null);

    try {
      const result = await searchBiomeWildlife(biome, controller.signal, 0, 15);
      if (controller.signal.aborted) return;
      setArticles(result.articles);
      setNextOffset(result.nextOffset);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to stream wildlife records for this biome.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadBiomeMore = useCallback(async () => {
    if (nextOffset === null || isLoading || isLoadingMore) return;

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const result = await searchBiomeWildlife(
        selectedBiome,
        controller.signal,
        nextOffset,
        15
      );
      if (controller.signal.aborted) return;

      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.pageid));
        const uniqueNext = result.articles.filter(
          (a) => !existingIds.has(a.pageid)
        );
        return [...prev, ...uniqueNext];
      });
      setNextOffset(result.nextOffset);
    } catch (err) {
      if (!controller.signal.aborted) {
        setLoadMoreError(
          err instanceof Error
            ? err.message
            : 'Unable to load additional biome records.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoading, isLoadingMore, nextOffset, selectedBiome]);

  useEffect(() => {
    loadBiomeInitial(selectedBiome);
    return () => {
      abortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, [selectedBiome, loadBiomeInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel ||
      nextOffset === null ||
      isLoading ||
      isLoadingMore ||
      error ||
      loadMoreError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadBiomeMore();
        }
      },
      { rootMargin: '360px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, isLoading, isLoadingMore, loadBiomeMore, loadMoreError, nextOffset]);

  return (
    <section
      aria-label="Unlimited biome species atlas"
      className="mx-auto w-full max-w-[1200px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14"
    >
      <div className="flex flex-col justify-between gap-6 border-b border-emerald-200/12 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
            Unlimited Field Index
          </p>
          <h1 className="font-editorial mt-1.5 text-3xl font-semibold text-[#F2F7F4] sm:text-4xl">
            Global Biome Atlas
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9EB3A7] sm:text-base tabular-nums">
            Stream unlimited wild species by ecosystem. Scroll continuously to load additional encyclopedia entries ({articles.length} loaded).
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter species by biome"
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200/14 bg-[#0D1611]/90 p-1"
        >
          {BIOMES.map((biome) => {
            const active = selectedBiome === biome;
            return (
              <button
                key={biome}
                type="button"
                onClick={() => setSelectedBiome(biome)}
                aria-pressed={active}
                className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#10B981] text-[#041E14]'
                    : 'text-[#9EB3A7] hover:text-white'
                }`}
              >
                {biome}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-emerald-200/10 bg-[#0D1611]/80"
            >
              <div className="aspect-[4/3] w-full animate-pulse bg-emerald-200/8" />
              <div className="space-y-3 p-6">
                <div className="h-3 w-36 animate-pulse rounded bg-emerald-200/10" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-emerald-200/12" />
                <div className="h-3.5 w-full animate-pulse rounded bg-emerald-200/8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="mx-auto mt-8 max-w-xl rounded-xl border border-red-400/25 bg-[#191212]/90 p-6 text-center"
        >
          <AlertCircle
            aria-hidden="true"
            className="mx-auto mb-3 h-7 w-7 text-red-300"
          />
          <p className="text-sm text-[#D6C5C5]">{error}</p>
          <button
            type="button"
            onClick={() => loadBiomeInitial(selectedBiome)}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] hover:bg-[#34D399] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Retry Biome</span>
          </button>
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <SpeciesCard
                key={article.pageid}
                article={article}
                isSaved={savedIds.has(article.pageid)}
                onOpenModal={onOpenModal}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>

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
                <span>Streaming more {selectedBiome} species...</span>
              </div>
            )}

            {!isLoadingMore && loadMoreError && (
              <p className="text-xs text-red-300">{loadMoreError}</p>
            )}

            {!isLoadingMore && nextOffset !== null && (
              <button
                type="button"
                onClick={loadBiomeMore}
                className="min-h-[44px] rounded-lg border border-emerald-200/16 bg-[#0D1611]/90 px-5 py-2.5 text-xs font-semibold text-[#6EE7B7] transition-colors hover:border-[#34D399] hover:text-white cursor-pointer"
              >
                Load More {selectedBiome} Animals
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
