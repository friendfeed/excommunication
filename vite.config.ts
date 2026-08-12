import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works under any GitHub Pages project path
// (https://<user>.github.io/<repo>/) without needing to hardcode the repo name.
export default defineConfig({
  plugins: [react()],
  base: './',
});
