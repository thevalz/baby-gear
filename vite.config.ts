import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Set SINGLEFILE=1 to bundle everything into one self-contained dist/index.html
// (openable directly in a browser with no server) — e.g. `npm run build:single`.
const singleFile = process.env.SINGLEFILE === '1';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
});
