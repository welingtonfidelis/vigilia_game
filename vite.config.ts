import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * Versão do jogo no menu: o maior e o menor do package.json, e o último número contando os
 * commits desde a tag dessa versão (v1.0.0 e mais 5 commits → 1.0.5). Para lançar a 1.1.0:
 * subir o package.json e criar a tag v1.1.0. Sem a tag ou sem o histórico do git (cópia rasa,
 * pasta solta), fica a versão do package.json.
 */
function gameVersion(): string {
  const base = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
  try {
    const since = Number(execSync(`git rev-list --count v${base}..HEAD`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim());
    const [major, minor] = base.split('.');
    if (Number.isInteger(since)) return `${major}.${minor}.${since}`;
  } catch {
    // sem a tag ou sem git: a versão do package.json
  }
  return base;
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
