import { Check, Search } from 'lucide-react';
import type { BackdropSlide } from '../types/wildlife';

interface BackdropGalleryProps {
  slides: BackdropSlide[];
  activeSlideIndex: number;
  isAutoPlay: boolean;
  onSelectSlide: (index: number) => void;
  onToggleAutoPlay: () => void;
  onSearchSpecies: (query: string) => void;
}

export function BackdropGallery({
  slides,
  activeSlideIndex,
  isAutoPlay,
  onSelectSlide,
  onToggleAutoPlay,
  onSearchSpecies,
}: BackdropGalleryProps) {
  return (
    <section
      aria-label="Field photography gallery"
      className="mx-auto w-full max-w-[1200px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-emerald-200/12 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#34D399]">
            Documentary Plates
          </p>
          <h1 className="font-editorial mt-1.5 text-3xl font-semibold text-[#F2F7F4] sm:text-4xl">
            Field Photography Gallery
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9EB3A7] sm:text-base">
            Pin any wildlife plate as your ambient backdrop or search its full species dossier.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleAutoPlay}
          aria-pressed={isAutoPlay}
          className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-emerald-200/16 bg-[#0D1611]/90 px-4 py-2 text-xs font-medium text-[#D1E0D7] transition-colors hover:border-[#34D399]/60 hover:text-white whitespace-nowrap shrink-0 cursor-pointer sm:self-auto"
        >
          <span>
            {isAutoPlay ? 'Pause Slideshow Rotation' : 'Resume Slideshow Rotation'}
          </span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {slides.map((slide, index) => {
          const isCurrent = index === activeSlideIndex;

          return (
            <article
              key={slide.id}
              className="group overflow-hidden rounded-xl border border-emerald-200/12 bg-[#0D1611]/90 backdrop-blur-md"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-[#101C16]">
                <img
                  src={slide.imagePath}
                  alt={slide.alt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                />
              </div>

              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <div className="text-xs text-[#8EA397] tabular-nums">
                    <span>Plate {String(index + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true" className="mx-1.5">
                      ·
                    </span>
                    <span>{slide.location}</span>
                  </div>

                  <h2 className="font-editorial mt-1 text-xl font-semibold text-[#F2F7F4]">
                    {slide.species}
                  </h2>
                  <p className="text-xs italic text-[#34D399]">
                    {slide.scientificName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectSlide(index)}
                    aria-pressed={isCurrent}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'border-[#34D399]/55 bg-[#10B981]/18 text-[#6EE7B7]'
                        : 'border-emerald-200/14 text-[#D1E0D7] hover:border-emerald-200/30 hover:text-white'
                    }`}
                  >
                    {isCurrent && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{isCurrent ? 'Active Backdrop' : 'Set Backdrop'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSearchSpecies(slide.searchQuery)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#10B981] px-3.5 py-2 text-xs font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Explore</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
