// Painel da Vila: quem mora, o que sente, quem guarda e o que a última incursão levou.

import {
  BALANCE,
  BIOMES,
  BUILDINGS,
  commands,
  activeHeroes,
  citizenMood,
  expansionClearCost,
  expansionHouseCost,
  formatDate,
  heroCapacity,
  JOB_NAMES,
  JOB_ORDER,
  PET_SPECIES_NAME,
  petCoat,
  populationCap,
  threatOf,
  TICKS_PER_DAY,
} from '../../sim/index.ts';
import type { CitizenJob, Raid, World } from '../../sim/index.ts';
import { Bar, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { fmt } from '../format.ts';
import { EXPANSION_LOTS } from '../../render/layout.ts';

const OUTCOMES: Record<Raid['outcome'], string> = {
  repelido: 'Repelida',
  custoso: 'Segurada com custo',
  saque: 'Saqueada',
};

const outcomeTone: Record<Raid['outcome'], string> = {
  repelido: 'good',
  custoso: 'warn',
  saque: 'bad',
};

function RaidLine(props: { world: World; raid: Raid }) {
  const { world, raid } = props;
  const details: string[] = [`poder ${fmt(raid.power)} × defesa ${fmt(raid.defense)}`];
  for (const hit of raid.hits ?? []) {
    const name = BUILDINGS[hit.id].name.toLowerCase();
    const level = world.town.buildings[hit.id];
    details.push(hit.collapsed ? `${name} ${level === 0 ? 'em ruínas' : `caiu ao nível ${level}`}` : `${name} −${hit.damage} de conservação`);
  }
  if (raid.citizenLoss > 0) details.push(`${raid.citizenLoss} ${raid.citizenLoss === 1 ? 'morador' : 'moradores'}`);
  if (raid.goldLost > 0) details.push(`${fmt(raid.goldLost)} de ouro`);
  if (raid.injuries > 0) details.push(`${raid.injuries} ${raid.injuries === 1 ? 'ferido' : 'feridos'}`);
  return (
    <li>
      <strong class={outcomeTone[raid.outcome]}>{OUTCOMES[raid.outcome]}</strong> · {formatDate(raid.day * TICKS_PER_DAY)} · {BIOMES[raid.biome]?.name ?? 'abismo'}, nível {raid.level}
      <small>{details.join(' · ')}</small>
    </li>
  );
}

export function VillagePanel() {
  const { world } = useGame();
  const command = useCommand();
  const expansion = world.town.expansion;
  const builtHouses = expansion.houses.filter(Boolean).length;
  const mood = citizenMood(world);
  const threat = threatOf(world);
  const guards = world.citizens.filter((c) => c.job === 'guarda').length;
  const jobs = JOB_ORDER.map((job) => ({ job, n: world.citizens.filter((c) => c.job === job).length })).filter((j) => j.n > 0);
  const citizens = [...world.citizens].sort(
    (a, b) => (a.job === 'guarda' ? 0 : 1) - (b.job === 'guarda' ? 0 : 1) || a.happiness - b.happiness || a.name.localeCompare(b.name),
  );
  const raids = [...world.raids].reverse().slice(0, 3);
  const dangerous = threat.pressure >= 55;
  return (
    <PanelShell title="Vila" subtitle="Quem mora aqui, quem guarda e o que o abismo já levou.">
      <div class="stats">
        <Stat label="População" value={`${fmt(world.town.population)} / ${fmt(populationCap(world))}`} />
        <Stat label="Heróis" value={`${activeHeroes(world).length} / ${heroCapacity(world)}`} hint="Estalagem e casas do sul aumentam as vagas" />
        <Stat label="Humor" value={`${Math.round(mood)}%`} hint="O humor médio regula o imposto dos moradores" />
        <Stat label="Guardas" value={guards} hint="A milícia de moradores que defende a vila" />
        <Stat
          label="Ameaça"
          value={`${Math.round(threat.pressure)} · nível ${threat.level}`}
          hint="A pressão do abismo: acima de 55, uma incursão pode subir à noite pelas passagens abertas"
        />
        <Stat label="Incursões" value={world.metrics.raids} />
      </div>
      {dangerous && (
        <p class="tag warn">
          O abismo está inquieto: uma incursão pode subir à noite. Heróis em casa, aposentados e guardas defendem; prédios podem cair de nível.
        </p>
      )}

      <h3>Distrito Sul <span class="sub">({builtHouses}/3 casas)</span></h3>
      <p class="sub">
        A floresta ao sul esconde três lotes de moradia. Limpar a área custa {fmt(expansionClearCost(world))} de ouro; cada casa custa{' '}
        {fmt(expansionHouseCost(world))} e aumenta a capacidade da vila em {BALANCE.expansionHouseCapacity}, além de abrir {BALANCE.expansionHouseHeroSlots} vaga de herói.
      </p>
      {!expansion.cleared ? (
        <button class="btn" disabled={world.town.treasury < expansionClearCost(world)} onClick={() => command(commands.clearSouthExpansion)}>
          Limpar os lotes do sul ({fmt(expansionClearCost(world))})
        </button>
      ) : (
        <div class="expansion-lots">
          {EXPANSION_LOTS.map((_, i) => {
            const built = expansion.houses[i] === true;
            const blocked = built || world.town.treasury < expansionHouseCost(world);
            return (
              <button key={i} class={`expansion-lot${built ? ' built' : ''}`} disabled={blocked} onClick={() => command(commands.buildExpansionHouse, i)}>
                <strong>Lote {i + 1}</strong>
                <span>{built ? 'Casa construída' : `Construir casa (${fmt(expansionHouseCost(world))})`}</span>
                <small>{built ? `+${BALANCE.expansionHouseCapacity} pop · +${BALANCE.expansionHouseHeroSlots} herói` : 'Lote aberto'}</small>
              </button>
            );
          })}
        </div>
      )}

      <h3>Bichos da vila</h3>
      {(world.town.pets ?? []).length === 0 ? (
        <p class="sub">Nenhum cão ou gato por aqui agora. Logo aparece algum pelo portão.</p>
      ) : (
        <ul class="citizens">
          {(world.town.pets ?? []).map((pet) => (
            <li key={pet.id}>
              <strong>{pet.name}</strong>, {PET_SPECIES_NAME[pet.species]} {petCoat(pet)}
              <small class="sub">
                {' '}
                · chegou em {formatDate(pet.arrivedDay * TICKS_PER_DAY)} · {pet.pets === 0 ? 'ainda sem carinho' : `${pet.pets} carinho${pet.pets === 1 ? '' : 's'}`}
              </small>
            </li>
          ))}
        </ul>
      )}
      <p class="sub">Clique num bicho na vila para o prefeito fazer carinho (um por dia).</p>

      <h3>Moradores conhecidos</h3>
      <p class="sub">
        {citizens.length} rostos de {fmt(world.town.population)} moradores. Os ofícios vêm dos prédios reconstruídos; o humor decide quanto eles pagam
        de imposto e se ficam.
      </p>
      <div class="jobs">
        {jobs.map(({ job, n }) => (
          <span key={job} class="job">
            {JOB_NAMES[job as CitizenJob].m.replace(/^./, (c) => c.toUpperCase())} <b>{n}</b>
          </span>
        ))}
      </div>
      <ul class="citizens">
        {citizens.map((citizen) => (
          <li key={citizen.id} class="citizen-row">
            <span class="who">
              <strong>{citizen.name}</strong>
              <small>{JOB_NAMES[citizen.job][citizen.gender]}</small>
            </span>
            <span class="mood">
              <Bar kind="morale" value={citizen.happiness} max={100} slim />
              <small>{Math.round(citizen.happiness)}</small>
            </span>
          </li>
        ))}
      </ul>

      <h3>Incursões recentes</h3>
      {raids.length === 0 ? (
        <p class="sub">Nenhuma incursão ainda. Enquanto os grupos seguram a pressão lá embaixo, a vila dorme.</p>
      ) : (
        <ul class="raids">
          {raids.map((raid) => (
            <RaidLine key={`${raid.day}-${raid.biome}-${raid.outcome}`} world={world} raid={raid} />
          ))}
        </ul>
      )}
      <p class="sub">
        A vila nunca é perdida numa incursão: no pior caso, prédios voltam a ruínas, moradores morrem e o tesouro sangra. Reconstruir custa o de
        sempre.
      </p>
    </PanelShell>
  );
}
