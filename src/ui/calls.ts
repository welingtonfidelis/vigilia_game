// Chamadas do abismo (M6 F3): um aviso com "Assistir" quando um grupo chega ao guardião ou
// ao Senhor, dá de cara com uma nêmesis ou acha um encontro. Só tela: olha o mundo de tempos
// em tempos e avisa uma vez por acontecimento. O jogador escolhe no menu o que quer ouvir.

import type { Session } from '../game/session.ts';
import { floorLabel } from '../sim/index.ts';
import type { Party, World } from '../sim/index.ts';
import type { UiStore } from './store.ts';

type CallKind = 'guardiao' | 'senhor' | 'nemesis' | 'encontro';

const leaderOf = (world: World, party: Party): string => world.heroes.find((h) => h.id === party.memberIds[0])?.name ?? 'um grupo';

/** O que este grupo tem para chamar agora: chave única do acontecimento e o texto do aviso. */
function callsOf(world: World, party: Party): { kind: CallKind; key: string; text: string }[] {
  const out: { kind: CallKind; key: string; text: string }[] = [];
  const who = `o grupo de ${leaderOf(world, party)}`;
  const c = party.combat;
  if (party.phase === 'combate' && c) {
    if (c.bossMech) out.push({ kind: 'senhor', key: `${party.id}:senhor`, text: `Começou a luta contra o Senhor: ${who} está no ${floorLabel(party)}.` });
    else if (c.isBoss) out.push({ kind: 'guardiao', key: `${party.id}:guardiao:${party.floor}`, text: `${cap(who)} chegou ao guardião do ${floorLabel(party)}.` });
    const n = c.units.find((u) => u.nemesisId !== undefined && u.alive);
    if (n) out.push({ kind: 'nemesis', key: `${party.id}:nemesis:${n.nemesisId}`, text: `${n.name} apareceu para ${who} no ${floorLabel(party)}.` });
  }
  if (party.encounter && !party.encounter.advice) {
    out.push({ kind: 'encontro', key: `${party.id}:encontro:${party.floor}:${party.roomIndex}`, text: `${cap(who)} achou algo no ${floorLabel(party)} e mandou um corvo pedindo conselho.` });
  }
  return out;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function startCalls(session: Session, ui: UiStore): void {
  const seen = new Set<string>();
  let world: World | null = null;
  window.setInterval(() => {
    // Jogo carregado ou novo: o que já está acontecendo não vira aviso.
    const fresh = session.world !== world;
    world = session.world;
    if (fresh) seen.clear();
    const alive = new Set<string>();
    for (const party of world.parties) {
      for (const call of callsOf(world, party)) {
        alive.add(call.key);
        if (seen.has(call.key)) continue;
        seen.add(call.key);
        if (fresh || !ui.prefs.calls[call.kind]) continue;
        ui.toast(call.text, call.kind === 'encontro' ? 'info' : 'warn', [], party.id);
      }
    }
    // Esquece o que já passou (o mesmo grupo pode voltar a chamar noutra descida).
    for (const key of [...seen]) if (!alive.has(key)) seen.delete(key);
  }, 250);
}
