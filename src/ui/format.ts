// Textos da tela em pt-BR. Funções puras sobre o World (sem DOM).

import {
  ACTS,
  BALANCE,
  BUILDINGS,
  CLASSES,
  ROLE_NAMES,
  WOUNDS,
  floorLabel,
  heroStats,
  hourOf,
  isBossFloor,
  partyRooms,
  TICKS_PER_HOUR,
} from '../sim/index.ts';
import type { Doctrine, Hero, Party, PartyOutcome, RoomKind, World } from '../sim/index.ts';

export const fmt = (n: number): string => Math.floor(n).toLocaleString('pt-BR');
export const pct = (x: number): string => `${Math.round(x * 100)}%`;
export const clockOf = (tick: number): string => `${String(hourOf(tick)).padStart(2, '0')}h`;
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function hoursText(ticks: number): string {
  const h = Math.max(0, ticks) / TICKS_PER_HOUR;
  if (h < 1) return 'menos de 1 h';
  if (h < 48) return `${Math.round(h)} h`;
  return plural(Math.round(h / 24), 'dia', 'dias');
}

export const heroById = (world: World, id: number): Hero | undefined => world.heroes.find((h) => h.id === id);

export const className = (hero: Hero): string => CLASSES[hero.classId].name[hero.gender];

export const g = (hero: Hero, m: string, f: string): string => (hero.gender === 'm' ? m : f);

export const ROOM_LABELS: Record<RoomKind, string> = {
  matilha: 'Matilha',
  elite: 'Elite',
  bau: 'Baú',
  santuario: 'Santuário',
  vazia: 'Sala vazia',
  prisioneiro: 'Prisioneiro',
  restos: 'Restos de um herói',
  chefe: 'Chefe',
};

export const OUTCOME_LABELS: Record<PartyOutcome, string> = {
  conquista: 'Conquista',
  retirada: 'Retirada',
  chamado: 'Atendeu ao sino',
  massacre: 'Massacre',
  cansaco: 'Exaustão',
  fuga: 'Fuga',
};

export const DOCTRINES: Record<Doctrine, { name: string; text: string }> = {
  cautelosa: { name: 'Cautelosa', text: 'Desce só com folga, recua cedo e foge antes. Menos mortes, menos progresso.' },
  equilibrada: { name: 'Equilibrada', text: 'O meio-termo: arrisca quando acha que dá conta.' },
  agressiva: { name: 'Agressiva', text: 'Desce mais fundo e aguenta mais tempo. Mais saque, mais túmulos.' },
};

export function bondLabel(value: number, hero: Hero): string {
  if (value >= 60) return g(hero, 'amigo inseparável', 'amiga inseparável');
  if (value >= 30) return g(hero, 'amigo', 'amiga');
  if (value <= -40) return 'rival';
  if (value < -10) return 'desafeto';
  return 'colega';
}

/** Vida "ao vivo": em combate, a vida está na unidade, não no herói. */
export function liveHp(world: World, hero: Hero): { hp: number; max: number } {
  const max = heroStats(world, hero).maxHp;
  if (hero.status === 'expedition' && hero.partyId !== null) {
    const party = world.parties.find((p) => p.id === hero.partyId);
    const unit = party?.combat?.units.find((u) => u.heroId === hero.id);
    if (unit) return { hp: Math.max(0, unit.hp), max: unit.maxHp };
  }
  return { hp: Math.max(0, hero.hp), max };
}

