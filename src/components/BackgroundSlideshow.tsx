import type { BackdropSlide } from '../types/wildlife';

interface BackgroundSlideshowProps {
  slides: BackdropSlide[];
  activeIndex: number;
  onSelectSpecies: (query: string) => void;
}

export function BackgroundSlideshow({
  slides,
  activeIndex,
  onSelectSpecies,
}: BackgroundSlideshowProps) {
  const currentSlide = slides[activeIndex] ?? slides[0];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#060B08] pointer-events-none">
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <img
            key={slide.id}
            src={slide.imagePath}
            alt={slide.alt}
            referrerPolicy="no-referrer"
            loading={index === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out will-change-[opacity] ${
              isActive ? 'opacity-40' : 'opacity-0'
            }`}
          />
        );
      })}

      {/* Deep forest-obsidian scrim ensuring >= 4.5:1 WCAG AA legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#060B08]/84 via-[#060B08]/68 to-[#060B08]/96"
      />

      {currentSlide && (
        <div className="pointer-events-auto fixed bottom-4 right-5 z-10 hidden lg:block">
          <button
            type="button"
            onClick={() => onSelectSpecies(currentSlide.searchQuery)}
            className="text-xs text-[#9EB3A7]/85 transition-colors hover:text-[#34D399] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34D399] cursor-pointer"
          >
            {currentSlide.species}
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span className="italic">{currentSlide.scientificName}</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            {currentSlide.location}
          </button>
        </div>
      )}
    </div>
  );
}
