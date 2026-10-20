// Histórico local dos últimos relatórios de expedição (não faz parte do save do mundo).
import type { DungeonReport } from './panels/BattlePanel.tsx';

const KEY = 'vigilia.report-history.v1';
const LIMIT = 10;

export function loadReportHistory(): DungeonReport[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is DungeonReport => !!r && typeof r === 'object' && typeof (r as { key?: unknown }).key === 'string')
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function saveReportHistory(reports: DungeonReport[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(reports.slice(0, LIMIT)));
  } catch {
    // Histórico é conveniência; se o armazenamento estiver cheio, o jogo continua.
  }
}

export function addReportToHistory(report: DungeonReport): DungeonReport[] {
  const old = loadReportHistory();
  if (old.some((r) => r.key === report.key)) return old;
  const next = [report, ...old].slice(0, LIMIT);
  saveReportHistory(next);
  return next;
}

export function clearReportHistory(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch {
    // Sem armazenamento não há histórico a limpar.
  }
}
