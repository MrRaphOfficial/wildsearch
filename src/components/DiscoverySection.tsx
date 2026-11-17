import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { fetchWildlifeSpotlight } from '../services/aiWildlife';
import { fetchSingleSpeciesArticle } from '../services/wikipedia';
import type {
  SpotlightPayload,
  SpotlightSpecies,
  WildlifeArticle,
} from '../types/wildlife';
import { SpeciesMediaFrame } from './SpeciesMediaFrame';

interface DiscoverySectionProps {
  onOpenArticleModal: (article: WildlifeArticle) => void;
  onSearchSpecies: (query: string) => void;
}

interface EnrichedSpotlightItem {
  spotlight: SpotlightSpecies;
  article: WildlifeArticle | null;
}

export function DiscoverySection({
  onOpenArticleModal,
  onSearchSpecies,
}: DiscoverySectionProps) {
  const [payload, setPayload] = useState<SpotlightPayload | null>(null);
  const [enriched, setEnriched] = useState<EnrichedSpotlightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const enrichedRef = useRef<EnrichedSpotlightItem[]>([]);
  enrichedRef.current = enriched;

  const hydrateBatch = useCallback(
    async (speciesList: SpotlightSpecies[], signal: AbortSignal) => {
      return Promise.all(
        speciesList.map(async (item) => {
          try {
            const article = await fetchSingleSpeciesArticle(
              item.searchQuery || item.commonName,
              signal
            );
            return { spotlight: item, article };
          } catch {
            return { spotlight: item, article: null };
          }
        })
      );
    },
    []
  );

  const loadInitialSpotlight = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setIsLoadingMore(false);
      setError(null);
      setLoadMoreError(null);

      try {
        const data = await fetchWildlifeSpotlight({
          refresh,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setPayload(data);
        setEnriched(data.species.map((s) => ({ spotlight: s, article: null })));
        setIsLoading(false);

        const hydrated = await hydrateBatch(data.species, controller.signal);
        if (!controller.signal.aborted) {
          setEnriched(hydrated);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load the wildlife discovery slate.'
        );
        setIsLoading(false);
      }
    },
    [hydrateBatch]
  );

  const loadMoreDiscoveries = useCallback(async () => {
    if (isLoading || isLoadingMore) return;

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const existingNames = enrichedRef.current.map(
      (item) => item.spotlight.commonName
    );

    try {
      const data = await fetchWildlifeSpotlight({
        refresh: true,
        exclude: existingNames,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const existingSet = new Set(
        existingNames.map((n) => n.toLowerCase())
      );
      const uniqueNew = data.species.filter(
        (s) => !existingSet.has(s.commonName.toLowerCase())
      );

      if (uniqueNew.length > 0) {
        setEnriched((prev) => [
          ...prev,
          ...uniqueNew.map((s) => ({ spotlight: s, article: null })),
        ]);

        const hydrated = await hydrateBatch(uniqueNew, controller.signal);
        if (!controller.signal.aborted) {
          setEnriched((prev) => {
            const hydratedMap = new Map(
              hydrated.map((h) => [h.spotlight.commonName.toLowerCase(), h])
            );
            return prev.map(
              (entry) =>
                hydratedMap.get(entry.spotlight.commonName.toLowerCase()) ??
                entry
            );
          });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setLoadMoreError(
          err instanceof Error
            ? err.message
            : 'Unable to load more wild animals right now.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [hydrateBatch, isLoading, isLoadingMore]);

  useEffect(() => {
    loadInitialSpotlight(false);
    return () => {
      abortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, [loadInitialSpotlight]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isLoading || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && !loadMoreError) {
          loadMoreDiscoveries();
        }
      },
      { rootMargin: '320px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, isLoadingMore, error, loadMoreError, loadMoreDiscoveries]);

  return (
    <section
      aria-label="Unlimited wildlife discovery stream"
      className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-emerald-200/12 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#34D399] tabular-nums">
            <span className="font-semibold uppercase tracking-wider">
              {payload?.editionLabel || 'Fortnightly & Daily Discovery'}
            </span>
            {payload?.cadenceLabel && (
              <>
                <span aria-hidden="true" className="text-[#566B5F]">
                  ·
                </span>
                <span className="text-[#8EA397]">{payload.cadenceLabel}</span>
              </>
            )}
          </div>

          <h2 className="font-editorial mt-1.5 text-2xl font-semibold text-[#F2F7F4] sm:text-3xl">
            {payload?.themeTitle || 'Wild Frontiers & Emerald Habitats'}
          </h2>

          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#9EB3A7]">
            {payload?.themeSummary ||
              'Curated wild animal species refreshed daily and every 14 days. Scroll down to continuously discover more wildlife.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadInitialSpotlight(true)}
          disabled={isLoading}
          className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-emerald-200/16 bg-[#0D1611]/90 px-4 py-2 text-xs font-semibold text-[#F2F7F4] transition-colors hover:border-[#34D399]/70 hover:text-[#34D399] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Refresh Slate</span>
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-emerald-200/10 bg-[#0D1611]/80"
            >
              <div className="aspect-[4/3] w-full animate-pulse bg-emerald-200/8" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-40 animate-pulse rounded bg-emerald-200/10" />
                <div className="h-6 w-2/3 animate-pulse rounded bg-emerald-200/12" />
                <div className="h-3.5 w-full animate-pulse rounded bg-emerald-200/8" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-emerald-200/8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-xl border border-emerald-200/14 bg-[#0D1611]/90 p-6 text-center"
        >
          <p className="text-sm text-[#D1E0D7]">{error}</p>
          <button
            type="button"
            onClick={() => loadInitialSpotlight(false)}
            className="mt-4 min-h-[44px] rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#041E14] hover:bg-[#34D399] cursor-pointer"
          >
            Retry Discovery Slate
          </button>
        </div>
      )}

      {!isLoading && !error && enriched.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enriched.map(({ spotlight, article }, idx) => {
              const handleOpen = () => {
                if (article) {
                  onOpenArticleModal(article);
                } else {
                  onSearchSpecies(spotlight.searchQuery || spotlight.commonName);
                }
              };

              return (
                <article
                  key={`${spotlight.commonName}-${idx}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-emerald-200/12 bg-[#0D1611]/90 backdrop-blur-md transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-[#34D399]/45"
                >
                  <button
                    type="button"
                    onClick={handleOpen}
                    className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#34D399]"
                    aria-label={`Inspect ${spotlight.commonName}`}
                  >
                    <SpeciesMediaFrame
                      src={article?.imageUrl ?? null}
                      alt={spotlight.commonName}
                      title={spotlight.commonName}
                      aspectClassName="aspect-[4/3]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#8EA397]">
                        <span>{spotlight.biome}</span>
                        <span aria-hidden="true">·</span>
                        <span>{spotlight.region}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#34D399]">
                          {spotlight.conservationStatus}
                        </span>
                      </div>

                      <h3 className="font-editorial text-xl font-semibold leading-snug text-[#F2F7F4]">
                        <button
                          type="button"
                          onClick={handleOpen}
                          className="text-left transition-colors hover:text-[#34D399] cursor-pointer"
                        >
                          {spotlight.commonName}
                        </button>
                      </h3>

                      <p className="mt-0.5 text-xs italic text-[#8EA397]">
                        {spotlight.scientificName}
                      </p>

                      <p className="mt-3 text-sm leading-relaxed text-[#C5D4CB]">
                        {spotlight.hook}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-emerald-200/10 pt-4">
                      <button
                        type="button"
                        onClick={handleOpen}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Open Dossier</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSearchSpecies(
                            spotlight.searchQuery || spotlight.commonName
                          )
                        }
                        className="min-h-[44px] rounded-lg border border-emerald-200/14 px-3 py-2 text-xs font-medium text-[#C5D4CB] transition-colors hover:border-emerald-200/30 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Related Records
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div
            ref={sentinelRef}
            className="mt-10 flex flex-col items-center justify-center gap-3 text-center"
          >
            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2 text-sm text-[#9EB3A7]">
                <Loader2
                  className="h-4 w-4 animate-spin text-[#34D399]"
                  aria-hidden="true"
                />
                <span>Discovering more wild animals...</span>
              </div>
            ) : (
              <>
                {loadMoreError && (
                  <p className="text-xs text-red-300">{loadMoreError}</p>
                )}
                <button
                  type="button"
                  onClick={loadMoreDiscoveries}
                  className="min-h-[44px] rounded-lg border border-emerald-200/16 bg-[#0D1611]/90 px-5 py-2.5 text-xs font-semibold text-[#6EE7B7] transition-colors hover:border-[#34D399] hover:text-white cursor-pointer"
                >
                  Load More Wild Animals ({enriched.length} discovered)
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
