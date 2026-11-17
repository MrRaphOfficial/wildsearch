import type { ActiveView } from '../types/wildlife';

interface HeaderProps {
  activeView: ActiveView;
  savedCount: number;
  onNavigate: (view: ActiveView) => void;
  onRandomSpecies: () => void;
  isSearching: boolean;
}

const NAV_ITEMS: { id: ActiveView; label: string }[] = [
  { id: 'search', label: 'Discover' },
  { id: 'featured', label: 'Biome Atlas' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'saved', label: 'Saved' },
];

export function Header({
  activeView,
  savedCount,
  onNavigate,
  onRandomSpecies,
  isSearching,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-200/10 bg-[#060B08]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6 sm:py-3.5">
        {/* Zone 1: Single-line Brand Wordmark with jade rectangular frame */}
        <button
          type="button"
          onClick={() => onNavigate('search')}
          className="inline-flex items-center gap-2.5 font-editorial text-xl font-semibold tracking-tight text-[#F2F7F4] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="inline-block h-5 w-3.5 border-[2.5px] border-[#10B981]"
          />
          <span>WildSearch</span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-3 overflow-x-auto sm:gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const displayLabel =
              item.id === 'saved' && savedCount > 0
                ? `${item.label} (${savedCount})`
                : item.label;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34D399] sm:text-sm ${
                  isActive
                    ? 'text-white'
                    : 'text-[#9EB3A7] hover:text-white'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#10B981]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="hidden sm:flex items-center shrink-0">
          <button
            type="button"
            onClick={onRandomSpecies}
            disabled={isSearching}
            className="min-h-[40px] rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#041E14] transition-colors hover:bg-[#34D399] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Random Animal
          </button>
        </div>
      </div>
    </header>
  );
}
