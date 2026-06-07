/**
 * Resolve a repo-relative asset path (e.g. an option's `image`) to a URL that
 * works both in local dev and under the GitHub Pages base path. Files live in
 * `public/` and are served from `import.meta.env.BASE_URL`.
 */
export function assetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path; // allow absolute URLs too
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
