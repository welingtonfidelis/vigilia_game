import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PFX } from '../src/render/lane/pfx-index.ts';

const ROOT = new URL('../public/assets/vigilia/', import.meta.url);

/** Largura e altura do PNG, lidas do cabeçalho. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(new URL(file, ROOT));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('efeitos do pixelfx no corredor', () => {
  it('cada folha existe e cabe todos os quadros do índice', () => {
    for (const [id, s] of Object.entries(PFX)) {
      expect(existsSync(new URL(s.file, ROOT)), id).toBe(true);
      const [w, h] = pngSize(s.file);
      const rows = Math.ceil(s.frames / s.cols);
      expect(w, id).toBeGreaterThanOrEqual(s.cols * s.frame[0]);
      expect(h, id).toBeGreaterThanOrEqual(rows * s.frame[1]);
      expect(s.frames, id).toBeGreaterThan(0);
      expect(s.fps, id).toBeGreaterThan(0);
    }
  });

  it('a licença MIT e os créditos do pixelfx vão junto das folhas', () => {
    expect(existsSync(new URL('pfx/LICENSE-pixelfx.txt', ROOT))).toBe(true);
    expect(existsSync(new URL('pfx/NOTICE-pixelfx.md', ROOT))).toBe(true);
  });
});
