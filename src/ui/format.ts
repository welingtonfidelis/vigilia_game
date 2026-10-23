// Textos da tela em pt-BR. Funções puras sobre o World (sem DOM).

import {
  availableBiomes,
  BALANCE,
  BIOMES,
  CLASSES,
  EFFECTS,
  gradeOfLevel,
  levelTier,
  ROLE_NAMES,
  WOUNDS,
  floorLabel,
  heroStats,
  hourOf,
  isGuardianFloor,
  partyRooms,
  TICKS_PER_HOUR,
} from '../sim/index.ts';
import type { BuildingId, Doctrine, Hero, MaterialId, Party, PartyOutcome, Passage, RoomKind, World } from '../sim/index.ts';

/**
 * Número para a tela: inteiro com separador até 9.999; a partir de 10 mil, compacto
 * ("12,3 mil", "4,5 mi", "1,2 bi"), para o pós-jogo sem teto caber nos cartões.
 */
export function fmt(n: number): string {
  const v = Math.floor(n);
  const abs = Math.abs(v);
  if (!Number.isFinite(v)) return '∞';
  if (abs < 10_000) return v.toLocaleString('pt-BR');
  const [div, unit] = abs >= 1e12 ? [1e12, 'tri'] : abs >= 1e9 ? [1e9, 'bi'] : abs >= 1e6 ? [1e6, 'mi'] : [1e3, 'mil'];
  const x = v / div;
  return `${x.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(x) < 100 ? 1 : 0 })} ${unit}`;
}
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
  guardiao: 'Guardião da passagem',
  chefe: 'Senhor do abismo',
  mercador: 'Mercador errante',
  armadilha: 'Armadilha',
  encontro: 'Encontro',
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
      return `${phaseText(world, party)} · ${floorLabel(party)}`;
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
    case 'joias':
      return 'Na bancada do joalheiro';
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

/**
 * O que o prédio faz num nível, com o rendimento da conservação (`factor`, 1 = inteiro). Usa as
 * mesmas curvas da simulação: o painel mostra o de agora e o do nível seguinte.
 */
export function buildingEffects(world: World, id: BuildingId, level: number, factor = 1): string[] {
  const g = gradeOfLevel(level) * (level > 0 ? factor : 1);
  const e = level <= 0 ? 0 : Math.max(1, Math.floor(level * factor + 1e-9));
  switch (id) {
    case 'taverna':
      return [`Recrutas por berrante: ${EFFECTS.recruits(g)}`, `Bebida: ${EFFECTS.drink(g)} de ouro (diversão e ânimo)`];
    case 'estalagem':
      return [`Vagas para heróis: ${EFFECTS.heroSlots(g)}`, `Descanso recupera ${pct(EFFECTS.restHp(g))} da vida`];
    case 'ferreiro': {
      if (e === 0) return ['Sem ferreiro, ninguém compra equipamento'];
      const forge = EFFECTS.gearTier(e);
      const abyss = levelTier(world.abyss.level) + BALANCE.forgeAbyssEdge;
      return [forge > abyss ? `Equipamento até o tier ${abyss} (sabe forjar até o ${forge}, mas o abismo ainda não mostrou mais)` : `Equipamento até o tier ${forge}`];
    }
    case 'templo':
      return e === 0
        ? ['Sem templo, ninguém reza (fé e luto)']
        : ['Fé, ânimo e consolo para quem está de luto', `Descanso cura +${pct(EFFECTS.templeHeal(g))} a mais`, 'Quem juntou fortuna deixa ofertas no altar'];
    case 'guilda':
      return [
        `Grupos ao mesmo tempo: ${EFFECTS.parties(g)}`,
        `Tamanho do grupo: até ${EFFECTS.partySize(e)}`,
        e === 0 ? 'Sem contratos nem doutrina' : `Contratos no quadro: até ${Math.max(1, EFFECTS.contracts(g))}`,
      ];
    case 'campo':
      return e === 0 ? ['Sem campo, só se aprende descendo'] : [`Treino: ${EFFECTS.trainPrice(g)} de ouro por sessão`, `XP por sessão: ${pct(EFFECTS.trainXp(g))} do nível`];
    case 'casa':
      return e === 0
        ? ['Sem Casa de cura, os lesionados se tratam na estalagem', `Chance de virar cicatriz: ${pct(BALANCE.scarChance)}`]
        : [
            `Lesões saram ${EFFECTS.healSpeed(g).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× mais rápido`,
            `Chance de virar cicatriz: ${pct(EFFECTS.scarChance(g))}`,
          ];
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

/** "Andar 3: guardião" no último andar da passagem; "Andar 2" nos outros. */
export function floorName(passage: Passage, floor: number): string {
  return isGuardianFloor(passage, floor) ? `Andar ${floor + 1}: guardião da passagem` : `Andar ${floor + 1}`;
}

/** Materiais que a vila já tem ou que o nível do abismo já abriu (na ordem do estoque). */
export function knownMaterials(world: World): MaterialId[] {
  const open = new Set(availableBiomes(world.abyss.level).map((b) => BIOMES[b]!.material));
  return (Object.keys(world.town.materials) as MaterialId[]).filter((m) => world.town.materials[m] > 0 || open.has(m));
}
