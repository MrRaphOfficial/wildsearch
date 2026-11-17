import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  askWildlifeNaturalist,
  fetchWildlifeFieldBrief,
} from '../services/aiWildlife';
import {
  fetchFullArticleExtract,
  formatReadingTime,
} from '../services/wikipedia';
import type {
  NaturalistAnswer,
  WildlifeArticle,
  WildlifeFieldBrief,
} from '../types/wildlife';
import { SpeciesMediaFrame } from './SpeciesMediaFrame';

interface ArticleModalProps {
  article: WildlifeArticle | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (article: WildlifeArticle) => void;
}

export function ArticleModal({
  article,
  isSaved,
  onClose,
  onToggleSave,
}: ArticleModalProps) {
  const [extendedText, setExtendedText] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  const [fieldBrief, setFieldBrief] = useState<WildlifeFieldBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpAnswer, setFollowUpAnswer] =
    useState<NaturalistAnswer | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const followUpAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!article) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const controller = new AbortController();
    setExtendedText(article.fullExtract ?? null);
    setFieldBrief(null);
    setBriefError(null);
    setFollowUpInput('');
    setFollowUpAnswer(null);
    setFollowUpError(null);

    if (!article.fullExtract) {
      setIsLoadingFull(true);
      fetchFullArticleExtract(article.pageid, controller.signal)
        .then((full) => {
          if (full) {
            setExtendedText(full);
          }
        })
        .catch(() => {
          // Retain intro extract gracefully
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingFull(false);
          }
        });
    }

    setBriefLoading(true);
    fetchWildlifeFieldBrief(article, controller.signal)
      .then((brief) => {
        if (!controller.signal.aborted) {
          setFieldBrief(brief);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setBriefError(
            err instanceof Error
              ? err.message
              : 'Unable to load AI Field Dossier.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBriefLoading(false);
        }
      });

    return () => {
      controller.abort();
      followUpAbortRef.current?.abort();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [article, onClose]);

  useEffect(() => {
    setCopied(false);
  }, [article?.pageid]);

  if (!article) {
    return null;
  }

  const displayText = extendedText || article.extract;
  const paragraphs = displayText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('=='));

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(
        `${article.title}\n\n${displayText}\n\nSource: ${article.wikiUrl}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleFollowUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = followUpInput.trim();
    if (!q) return;

    followUpAbortRef.current?.abort();
    const controller = new AbortController();
    followUpAbortRef.current = controller;

    setFollowUpLoading(true);
    setFollowUpError(null);
    try {
      const answer = await askWildlifeNaturalist(
        q,
        article.title,
        controller.signal
      );
      if (!controller.signal.aborted) {
        setFollowUpAnswer(answer);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setFollowUpError(
          err instanceof Error
            ? err.message
            : 'Unable to reach AI Naturalist.'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setFollowUpLoading(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-article-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-200/16 bg-[#0B120E] shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 border-b border-emerald-200/12 px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-2 text-xs text-[#8EA397] tabular-nums">
            <span className="font-semibold text-[#34D399]">
              WildSearch Dossier
            </span>
            <span aria-hidden="true">·</span>
            <span>Wikipedia ID {article.pageid}</span>
            <span aria-hidden="true">·</span>
            <span>{formatReadingTime(displayText)}</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close article reader"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#C5D4CB] transition-colors hover:bg-emerald-200/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#34D399] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          <SpeciesMediaFrame
            src={article.imageUrl || article.originalImageUrl}
            alt={article.title}
            title={article.title}
            aspectClassName="aspect-[16/9]"
            className="mb-6 rounded-xl border border-emerald-200/12"
          />

          <h2
            id="modal-article-title"
            className="font-editorial text-2xl font-semibold leading-tight text-[#F2F7F4] sm:text-3xl"
          >
            {article.title}
          </h2>

          {article.description && (
            <p className="mt-1.5 text-sm font-medium text-[#34D399]">
              {article.description}
            </p>
          )}

          {/* AI Field Dossier Section */}
          <div className="mt-6 border-y border-emerald-200/12 py-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34D399]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Wildlife Field Brief</span>
            </div>

            {briefLoading && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="h-2.5 w-16 animate-pulse rounded bg-emerald-200/10" />
                    <div className="h-4 w-28 animate-pulse rounded bg-emerald-200/15" />
                  </div>
                ))}
              </div>
            )}

            {briefError && !briefLoading && (
              <p className="text-xs text-[#9EB3A7]">{briefError}</p>
            )}

            {fieldBrief && !briefLoading && (
              <div>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Scientific Name
                    </dt>
                    <dd className="mt-0.5 text-sm italic text-[#F2F7F4]">
                      {fieldBrief.scientificName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Conservation Status
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[#34D399]">
                      {fieldBrief.conservationStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Diet
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#F2F7F4]">
                      {fieldBrief.diet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Primary Habitat
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#F2F7F4]">
                      {fieldBrief.habitat}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Lifespan
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#F2F7F4] tabular-nums">
                      {fieldBrief.lifespan}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#7E9487]">
                      Size &amp; Weight
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#F2F7F4] tabular-nums">
                      {fieldBrief.sizeAndWeight}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-sm leading-relaxed text-[#E4EFE9]">
                  {fieldBrief.fieldNote}
                </p>

                <p className="mt-2.5 text-xs leading-relaxed text-[#9EB3A7]">
                  <span className="font-semibold text-[#F2F7F4]">
                    Key Adaptation:
                  </span>{' '}
                  {fieldBrief.adaptationHighlight}
                </p>
              </div>
            )}
          </div>

          {/* Wikipedia Encyclopedia Narrative */}
          <div className="mt-6 max-w-prose space-y-4 text-[15px] leading-relaxed text-[#D1E0D7] sm:text-base">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}

            {isLoadingFull && (
              <p className="text-xs text-[#8EA397]">
                Loading extended encyclopedia notes...
              </p>
            )}
          </div>

          {/* Ask AI Naturalist about this animal */}
          <div className="mt-7 border-t border-emerald-200/12 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F2F7F4]">
              Ask AI Naturalist about {article.title}
            </h3>

            <form
              onSubmit={handleFollowUpSubmit}
              className="mt-2.5 flex items-center gap-2"
            >
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder={`Ask about ${article.title} behavior, diet, or range...`}
                aria-label={`Ask AI Naturalist about ${article.title}`}
                className="min-h-[44px] flex-1 rounded-lg border border-emerald-200/16 bg-[#060B08] px-3.5 text-sm text-[#F2F7F4] placeholder:text-[#7E9487] focus:border-[#34D399] focus:outline-none"
              />
              <button
                type="submit"
                disabled={followUpLoading}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{followUpLoading ? 'Asking...' : 'Ask'}</span>
              </button>
            </form>

            {followUpError && (
              <p className="mt-2.5 text-xs text-red-300">{followUpError}</p>
            )}

            {followUpAnswer && !followUpLoading && (
              <div className="mt-3 rounded-lg border border-emerald-200/12 bg-[#060B08] p-4 text-sm leading-relaxed text-[#E4EFE9]">
                {followUpAnswer.answer}
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-[#8EA397]">
              Disclaimer: Field Briefs and Naturalist answers are AI-generated for educational exploration and may contain inaccuracies. Verify conservation and biological details against primary zoological records.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/12 bg-[#080E0B] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleSave(article)}
              aria-pressed={isSaved}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer ${
                isSaved
                  ? 'border-[#34D399]/55 bg-[#10B981]/18 text-[#6EE7B7]'
                  : 'border-emerald-200/16 text-[#D1E0D7] hover:border-emerald-200/30 hover:text-white'
              }`}
            >
              <Bookmark
                className="h-4 w-4"
                fill={isSaved ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span>{isSaved ? 'Saved' : 'Save Article'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-200/16 px-4 py-2 text-sm font-medium text-[#D1E0D7] transition-colors hover:border-emerald-200/30 hover:text-white focus-visible:outline-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>

          <a
            href={article.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#10B981] px-5 py-2 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0"
          >
            <span>Read full article</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
