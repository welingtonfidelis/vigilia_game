import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// A versão do jogo vem do package.json e aparece no menu.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ command }) => ({
  // No GitHub Pages o site fica em /vigilia_game/; no dev local continua na raiz.
  base: command === 'build' ? '/vigilia_game/' : '/',
  // A UI usa JSX do Preact; o Phaser cuida só do mundo da vila.
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
}));
