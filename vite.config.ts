import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * Versão do jogo no menu: 0.<número de commits>.0 (39 commits → 0.39.0). Sem o
 * histórico do git (cópia rasa, pasta solta), cai na versão do package.json.
 */
function gameVersion(): string {
  try {
    const commits = Number(execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim());
    if (Number.isInteger(commits) && commits > 0) return `0.${commits}.0`;
  } catch {
    // sem git: segue para o package.json
  }
  return (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
}

const version = gameVersion();

export default defineConfig(({ command }) => ({
  // No GitHub Pages o site fica em /vigilia_game/; no dev local continua na raiz.
  base: command === 'build' ? '/vigilia_game/' : '/',
  // A UI usa JSX do Preact; o Phaser cuida só do mundo da vila.
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
}));
