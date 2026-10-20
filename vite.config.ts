import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A UI usa JSX do Preact; o Phaser cuida só do mundo da vila.
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
});
