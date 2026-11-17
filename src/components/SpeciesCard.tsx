import { ArrowUpRight, Bookmark } from 'lucide-react';
import { formatReadingTime } from '../services/wikipedia';
import type { WildlifeArticle } from '../types/wildlife';
import { SpeciesMediaFrame } from './SpeciesMediaFrame';

interface SpeciesCardProps {
  article: WildlifeArticle;
  isSaved: boolean;
  onOpenModal: (article: WildlifeArticle) => void;
  onToggleSave: (article: WildlifeArticle) => void;
}

export function SpeciesCard({
  article,
  isSaved,
  onOpenModal,
  onToggleSave,
}: SpeciesCardProps) {
  const readingTime = formatReadingTime(article.extract);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-emerald-200/12 bg-[#0D1611]/90 backdrop-blur-md transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-[#34D399]/45">
      <button
        type="button"
        onClick={() => onOpenModal(article)}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#34D399] cursor-pointer"
        aria-label={`Open dossier for ${article.title}`}
      >
        <SpeciesMediaFrame
          src={article.imageUrl}
          alt={article.title}
          title={article.title}
          aspectClassName="aspect-[4/3]"
        />
      </button>

      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#8EA397] tabular-nums">
            <span>Wikipedia</span>
            <span aria-hidden="true">·</span>
            <span>ID {article.pageid}</span>
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
          </div>

          <h2 className="font-editorial mb-2 text-xl font-semibold leading-snug text-[#F2F7F4]">
            <button
              type="button"
              onClick={() => onOpenModal(article)}
              className="text-left transition-colors hover:text-[#34D399] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] cursor-pointer"
            >
              {article.title}
            </button>
          </h2>

          {article.description && (
            <p className="mb-2.5 text-xs font-medium text-[#34D399]">
              {article.description}
            </p>
          )}

          <p className="line-clamp-3 text-sm leading-relaxed text-[#C5D4CB]">
            {article.extract}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-emerald-200/10 pt-4">
          <button
            type="button"
            onClick={() => onOpenModal(article)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Dossier</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(article)}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Remove ${article.title} from saved articles`
                : `Save ${article.title} for later`
            }
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer ${
              isSaved
                ? 'border-[#34D399]/55 bg-[#10B981]/18 text-[#6EE7B7]'
                : 'border-emerald-200/14 bg-transparent text-[#C5D4CB] hover:border-emerald-200/30 hover:text-white'
            }`}
          >
            <Bookmark
              className="h-4 w-4"
              fill={isSaved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