export function activityText(world: World, hero: Hero): string {
  switch (hero.status) {
    case 'dead':
      return hero.death ? `Tombou no ${hero.death.where}` : 'Morto';
    case 'left':
      return 'Deixou a vila';
    case 'retired':
      return hero.retiredRole ? `${cap(ROLE_NAMES[hero.retiredRole][hero.gender])} ${ROLE_NAMES[hero.retiredRole].where}` : 'Aposentad' + g(hero, 'o', 'a');
    case 'expedition': {
      const party = world.parties.find((p) => p.id === hero.partyId);
      if (!party) return 'No abismo';
      return `${phaseText(world, party)} · ${floorLabel(party.act, party.floor)}`;
    }
    case 'town':
      break;
  }
  const a = hero.activity;
  if (!a) return 'Na praça';
  switch (a.kind) {
    case 'chegando':
      return 'Chegando à vila';
    case 'descansar':
      return world.town.buildings.estalagem >= 1 ? 'Descansando na estalagem' : 'Dormindo ao relento, na fogueira';
    case 'beber':
      return 'Bebendo na taverna';
    case 'rezar':
      return 'Rezando no templo';
    case 'comprar':
      return 'Comprando no ferreiro';
    case 'termas':
      return 'Na fonte termal';
    case 'treinar':
      return 'Treinando no campo';
    case 'tumulo': {
      const lost = hero.griefFor === null ? undefined : heroById(world, hero.griefFor);
      return lost ? `No túmulo de ${lost.name}` : 'No cemitério';
    }
    case 'socializar': {
      const other = a.targetId === undefined ? undefined : heroById(world, a.targetId);
      return other ? `Conversando com ${other.name}` : 'Conversando';
    }
    case 'vagar':
      return 'Vagando pela vila';
    case 'aguardar':
      return 'Esperando grupo no quadro';
    case 'tratar': {
      const part = hero.injury ? ` ${injuryName(hero.injury.kind)}` : ' uma lesão';
      const where = world.town.buildings.casa >= 1 ? 'na Casa de cura' : world.town.buildings.estalagem >= 1 ? 'na estalagem' : 'ao relento';
      return `Tratando${part} ${where}`;
    }
  }
}

export function phaseText(world: World, party: Party): string {
  const left = hoursText(party.phaseEndsAt - world.tick);
  switch (party.phase) {
    case 'descendo':
      return `Descendo (chega em ${left})`;
    case 'explorando': {
      const rooms = partyRooms(world, party);
      return `Explorando a sala ${Math.min(party.roomIndex + 1, rooms.length)} de ${rooms.length}`;
    }
    case 'combate': {
      const room = partyRooms(world, party)[party.roomIndex];
      return room ? `Em combate: ${ROOM_LABELS[room.kind].toLowerCase()}` : 'Em combate';
    }
    case 'voltando':
      return party.outcome === 'fuga' ? `Fugindo para a vila (${left})` : `Voltando à vila (${left})`;
  }
}

export function buildingEffects(id: keyof typeof BUILDINGS, level: number): string[] {
  const l = level;
  switch (id) {
    case 'taverna':
      return [`Recrutas por berrante: ${3 + Math.max(0, l - 1)}`, `Bebida: ${3 + l} de ouro (diversão e ânimo)`];
    case 'estalagem':
      return [`Vagas para heróis: ${6 + 4 * l}`, `Descanso recupera ${[25, 40, 55, 70][l]}% da vida`];
    case 'ferreiro':
      return l === 0 ? ['Sem ferreiro, ninguém compra equipamento'] : [`Equipamento até o tier ${4 * l}`];
    case 'templo':
      return l === 0
        ? ['Sem templo, ninguém reza (fé e luto)']
        : ['Fé, ânimo e consolo para quem está de luto', `Descanso cura +${5 * l}% a mais`, 'Quem juntou fortuna deixa ofertas no altar'];
    case 'guilda':
      return [`Grupos ao mesmo tempo: ${1 + l}`, `Tamanho do grupo: até ${l >= 2 ? 5 : 4}`, l === 0 ? 'Sem contratos nem doutrina' : `Contratos no quadro: até ${l}`];
    case 'campo':
      return l === 0 ? ['Sem campo, só se aprende descendo'] : [`Treino: ${4 * l} de ouro por sessão`, `XP por sessão: ${6 * l}% do nível`];
    case 'casa':
      return l === 0
        ? ['Sem Casa de cura, os lesionados se tratam na estalagem', `Chance de virar cicatriz: ${pct(BALANCE.scarChance)}`]
        : [`Lesões saram ${(1 + 0.5 * l).toLocaleString('pt-BR')}× mais rápido`, `Chance de virar cicatriz: ${pct(Math.max(0.05, BALANCE.scarChance - 0.1 * l))}`];
  }
}

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** "o braço", "as costelas"… */
export function injuryName(kind: keyof typeof WOUNDS): string {
  const name = WOUNDS[kind].name;
  return `${kind === 'costelas' ? 'as' : kind === 'perna' ? 'a' : 'o'} ${name}`;
}

/** "O Guardião das Urnas" no meio da frase vira "o Guardião das Urnas". */
export const midSentence = (name: string): string => name.replace(/^(O|A) /, (m) => m.toLowerCase());

export function floorName(act: number, floor: number): string {
  return isBossFloor(floor) ? `Andar ${floor + 1}: covil ${ACTS[act]!.boss.name.startsWith('A ') ? 'da' : 'do'} ${ACTS[act]!.boss.name.replace(/^(O|A) /, '')}` : `Andar ${floor + 1}`;
}
