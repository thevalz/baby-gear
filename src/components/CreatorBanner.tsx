import { useStore } from '../lib/store';

/**
 * Top-of-page creator branding: the influencer's name, tagline, and the CTAs
 * that turn this tool into a traffic engine for their channel — "Watch reviews"
 * and "Subscribe". This is what makes the advisor *theirs* and worth embedding
 * under their videos. A "Retake quiz" link lets a visitor re-personalize.
 */
export default function CreatorBanner({ onRetake }: { onRetake: () => void }) {
  const creator = useStore((s) => s.config.creator);
  if (!creator) return null;

  const subscribe = creator.subscribeUrl ?? creator.youtubeUrl;

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden>▶</span>
            <span className="truncate">{creator.name}</span>
          </div>
          {creator.tagline && <p className="mt-0.5 text-sm text-indigo-100">{creator.tagline}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRetake}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
          >
            Retake quiz
          </button>
          {creator.youtubeUrl && (
            <a
              href={creator.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
            >
              ▶ Watch reviews
            </a>
          )}
          {subscribe && (
            <a
              href={subscribe}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Subscribe
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
