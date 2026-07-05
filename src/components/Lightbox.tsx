import { useEffect } from 'react';
import { assetUrl } from '../lib/assets';

/**
 * Full-screen overlay showing one product image at its natural size. Click the
 * backdrop, the ✕, or press Esc to close. Renders nothing when there's no image.
 */
export default function Lightbox({
  src,
  alt,
  sourceUrl,
  onClose,
}: {
  src?: string;
  alt: string;
  /** Where the image / product data was sourced from, shown as a link. */
  sourceUrl?: string;
  onClose: () => void;
}) {
  const url = assetUrl(src);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`${alt} — enlarged`}
    >
      <figure className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt={alt}
          className="max-h-[82vh] max-w-full rounded-lg bg-white object-contain shadow-2xl"
        />
        {sourceUrl && (
          <figcaption>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-white"
            >
              View image source ↗
            </a>
          </figcaption>
        )}
      </figure>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-lg text-slate-700 hover:bg-white"
      >
        ✕
      </button>
    </div>
  );
}
