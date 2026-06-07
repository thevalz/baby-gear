import { assetUrl } from '../lib/assets';

const SIZES = {
  sm: 'h-10 w-10',
  lg: 'h-36 w-36',
} as const;

/** Product image with a graceful 🍼 fallback when no image is set. */
export default function Thumb({
  src,
  alt,
  size = 'sm',
}: {
  src?: string;
  alt: string;
  size?: keyof typeof SIZES;
}) {
  const url = assetUrl(src);
  const box = SIZES[size];
  if (!url) {
    return (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-slate-300`}
      >
        <span className={size === 'lg' ? 'text-4xl' : 'text-xs'}>🍼</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className={`${box} shrink-0 rounded-md border border-slate-200 bg-white object-contain`}
      loading="lazy"
    />
  );
}
