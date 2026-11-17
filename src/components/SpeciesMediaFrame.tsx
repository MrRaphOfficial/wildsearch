import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';

interface SpeciesMediaFrameProps {
  src: string | null;
  alt: string;
  title: string;
  aspectClassName?: string;
  className?: string;
}

export function SpeciesMediaFrame({
  src,
  alt,
  title,
  aspectClassName = 'aspect-[4/3]',
  className = '',
}: SpeciesMediaFrameProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const showFallback = !src || hasError;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0D1611] ${aspectClassName} ${className}`}
    >
      {showFallback ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#10241A] via-[#0B1510] to-[#060B08] px-6 text-center">
          <Compass
            aria-hidden="true"
            className="mb-2.5 h-7 w-7 text-[#34D399]/75"
            strokeWidth={1.5}
          />
          <p className="font-editorial line-clamp-2 max-w-[24ch] text-base font-medium text-[#E4EFE9]">
            {title}
          </p>
          <span className="mt-1 text-xs text-[#8EA397]">
            Encyclopedia record without preview plate
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      )}
    </div>
  );
}
