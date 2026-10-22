// Índice da arte 32-bit: lista as peças do pack que já têm par em export32/ (mesmo nome
// de arquivo, o dobro de pixels) e grava src/render/pack32.ts. Também lista todo arquivo
// de export32/ que tem par em export/ (retratos pequenos, ícones), para a interface em DOM.
// Uso: npm run pack32

import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { PACK_ASSETS } from '../src/render/pack.ts';

const ROOT = new URL('../public/assets/vigilia/', import.meta.url);
const to32 = (file: string): string => file.replace(/^export\//, 'export32/');
const has = (file: string): boolean => existsSync(new URL(file, ROOT));

const entries: [string, { file: string; lights?: string }][] = [];
for (const a of PACK_ASSETS) {
  if (!a.file?.startsWith('export/')) continue;
  const file = to32(a.file);
  if (!has(file)) continue;
  const lights = a.lights && has(to32(a.lights)) ? to32(a.lights) : undefined;
  entries.push([a.id, lights ? { file, lights } : { file }]);
}
entries.sort((a, b) => a[0].localeCompare(b[0]));

const files: string[] = [];
const walk = (dir: string): void => {
  if (!has(dir)) return;
  for (const d of readdirSync(new URL(dir, ROOT), { withFileTypes: true })) {
    const rel = `${dir}${d.name}`;
    if (d.isDirectory()) walk(`${rel}/`);
    else if (/\.png$/.test(d.name) && has(rel.replace(/^export32\//, 'export/'))) files.push(rel);
  }
};
walk('export32/');
files.sort();

const body = entries.map(([id, e]) => `  ${JSON.stringify(id)}: ${JSON.stringify(e)},`).join('\n');
const out = `// Gerado por tools/pack32.ts (npm run pack32): as peças do pack que já têm versão 32-bit.
// Não editar à mão. A peça 32-bit tem o mesmo enquadramento e o dobro de pixels da 16-bit.

export interface Pack32Entry {
  file: string;
  lights?: string;
}

export const PACK32: Record<string, Pack32Entry> = {
${body}
};

/** Todo arquivo de export32/ com par em export/ (para a interface em DOM). */
export const FILES32: ReadonlySet<string> = new Set([
${files.map((f) => `  ${JSON.stringify(f)},`).join('\n')}
]);
`;
writeFileSync(new URL('../src/render/pack32.ts', import.meta.url), out);
console.log(`${entries.length} de ${PACK_ASSETS.length} peças com versão 32-bit (${files.length} arquivos em export32/)`);
