# Product images

Product images live here and ship with the repo (no external hotlinking). A
sourcing session downloads each product's image into this folder and points the
option's `image` field at it.

## Conventions

- **Filename:** use the option's `id` from `src/data/seed.json`, e.g.
  `nuna-pipa-aire-rx.jpg`, `cybex-aton-g.webp`.
- **Format:** `.jpg`/`.png`/`.webp`. Prefer a clean product shot on a white or
  transparent background.
- **Size:** roughly 400–800 px on the long edge — large enough to look sharp,
  small enough to keep the repo light. Optimize/compress before committing.
- **Reference:** set the option's `image` to the repo-relative path
  `"images/<id>.<ext>"` (no leading slash). The app resolves it through the
  GitHub Pages base path automatically (see `src/lib/assets.ts`).

Files in `public/` are copied verbatim into the build output, so the path the
app uses at runtime is `<base>/images/<id>.<ext>`.
