import { type FormEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Shuffle, Sparkles, X } from 'lucide-react';
import { QUICK_SEARCH_PROMPTS } from '../data/curatedWildlife';
import { askWildlifeNaturalist } from '../services/aiWildlife';
import type { NaturalistAnswer } from '../types/wildlife';

interface SearchHeroProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitSearch: (searchTerm: string) => void;
  onClearSearch: () => void;
  onRandomSpecies: () => void;
  isSearching: boolean;
  hasResultsOrSearched: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

type SearchMode = 'encyclopedia' | 'naturalist';

const NATURALIST_PROMPTS = [
  'Why do snow leopards have such thick, long tails?',
  'How do emperor penguins survive Antarctic blizzards?',
  'What makes the peregrine falcon the fastest animal?',
];

export function SearchHero({
  query,
  onQueryChange,
  onSubmitSearch,
  onClearSearch,
  onRandomSpecies,
  isSearching,
  hasResultsOrSearched,
  inputRef,
}: SearchHeroProps) {
  const [mode, setMode] = useState<SearchMode>('encyclopedia');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<NaturalistAnswer | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      askAbortRef.current?.abort();
    };
  }, []);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitSearch(query);
  };

  const handleAskNaturalist = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    setAiQuestion(trimmed);
    setAiLoading(true);
    setAiError(null);

    try {
      const result = await askWildlifeNaturalist(trimmed, undefined, controller.signal);
      if (!controller.signal.aborted) {
        setAiAnswer(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setAiError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the Wildlife Naturalist right now.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setAiLoading(false);
      }
    }
  };

  const handleAiSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAskNaturalist(aiQuestion);
  };

  return (
    <section
      aria-label="Wildlife search and AI naturalist"
      className={`mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 text-center transition-all duration-300 sm:px-6 ${
        hasResultsOrSearched
          ? 'pt-7 pb-5 sm:pt-10 sm:pb-6'
          : 'pt-10 pb-8 sm:pt-16 sm:pb-10'
      }`}
    >
      <p className="text-xs font-medium tracking-widest uppercase text-[#34D399]">
        Wild Animal Encyclopedia &amp; Field Guide
      </p>

      <h1 className="font-editorial mt-2.5 text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.08] tracking-tight text-[#F2F7F4]">
        Explore the Untamed World
      </h1>

      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#C5D4CB] sm:text-base">
        Search unlimited Wikipedia records on wild animals or ask the AI Wildlife Naturalist about habitats, behavior, and conservation.
      </p>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Search mode"
        className="mt-6 inline-flex items-center gap-1 rounded-lg border border-emerald-200/15 bg-[#0D1611]/90 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'encyclopedia'}
          onClick={() => setMode('encyclopedia')}
          className={`min-h-[40px] rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:text-sm ${
            mode === 'encyclopedia'
              ? 'bg-[#10B981] text-[#041E14]'
              : 'text-[#9EB3A7] hover:text-white'
          }`}
        >
          Animal Search
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'naturalist'}
          onClick={() => setMode('naturalist')}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:text-sm ${
            mode === 'naturalist'
              ? 'bg-[#10B981] text-[#041E14]'
              : 'text-[#9EB3A7] hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ask AI Naturalist</span>
        </button>
      </div>

      {mode === 'encyclopedia' ? (
        <>
          <form
            onSubmit={handleFormSubmit}
            role="search"
            className="mt-5 w-full max-w-2xl"
          >
            <div className="flex items-center rounded-xl border border-emerald-200/18 bg-[#0D1611]/90 p-1.5 backdrop-blur-md transition-colors focus-within:border-[#34D399]">
              <Search
                aria-hidden="true"
                className="ml-3 h-5 w-5 shrink-0 text-[#8EA397]"
              />

              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search wild animals (e.g. jaguar, snow leopard, blue whale)"
                aria-label="Search wild animals"
                className="min-h-[44px] w-full flex-1 bg-transparent px-3 text-base text-[#F2F7F4] placeholder:text-[#7E9487] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />

              {query.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Clear search input"
                  className="mr-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#8EA397] transition-colors hover:bg-emerald-200/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#34D399] cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSearching}
                className="min-h-[44px] rounded-lg bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-xs font-medium text-[#8EA397]">
              Featured animals:
            </span>
            {QUICK_SEARCH_PROMPTS.map((animal) => (
              <button
                key={animal}
                type="button"
                onClick={() => onSubmitSearch(animal)}
                className="min-h-[36px] rounded-lg border border-emerald-200/14 bg-[#0D1611]/75 px-3 py-1.5 text-xs font-medium text-[#D1E0D7] transition-colors hover:border-[#34D399]/60 hover:bg-[#13221A] hover:text-white focus-visible:outline-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {animal}
              </button>
            ))}

            <button
              type="button"
              onClick={onRandomSpecies}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#34D399]/40 bg-[#102018] px-3 py-1.5 text-xs font-medium text-[#6EE7B7] transition-colors hover:border-[#34D399] focus-visible:outline-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer sm:hidden"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Random</span>
            </button>
          </div>
        </>
      ) : (
        <div className="mt-5 w-full max-w-2xl text-left">
          <form onSubmit={handleAiSubmit}>
            <div className="flex items-center rounded-xl border border-emerald-200/18 bg-[#0D1611]/90 p-1.5 backdrop-blur-md transition-colors focus-within:border-[#34D399]">
              <Sparkles
                aria-hidden="true"
                className="ml-3 h-5 w-5 shrink-0 text-[#34D399]"
              />

              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask anything about wild animals, habitats, or wildlife behavior..."
                aria-label="Ask the AI Wildlife Naturalist"
                className="min-h-[44px] w-full flex-1 bg-transparent px-3 text-base text-[#F2F7F4] placeholder:text-[#7E9487] focus:outline-none"
              />

              {aiQuestion.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAiQuestion('');
                    setAiAnswer(null);
                    setAiError(null);
                  }}
                  aria-label="Clear naturalist question"
                  className="mr-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#8EA397] transition-colors hover:bg-emerald-200/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="submit"
                disabled={aiLoading}
                className="min-h-[44px] rounded-lg bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {aiLoading ? 'Thinking...' : 'Ask'}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {NATURALIST_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleAskNaturalist(sample)}
                className="min-h-[36px] rounded-lg border border-emerald-200/14 bg-[#0D1611]/75 px-3 py-1.5 text-xs text-[#C5D4CB] transition-colors hover:border-[#34D399]/60 hover:text-white cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>

          {aiError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-400/25 bg-[#1B1212]/90 p-4 text-sm text-[#E5C5C5]"
            >
              {aiError}
            </div>
          )}

          {aiAnswer && !aiLoading && (
            <div className="mt-5 rounded-xl border border-emerald-200/16 bg-[#0D1611]/94 p-5 backdrop-blur-md sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#8EA397]">
                <span className="font-medium text-[#34D399]">
                  WildSearch AI Naturalist
                </span>
                <span>
                  {aiAnswer.onTopic ? 'Animal & Wildlife Guide' : 'Animals-Only Scope'}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-[#E4EFE9] sm:text-base">
                {aiAnswer.answer}
              </p>

              {aiAnswer.suggestedSpecies.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-emerald-200/10 pt-4">
                  <span className="text-xs text-[#8EA397]">
                    Explore species:
                  </span>
                  {aiAnswer.suggestedSpecies.map((speciesName) => (
                    <button
                      key={speciesName}
                      type="button"
                      onClick={() => {
                        setMode('encyclopedia');
                        onSubmitSearch(speciesName);
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#34D399]/40 bg-[#10241A] px-3 py-1.5 text-xs font-medium text-[#6EE7B7] transition-colors hover:border-[#34D399] hover:bg-[#153022] cursor-pointer"
                    >
                      <span>{speciesName}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[11px] text-[#8EA397]">
                AI-generated educational wildlife response. Verify conservation statuses and biological facts with primary zoological sources.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
