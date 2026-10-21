import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  // No GitHub Pages o site fica em /vigilia_game/; no dev local continua na raiz.
  base: command === 'build' ? '/vigilia_game/' : '/',
  // A UI usa JSX do Preact; o Phaser cuida só do mundo da vila.
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
}));
