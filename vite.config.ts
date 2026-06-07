import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Set SINGLEFILE=1 to bundle everything into one self-contained dist/index.html
// (openable directly in a browser with no server) — e.g. `npm run build:single`.
const singleFile = process.env.SINGLEFILE === '1';

// The app is deployed to GitHub Pages at https://<owner>.github.io/family/, so
// production assets must be served from the "/family/" base. The single-file
// build uses a relative base so it still opens straight from the filesystem.
// Override with VITE_BASE if the repo is ever renamed or served elsewhere.
const base = singleFile ? './' : process.env.VITE_BASE ?? '/family/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
});
