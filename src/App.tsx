import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BACKDROP_SLIDES, CURATED_SPECIES } from './data/curatedWildlife';
import { searchWikipediaWildlife } from './services/wikipedia';
import type { ActiveView, WildlifeArticle } from './types/wildlife';
import { ArticleModal } from './components/ArticleModal';
import { BackdropGallery } from './components/BackdropGallery';
import { BackgroundSlideshow } from './components/BackgroundSlideshow';
import { DiscoverySection } from './components/DiscoverySection';
import { FeaturedAtlas } from './components/FeaturedAtlas';
import { Header } from './components/Header';
import { ResultsSection } from './components/ResultsSection';
import { SavedArticles } from './components/SavedArticles';
import { SearchHero } from './components/SearchHero';

const SAVED_STORAGE_KEY = 'wildsearch.saved.articles.v1';

function loadSavedArticles(): WildlifeArticle[] {
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('search');
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<WildlifeArticle[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDurationMs, setSearchDurationMs] = useState<number | null>(null);

  const [selectedArticle, setSelectedArticle] =
    useState<WildlifeArticle | null>(null);

  const [savedArticles, setSavedArticles] = useState<WildlifeArticle[]>(() =>
    loadSavedArticles()
  );

  const [slideIndex, setSlideIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_STORAGE_KEY,
        JSON.stringify(savedArticles)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [savedArticles]);

  const savedIds = useMemo(
    () => new Set(savedArticles.map((item) => item.pageid)),
    [savedArticles]
  );

  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % BACKDROP_SLIDES.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isAutoPlay]);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if (selectedArticle) return;
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault();
        setActiveView('search');
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedArticle]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, []);

  const executeSearch = useCallback(async (rawTerm: string) => {
    const trimmed = rawTerm.trim();
    if (!trimmed) {
      setSearchError(null);
      setActiveQuery('');
      setResults([]);
      setNextOffset(null);
      searchInputRef.current?.focus();
      return;
    }

    abortControllerRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setActiveView('search');
    setQueryInput(trimmed);
    setActiveQuery(trimmed);
    setIsSearching(true);
    setIsLoadingMore(false);
    setSearchError(null);
    setNextOffset(null);

    const startedAt = performance.now();

    try {
      const response = await searchWikipediaWildlife(
        trimmed,
        controller.signal,
        0,
        15
      );
      if (controller.signal.aborted) return;
      setResults(response.articles);
      setNextOffset(response.nextOffset);
      setSearchDurationMs(Math.max(1, Math.round(performance.now() - startedAt)));
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error
          ? err.message
          : 'A network error occurred while querying Wikipedia.';
      setSearchError(message);
      setResults([]);
      setNextOffset(null);
      setSearchDurationMs(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  const loadMoreSearchResults = useCallback(async () => {
    if (!activeQuery || nextOffset === null || isSearching || isLoadingMore) {
      return;
    }

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    setIsLoadingMore(true);

    try {
      const response = await searchWikipediaWildlife(
        activeQuery,
        controller.signal,
        nextOffset,
        15
      );
      if (controller.signal.aborted) return;

      setResults((prev) => {
        const existingIds = new Set(prev.map((a) => a.pageid));
        const uniqueNext = response.articles.filter(
          (a) => !existingIds.has(a.pageid)
        );
        return [...prev, ...uniqueNext];
      });
      setNextOffset(response.nextOffset);
    } catch {
      // Preserve existing results on transient scroll error
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [activeQuery, isLoadingMore, isSearching, nextOffset]);

  const handleClearSearch = useCallback(() => {
    abortControllerRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    setQueryInput('');
    setActiveQuery('');
    setResults([]);
    setNextOffset(null);
    setSearchError(null);
    setSearchDurationMs(null);
    setIsSearching(false);
    setIsLoadingMore(false);
    searchInputRef.current?.focus();
  }, []);

  const handleRandomSpecies = useCallback(() => {
    const candidates = CURATED_SPECIES.filter(
      (s) => s.searchQuery.toLowerCase() !== activeQuery.toLowerCase()
    );
    const pool = candidates.length > 0 ? candidates : CURATED_SPECIES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    executeSearch(pick.searchQuery);
  }, [activeQuery, executeSearch]);

  const handleToggleSave = useCallback((article: WildlifeArticle) => {
    setSavedArticles((prev) => {
      const exists = prev.some((item) => item.pageid === article.pageid);
      if (exists) {
        return prev.filter((item) => item.pageid !== article.pageid);
      }
      return [article, ...prev];
    });
  }, []);

  const handleNavigate = useCallback((view: ActiveView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectBackdropSlide = useCallback((index: number) => {
    setSlideIndex(index);
    setIsAutoPlay(false);
  }, []);

  const hasSearchState = Boolean(activeQuery || isSearching || searchError);

  return (
    <div className="relative flex min-h-screen flex-col text-[#F2F7F4]">
      <BackgroundSlideshow
        slides={BACKDROP_SLIDES}
        activeIndex={slideIndex}
        onSelectSpecies={executeSearch}
      />

      <Header
        activeView={activeView}
        savedCount={savedArticles.length}
        onNavigate={handleNavigate}
        onRandomSpecies={handleRandomSpecies}
        isSearching={isSearching}
      />

      <main className="relative z-10 flex-1">
        {activeView === 'search' && (
          <>
            <SearchHero
              query={queryInput}
              onQueryChange={setQueryInput}
              onSubmitSearch={executeSearch}
              onClearSearch={handleClearSearch}
              onRandomSpecies={handleRandomSpecies}
              isSearching={isSearching}
              hasResultsOrSearched={hasSearchState}
              inputRef={searchInputRef}
            />

            {hasSearchState ? (
              <ResultsSection
                activeQuery={activeQuery}
                results={results}
                isLoading={isSearching}
                isLoadingMore={isLoadingMore}
                hasMore={nextOffset !== null}
                error={searchError}
                searchDurationMs={searchDurationMs}
                savedIds={savedIds}
                onOpenModal={setSelectedArticle}
                onToggleSave={handleToggleSave}
                onLoadMore={loadMoreSearchResults}
                onRetry={() => executeSearch(activeQuery)}
                onClearResults={handleClearSearch}
              />
            ) : (
              <DiscoverySection
                onOpenArticleModal={setSelectedArticle}
                onSearchSpecies={executeSearch}
              />
            )}
          </>
        )}

        {activeView === 'featured' && (
          <FeaturedAtlas
            savedIds={savedIds}
            onOpenModal={setSelectedArticle}
            onToggleSave={handleToggleSave}
          />
        )}

        {activeView === 'gallery' && (
          <BackdropGallery
            slides={BACKDROP_SLIDES}
            activeSlideIndex={slideIndex}
            isAutoPlay={isAutoPlay}
            onSelectSlide={handleSelectBackdropSlide}
            onToggleAutoPlay={() => setIsAutoPlay((prev) => !prev)}
            onSearchSpecies={executeSearch}
          />
        )}

        {activeView === 'saved' && (
          <SavedArticles
            articles={savedArticles}
            savedIds={savedIds}
            onOpenModal={setSelectedArticle}
            onToggleSave={handleToggleSave}
            onClearAllSaved={() => setSavedArticles([])}
            onGoToSearch={() => handleNavigate('search')}
          />
        )}
      </main>

      <footer className="relative z-10 border-t border-emerald-200/12 bg-[#060B08]/88 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-200/10 pb-4 text-xs text-[#9EB3A7]">
            <p className="font-medium text-[#F2F7F4]">
              WildSearch · Built by{' '}
              <span className="font-semibold text-[#34D399]">
                @MrRaphOfficial
              </span>
            </p>
            <p className="hidden sm:block">
              Press{' '}
              <kbd className="rounded border border-emerald-200/18 px-1.5 py-0.5 font-mono text-[11px] text-[#E4EFE9]">
                /
              </kbd>{' '}
              to focus animal search
            </p>
          </div>

          <p className="mt-4 max-w-4xl text-xs leading-relaxed text-[#8EA397]">
            <strong className="font-semibold text-[#C5D4CB]">Disclaimer:</strong>{' '}
            WildSearch is an independent wildlife encyclopedia and educational discovery website. It is not affiliated with, endorsed by, or sponsored by National Geographic Partners LLC or Nat Geo Wild. Live encyclopedia summaries and photography are retrieved from Wikipedia, while daily &amp; fortnightly discovery slates, Field Briefs, and Wildlife Naturalist Q&amp;A responses are generated by AI for educational purposes and should be verified against authoritative zoological references.
          </p>
        </div>
      </footer>

      <ArticleModal
        article={selectedArticle}
        isSaved={selectedArticle ? savedIds.has(selectedArticle.pageid) : false}
        onClose={() => setSelectedArticle(null)}
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}
