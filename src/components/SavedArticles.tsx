import { ArrowRight, Bookmark } from 'lucide-react';
import type { WildlifeArticle } from '../types/wildlife';
import { SpeciesCard } from './SpeciesCard';

interface SavedArticlesProps {
  articles: WildlifeArticle[];
  savedIds: Set<number>;
  onOpenModal: (article: WildlifeArticle) => void;
  onToggleSave: (article: WildlifeArticle) => void;
  onClearAllSaved: () => void;
  onGoToSearch: () => void;
}

export function SavedArticles({
  articles,
  savedIds,
  onOpenModal,
  onToggleSave,
  onClearAllSaved,
  onGoToSearch,
}: SavedArticlesProps) {
  return (
    <section
      aria-label="Saved wildlife articles"
      className="mx-auto w-full max-w-[1200px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-emerald-200/12 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
            Personal Archive
          </p>
          <h1 className="font-editorial mt-1.5 text-3xl font-semibold text-[#F2F7F4] sm:text-4xl">
            Saved Field Notes
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9EB3A7] sm:text-base tabular-nums">
            {articles.length === 0
              ? 'Bookmark wild animal entries during your search to keep them here for reference.'
              : `${articles.length} ${articles.length === 1 ? 'article' : 'articles'} stored locally in your browser.`}
          </p>
        </div>

        {articles.length > 0 && (
          <button
            type="button"
            onClick={onClearAllSaved}
            className="min-h-[44px] self-start rounded-lg border border-emerald-200/16 px-4 py-2 text-xs font-medium text-[#D1E0D7] transition-colors hover:border-emerald-200/30 hover:text-white whitespace-nowrap shrink-0 cursor-pointer sm:self-auto"
          >
            Clear All Saved
          </button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="mx-auto mt-10 max-w-lg rounded-xl border border-emerald-200/12 bg-[#0D1611]/90 p-8 text-center backdrop-blur-md">
          <Bookmark
            aria-hidden="true"
            className="mx-auto mb-3 h-7 w-7 text-[#8EA397]"
          />
          <h2 className="font-editorial text-xl font-semibold text-[#F2F7F4]">
            No saved species yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#9EB3A7]">
            Search for a wild animal and select Save on any card or inside the species dossier.
          </p>
          <button
            type="button"
            onClick={onGoToSearch}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] cursor-pointer"
          >
            <span>Return to Discover</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
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
      )}
    </section>
  );
}
