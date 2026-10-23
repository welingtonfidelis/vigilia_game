// Painéis dos lugares da vila: prédios, berrante, quadro de contratos e cofre.

import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
import {
  activeHeroes,
  BALANCE,
  BUILDINGS,
  BUILDING_IDS,
  buildingLevel,
  canAfford,
  careFactor,
  careOf,
  effectiveLevel,
  hasSpec,
  maxBuildingLevel,
  maxContracts,
  repairCost,
  repairOf,
  upgradeBlocker,
  citizenTaxesPerDay,
  commands,
  commissionBlocker,
  commissionCost,
  ITEM_SLOTS,
  itemName,
  WORK_IDS,
  WORKS,
  workEffectLevel,
  workLevel,
  workPrice,
  itemValue,
  MATERIAL_AFFIX,
  AFFIXES,
  SPEC_DEFS,
  SPECS,
  sellPrice,
  specOf,
  upgradeGain,
  dayOf,
  DECREES,
  decreeDayCost,
  decreeEnactCost,
  DECREE_IDS,
  decreeDailyCost,
  guardCount,
  guardSalaryPerDay,
  festivalCost,
  floorLabel,
  heroCapacity,
  hornCost,
  MATERIAL_NAMES,
  maxParties,
  nextLevelCost,
  pensionPerDay,
  populationCap,
  recruitsPerHorn,
  totalBuildingLevels,
  townHeroes,
  TICKS_PER_DAY,
  openPassages,
  passageCapacity,
  passageOf,
} from '../../sim/index.ts';
import type { ActivityKind, BuildingId, Contract, Doctrine, Item, ItemSlot, LevelCost, MaterialId, SpecId, World } from '../../sim/index.ts';
import { Bar, HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { ItemCard } from '../items.tsx';
import { AmuletSection } from './AmuletPanels.tsx';
import { buildingEffects, cap, DOCTRINES, fmt, hoursText, knownMaterials, pct, plural } from '../format.ts';
import { ROLE_PLACE } from '../../render/layout.ts';

const BUILDING_ACTIVITY: Partial<Record<BuildingId, ActivityKind>> = {
  taverna: 'beber',
  estalagem: 'descansar',
  ferreiro: 'comprar',
  templo: 'rezar',
  campo: 'treinar',
  casa: 'tratar',
};

function HeroList(props: { ids: number[]; empty: string }) {
  if (props.ids.length === 0) return <p class="sub">{props.empty}</p>;
  return (
    <p class="hero-list">
      {props.ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <HeroLink id={id} />
        </span>
      ))}
    </p>
  );
}

/** Ouro e materiais de uma obra, com o que falta em vermelho. */
function CostList(props: { world: World; cost: LevelCost }) {
  const { world, cost } = props;
  const town = world.town;
  const mats = Object.entries(cost.materials ?? {}) as [MaterialId, number][];
  return (
    <ul class="cost">
      <li class={town.treasury >= cost.gold ? '' : 'bad'}>
        {fmt(cost.gold)} de ouro <span class="sub">(tem {fmt(town.treasury)})</span>
      </li>
      {mats.map(([m, q]) => (
        <li key={m} class={town.materials[m] >= q ? '' : 'bad'}>
          {fmt(q)} de {MATERIAL_NAMES[m].toLowerCase()} <span class="sub">(tem {fmt(town.materials[m])})</span>
        </li>
      ))}
    </ul>
  );
}

/** Conservação do prédio, o que ela faz no rendimento e o botão de mandar consertar (M5 F4). */
function CareSection(props: { world: World; id: BuildingId }) {
  const command = useCommand();
  const { world, id } = props;
  const care = careOf(world, id);
  const ready = repairOf(world, id);
  const cost = repairCost(world, id);
  const kind = care >= BALANCE.careWorn ? 'care' : care >= BALANCE.careBroken ? 'care-worn' : 'care-broken';
  const state =
    ready !== undefined
      ? `Em obra, com andaime: rende ${pct(BALANCE.careRepairFactor)} até o fim do conserto.`
      : care >= BALANCE.careWorn
        ? 'Inteiro: rende tudo. Perde cerca de 10 por ano; incursões, tempestades e geadas tiram mais.'
        : care >= BALANCE.careBroken
          ? `Gasto: rende ${pct(BALANCE.careWornFactor)}. Abaixo de 25 rende metade e não pode subir de nível.`
          : `Quebrado: rende ${pct(BALANCE.careBrokenFactor)} e não sobe de nível. Em 0, perde um nível.`;
  return (
    <>
      <h3>Conservação</h3>
      <Bar kind={kind} value={care} max={100} text={`${Math.floor(care)} de 100`} slim />
      <p class="sub">{state}</p>
      {ready !== undefined && <p class="tag">O conserto termina em {hoursText(ready - world.tick)}.</p>}
      {ready === undefined && cost && care < 95 && (
        <>
          <CostList world={world} cost={cost} />
          <button class="btn" disabled={!canAfford(world, cost)} onClick={() => command(commands.repair, id)}>
            Consertar ({plural(cost.days, 'dia', 'dias')} de obra)
          </button>
        </>
      )}
    </>
  );
}

/** O que muda num nível além das curvas: o caminho do 3, a bancada do 5 e o segundo caminho do 7. */
function milestoneText(world: World, id: BuildingId, next: number): string | null {
  const def = BUILDINGS[id];
  const the = `${def.gender === 'm' ? 'o' : 'a'} ${def.name.toLowerCase()}`;
  if (next === BALANCE.specLevel) return `No nível ${next} ${the} escolhe um caminho: ${SPECS[id][0].name} ou ${SPECS[id][1].name}.`;
  const spec = specOf(world, id);
  if (next === BALANCE.secondSpecLevel && spec) {
    const other = SPECS[id].find((s) => s.id !== spec)!;
    return `No nível ${next} ${the} ganha também o caminho ${other.name}: ${other.effect}`;
  }
  if (id === 'ferreiro' && next === BALANCE.benchSmithLevel) return `No nível ${next} abre a bancada do joalheiro: encantar, reforjar e polir peças.`;
  return null;
}

export function BuildingPanel(props: { id: BuildingId }) {
  const { world, ui } = useGame();
  const command = useCommand();
  const { id } = props;
  const def = BUILDINGS[id];
  const lvl = buildingLevel(world, id);
  const eff = effectiveLevel(world, id);
  const factor = careFactor(world, id);
  const top = maxBuildingLevel(world);
  const cost = nextLevelCost(world, id);
  const blocked = upgradeBlocker(world, id);
  const activity = BUILDING_ACTIVITY[id];
  const workers = world.heroes.filter((h) => h.status === 'retired' && h.retiredRole && ROLE_PLACE[h.retiredRole] === id).map((h) => h.id);
  const here = (h: ReturnType<typeof townHeroes>[number]) => h.activity?.kind === activity || (id === 'ferreiro' && h.activity?.kind === 'joias');
  const inside = [...(activity ? townHeroes(world).filter(here).map((h) => h.id) : []), ...workers];
  const affordable = cost ? canAfford(world, cost) : false;
  const spec = specOf(world, id);
  const other = spec ? SPECS[id].find((s) => s.id !== spec)! : null;
  const [specDialog, setSpecDialog] = useState<'build' | 'choose' | null>(null);
  const toSpec = lvl + 1 === BALANCE.specLevel;
  const milestone = cost ? milestoneText(world, id, lvl + 1) : null;
  const subtitle = lvl === 0 ? 'Em ruínas' : `Nível ${lvl}${Number.isFinite(top) ? ` de ${top}` : ''}${spec ? ` · ${SPEC_DEFS[spec].name}` : ''}`;
  return (
    <PanelShell title={def.name} subtitle={subtitle}>
      <p>{def.blurb}</p>
      {specDialog && <SpecDialog id={id} mode={specDialog} onClose={() => setSpecDialog(null)} />}
      <h3>Agora</h3>
      <ul class="effects">
        {buildingEffects(world, id, lvl, factor).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {lvl > 0 && <CareSection world={world} id={id} />}
      {cost && (
        <>
          <h3>{lvl === 0 ? 'Reconstruir' : `Nível ${lvl + 1}`}</h3>
          <ul class="effects next">
            {buildingEffects(world, id, lvl + 1).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {milestone && <p class="sub">{milestone}</p>}
          <CostList world={world} cost={cost} />
          <button
            class="btn primary"
            disabled={!affordable || !!blocked}
            onClick={() => (toSpec ? setSpecDialog('build') : command(commands.build, id))}
          >
            {lvl === 0 ? `Reconstruir ${def.gender === 'm' ? 'o' : 'a'} ${def.name.toLowerCase()}` : `Melhorar para o nível ${lvl + 1}`}
          </button>
          {blocked && <p class="tag warn">{blocked}</p>}
          {!blocked && !affordable && cost.materials && <p class="sub">Materiais vêm do abismo: os heróis trazem ao voltar.</p>}
        </>
      )}
      {!cost && (
        <p class="tag gold">
          {world.endedTick === null ? 'Nível máximo da campanha. Depois do chefe máximo, os prédios seguem subindo.' : 'Nível máximo.'}
        </p>
      )}
      {lvl >= BALANCE.specLevel && (
        <>
          <h3>Caminhos</h3>
          {spec && other ? (
            <>
              <p>
                <strong>{SPEC_DEFS[spec].name}.</strong> {SPEC_DEFS[spec].effect}
              </p>
              {hasSpec(world, other.id) ? (
                <p>
                  <strong>{other.name}.</strong> {other.effect}
                </p>
              ) : lvl >= BALANCE.secondSpecLevel ? (
                <p class="tag warn">O caminho {other.name} está parado: com a conservação baixa, o prédio não rende o nível {BALANCE.secondSpecLevel}.</p>
              ) : (
                <p class="sub">
                  No nível {BALANCE.secondSpecLevel}, também {other.name}: {other.effect}
                </p>
              )}
            </>
          ) : (
            <>
              <p class="sub">Ainda sem caminho escolhido.</p>
              <button class="btn primary" onClick={() => setSpecDialog('choose')}>
                Escolher a especialização
              </button>
            </>
          )}
        </>
      )}
      {id === 'ferreiro' && eff >= 2 && <ForgeOrders world={world} />}
      {id === 'ferreiro' && eff >= BALANCE.benchSmithLevel && <JewelerBench world={world} />}
      {id === 'guilda' && lvl >= 1 && <DoctrinePicker world={world} />}
      {id === 'guilda' && (
        <button class="btn" onClick={() => ui.open({ kind: 'board' })}>
          Ver o quadro de contratos
        </button>
      )}
      {activity && lvl >= 1 && (
        <>
          <h3>Aqui agora</h3>
          <HeroList ids={inside} empty="Ninguém." />
        </>
      )}
    </PanelShell>
  );
}

function DoctrinePicker(props: { world: World }) {
  const command = useCommand();
  const current = props.world.town.doctrine;
  return (
    <>
      <h3>Doutrina da guilda</h3>
      <p class="sub">Muda o quanto os grupos arriscam, quando recuam e quando cada um foge.</p>
      <div class="choices">
        {(Object.keys(DOCTRINES) as Doctrine[]).map((d) => (
          <button key={d} class={`choice${current === d ? ' active' : ''}`} aria-pressed={current === d} onClick={() => command(commands.setDoctrine, d)}>
            <strong>{DOCTRINES[d].name}</strong>
            <span>{DOCTRINES[d].text}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function HornPanel() {
  const { world, ui } = useGame();
  const command = useCommand();
  const town = world.town;
  const today = dayOf(world.tick);
  const free = town.hornUses === 0;
  const cost = free ? 0 : hornCost(world);
  const waitDays = Math.max(0, town.hornReadyDay - today);
  const roster = activeHeroes(world).length;
  const room = heroCapacity(world) - roster - town.arrivals.length;
  const count = Math.max(0, Math.min(room, recruitsPerHorn(world)));
  return (
    <PanelShell title="O berrante" subtitle="O som desce o vale e chama quem busca fortuna.">
      <div class="stats">
        <Stat label="Custo" value={free ? 'grátis' : `${fmt(cost)} de ouro`} />
        <Stat label="Responderão" value={plural(count, 'aventureiro', 'aventureiros')} />
        <Stat label="Heróis na vila" value={`${roster} / ${heroCapacity(world)}`} />
        <Stat label="A caminho" value={town.arrivals.length} />
      </div>
      {waitDays > 0 && <p class="tag">O berrante ainda ecoa: pronto em {plural(waitDays, 'dia', 'dias')}.</p>}
      {room <= 0 && (
        <p class="tag warn">
          Não há vagas. <button class="link" onClick={() => ui.open({ kind: 'building', id: 'estalagem' })}>Amplie a estalagem</button>.
        </p>
      )}
      <button
        class="btn primary big"
        disabled={waitDays > 0 || room <= 0 || town.treasury < cost}
        onClick={() => {
          if (command(commands.blowHorn)) ui.close();
        }}
      >
        Tocar o berrante
      </button>
      <p class="sub">A classe e o rank de quem vem são sorte. A reputação da vila atrai gente melhor.</p>
    </PanelShell>
  );
}

interface BoardTarget {
  /** null: abrir uma passagem nova. */
  passageId: number | null;
  floor: number;
  level: number;
  label: string;
}

/** Alvos de contrato: uma passagem nova (se a guilda tem vaga) e a fronteira de cada passagem conhecida. */
function frontier(world: World): BoardTarget[] {
  const out: BoardTarget[] = [];
  if (openPassages(world).length < passageCapacity(world)) {
    out.push({ passageId: null, floor: 0, level: world.abyss.level, label: 'abrir uma passagem nova' });
  }
  for (const p of openPassages(world)) {
    if (!p.discovered) continue;
    const f = p.conquered.findIndex((c) => !c);
    if (f >= 0) out.push({ passageId: p.id, floor: f, level: p.level, label: `conquistar o ${floorLabel({ biome: p.biome, floor: f })}` });
  }
  return out;
}

/** "conquistar o andar 2 das Catacumbas", "abrir uma passagem nova". */
function contractGoal(world: World, c: Contract): string {
  if (c.passageId === null) return 'abrir uma passagem nova';
  const p = passageOf(world, c.passageId);
  return p ? `conquistar o ${floorLabel({ biome: p.biome, floor: c.floor })}` : 'uma passagem que já se fechou';
}

export function BoardPanel() {
  const { world, ui } = useGame();
  const command = useCommand();
  const guild = maxContracts(world);
  const town = world.town;
  const targets = frontier(world);
  const [choice, setChoice] = useState(0);
  const target = targets[Math.min(choice, targets.length - 1)];
  const suggested = target ? commands.suggestedReward(target.level, target.floor) : 0;
  const [reward, setReward] = useState<number | null>(null);
  const value = reward ?? suggested;
  const waiting = townHeroes(world).filter((h) => h.activity?.kind === 'aguardar').map((h) => h.id);
  const busy = world.parties.filter((p) => p.phase !== 'voltando').length;
  return (
    <PanelShell title="Quadro de contratos" subtitle="Onde os heróis se juntam em grupos.">
      <div class="stats">
        <Stat label="Grupos no abismo" value={`${busy} / ${maxParties(world)}`} />
        <Stat label="Esperando grupo" value={waiting.length} />
      </div>
      <HeroList ids={waiting} empty="Ninguém esperando agora. Quem está descansado e animado vem para cá." />
      {guild === 0 ? (
        <p class="tag">
          Sem guilda, o quadro está quebrado: não dá para postar contratos.{' '}
          <button class="link" onClick={() => ui.open({ kind: 'building', id: 'guilda' })}>
            Reconstruir a guilda
          </button>
        </p>
      ) : (
        <>
          <h3>
            Contratos ({town.contracts.length} / {guild})
          </h3>
          {town.contracts.length === 0 && <p class="sub">Nenhum contrato postado.</p>}
          <ul class="contracts">
            {town.contracts.map((c) => (
              <li key={c.id}>
                <span>
                  {cap(contractGoal(world, c))} · <strong>{fmt(c.reward)} de ouro</strong>
                  {c.takenBy !== null && <span class="tag gold">um grupo aceitou</span>}
                </span>
                {c.takenBy === null && (
                  <button class="btn small" onClick={() => command(commands.cancelContract, c.id)}>
                    Retirar
                  </button>
                )}
              </li>
            ))}
          </ul>
          {target && town.contracts.length < guild && (
            <div class="new-contract">
              <h3>Novo contrato</h3>
              <p class="sub">A recompensa sai do tesouro agora e volta se você retirar. Os heróis aceitam se acharem que dão conta.</p>
              {targets.length > 1 && (
                <div class="row">
                  {targets.map((t, i) => (
                    <button key={i} class={`tab${i === choice ? ' active' : ''}`} onClick={() => { setChoice(i); setReward(null); }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <p>
                Alvo: <strong>{target.label}</strong>
              </p>
              <div class="row stepper">
                <button class="btn" onClick={() => setReward(Math.max(10, value - 10))} aria-label="Menos 10">
                  −10
                </button>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={value}
                  aria-label="Recompensa"
                  onInput={(e) => setReward(Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) || 0)))}
                />
                <button class="btn" onClick={() => setReward(value + 10)} aria-label="Mais 10">
                  +10
                </button>
              </div>
              <button
                class="btn primary"
                disabled={value <= 0 || town.treasury < value || town.contracts.some((c) => c.passageId === target.passageId && c.floor === target.floor)}
                onClick={() => {
                  if (command(commands.postContract, target.passageId, target.floor, value)) setReward(null);
                }}
              >
                Postar por {fmt(value)} de ouro
              </button>
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}

function Sparkline(props: { values: number[] }) {
  const v = props.values;
  if (v.length < 2) return null;
  const max = Math.max(...v, 1);
  const min = Math.min(...v, 0);
  const w = 300;
  const h = 60;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${(h - ((x - min) / (max - min || 1)) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg class="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="Tesouro nos últimos dias">
      <polyline points={pts} fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
  );
}

/** O aviso do tesouro: prédios abaixo de 50 de conservação ou em conserto, com o atalho para o painel. */
function WornBuildings(props: { world: World }) {
  const { ui } = useGame();
  const { world } = props;
  const worn = BUILDING_IDS.filter((id) => buildingLevel(world, id) > 0 && (careOf(world, id) < BALANCE.careWorn || repairOf(world, id) !== undefined));
  if (worn.length === 0) return null;
  return (
    <>
      <h3>Prédios gastos</h3>
      <ul class="effects">
        {worn.map((id) => (
          <li key={id}>
            <button class="link" onClick={() => ui.open({ kind: 'building', id })}>
              {BUILDINGS[id].name}
            </button>
            {repairOf(world, id) !== undefined ? ': em conserto' : `: conservação ${Math.floor(careOf(world, id))}, rende ${pct(careFactor(world, id))}`}
          </li>
        ))}
      </ul>
    </>
  );
}

export function CofferPanel() {
  const { world } = useGame();
  const command = useCommand();
  const town = world.town;
  const daily = world.metrics.daily.slice(-30);
  const taxes = citizenTaxesPerDay(world);
  const upkeep = totalBuildingLevels(world) * BALANCE.upkeepPerLevelPerDay;
  const pensions = pensionPerDay(world);
  const payroll = guardSalaryPerDay(world);
  const guards = guardCount(world);
  const decreeCost = decreeDailyCost(world);
  const activeDecrees = town.decrees.length;
  const net = taxes - upkeep - pensions - payroll - decreeCost;
  const festival = festivalCost(world);
  const festivalWait = town.festivalDay >= 0 ? Math.max(0, town.festivalDay + BALANCE.festivalCooldownDays - dayOf(world.tick)) : 0;
  const rates = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
  return (
    <PanelShell title="Cofre da vila" subtitle="O tesouro paga prédios, contratos, pensões e festas.">
      <div class="stats">
        <Stat label="Tesouro" value={fmt(town.treasury)} />
        <Stat label="População" value={`${fmt(town.population)} / ${fmt(populationCap(world))}`} />
        <Stat label="Impostos/dia" value={`+${taxes.toFixed(1)}`} hint="Cidadãos pagam um pouco por dia" />
        <Stat label="Manutenção/dia" value={`−${upkeep.toFixed(1)}`} hint="Cada nível de prédio custa manutenção; os consertos se pagam à parte" />
        <Stat label="Pensões/dia" value={`−${pensions.toFixed(1)}`} hint="Cada aposentado recebe uma pensão da vila" />
        <Stat label="Salários/dia" value={`−${payroll.toFixed(1)}`} hint={`${guards} guarda${guards === 1 ? '' : 's'} na milícia`} />
        <Stat label="Decretos/dia" value={`−${decreeCost.toFixed(1)}`} hint={`${activeDecrees} de ${BALANCE.maxActiveDecrees} decretos ativos`} />
        <Stat label="Saldo/dia" value={`${net >= 0 ? '+' : ''}${net.toFixed(1)}`} hint="Impostos menos manutenção, pensões, salários e decretos" />
        <Stat label="Reputação" value={Math.round(town.reputation)} hint="Atrai heróis de rank maior" />
      </div>
      <WornBuildings world={world} />
      {daily.length > 1 && (
        <>
          <h3>Tesouro nos últimos {daily.length} dias</h3>
          <Sparkline values={daily.map((d) => d.treasury)} />
        </>
      )}
      <h3>Amuleto do abismo</h3>
      <AmuletSection />
      <h3>Imposto sobre o saque: {pct(town.lootTax)}</h3>
      <p class="sub">Parte do ouro que os heróis trazem vai para o tesouro. Acima de 25%, os gananciosos perdem a confiança no prefeito.</p>
      <div class="row">
        {rates.map((r) => (
          <button key={r} class={`tab${Math.abs(town.lootTax - r) < 0.001 ? ' active' : ''}`} onClick={() => command(commands.setLootTax, r)}>
            {pct(r)}
          </button>
        ))}
      </div>
      <h3>Decretos da vila <span class="sub">({activeDecrees}/{BALANCE.maxActiveDecrees})</span></h3>
      <p class="sub">
        Políticas permanentes com custo e trade-off. Promulgar custa ouro; revogar é grátis. No máximo {BALANCE.maxActiveDecrees} ficam ativos.
      </p>
      <div class="decrees">
        {DECREE_IDS.map((id) => {
          const def = DECREES[id];
          const on = town.decrees.includes(id);
          const enact = decreeEnactCost(world, def);
          const daily = decreeDayCost(world, def);
          const blocked = !on && (activeDecrees >= BALANCE.maxActiveDecrees || town.treasury < enact);
          return (
            <button
              key={id}
              class={`decree${on ? ' active' : ''}`}
              aria-pressed={on}
              disabled={blocked}
              onClick={() => command(commands.toggleDecree, id)}
            >
              <strong>{def.name}</strong>
              <span>{def.description}</span>
              <small>{def.detail}</small>
              <em>{on ? 'Ativo · revogar' : `Promulgar · ${fmt(enact)} de ouro${daily ? ` · ${daily.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia` : ''}`}</em>
            </button>
          );
        })}
      </div>
      <h3>Festa na praça</h3>
      <p class="sub">
        Custa {fmt(festival)} de ouro (a conta cresce com a população). Em troca: ânimo, lealdade, reputação e duas almas novas na vila. O tempo
        também cura um pouco do luto.
      </p>
      {festivalWait > 0 ? (
        <p class="tag">A última festa ainda ecoa: a próxima em {plural(festivalWait, 'dia', 'dias')}.</p>
      ) : (
        <button class="btn primary" disabled={town.treasury < festival} onClick={() => command(commands.holdFestival)}>
          Fazer a festa ({fmt(festival)})
        </button>
      )}
      <p class="sub">Os heróis que juntam fortuna também deixam ofertas no templo: o ouro deles volta para a vila.</p>
      <h3>Materiais</h3>
      <div class="stats">
        {knownMaterials(world).map((m) => (
            <Stat key={m} label={MATERIAL_NAMES[m]} value={town.materials[m]} />
          ))}
      </div>
      <Arsenal world={world} />
      <PatronWall world={world} />
    </PanelShell>
  );
}

export function ThermalPanel() {
  const { world } = useGame();
  const bathers = world.heroes.filter((h) => h.status === 'town' && h.activity?.kind === 'termas').map((h) => h.id);
  return (
    <PanelShell title="Fonte termal" subtitle="A água quente que sobe do abismo.">
      <p>
        A vila tirou pedra e vapor de uma fenda quente e fez uma bacia. Não é um prédio: não tem nível nem preço. Os heróis vêm sozinhos quando
        voltam machucados, sem ânimo ou de luto.
      </p>
      <h3>O que a água faz</h3>
      <ul class="effects">
        <li>Recupera 20% da vida máxima e 12 de energia.</li>
        <li>Dá 12 de ânimo e alivia 8 de luto.</li>
        <li>Adianta meio dia de recuperação de lesão.</li>
        <li>É de graça. A vila paga com a água.</li>
      </ul>
      <h3>Na água agora</h3>
      <HeroList ids={bathers} empty="Ninguém agora. O vapor sobe sozinho." />
    </PanelShell>
  );
}

/** Diálogo do nível 3: duas especializações, escolha definitiva (dá para deixar para depois). */
function SpecDialog(props: { id: BuildingId; mode: 'build' | 'choose'; onClose: () => void }) {
  const command = useCommand();
  const def = BUILDINGS[props.id];
  const pick = (spec: SpecId): void => {
    const ok = props.mode === 'build' ? command(commands.build, props.id, spec) : command(commands.chooseSpecialization, props.id, spec);
    if (ok) props.onClose();
  };
  // Fora do painel (portal), para o diálogo ficar por cima de tudo, inclusive da navegação.
  return createPortal(
    <div class="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="spec-title">
        <header class="dialog-head">
          <p class="dialog-kicker">{def.name} · nível 3</p>
          <h2 id="spec-title">Escolha o caminho</h2>
        </header>
        <p class="event-intro">A escolha é definitiva: {def.gender === 'm' ? 'o' : 'a'} {def.name.toLowerCase()} segue por um deles para sempre.</p>
        <div class="event-choices">
          {SPECS[props.id].map((s) => (
            <button key={s.id} class="event-choice" onClick={() => pick(s.id)}>
              <strong>{s.name}</strong>
              <span>{s.effect}</span>
            </button>
          ))}
        </div>
        <div class="row">
          <button class="btn" onClick={props.onClose}>
            Agora não
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

const ORDER_SLOT_LABEL: Record<ItemSlot, string> = { weapon: 'Arma', armor: 'Armadura', amulet: 'Amuleto' };

/** Encomendas no ferreiro: encaixe, material e raridade; a fila mostra quando cada uma fica pronta. */
function ForgeOrders(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const town = world.town;
  const [slot, setSlot] = useState<ItemSlot>('weapon');
  const materials = knownMaterials(world);
  const [material, setMaterial] = useState<MaterialId>(materials[0] ?? 'ossos');
  const epicBlocked = commissionBlocker(world, slot, 'epica');
  const [epic, setEpic] = useState(false);
  const rarity = epic && !epicBlocked ? 'epica' : 'rara';
  const cost = commissionCost(world, slot, rarity);
  const blocked = commissionBlocker(world, slot, rarity);
  const short = town.treasury < cost.gold ? 'ouro' : town.materials[material] < cost.material ? 'material' : null;
  const affixes = MATERIAL_AFFIX[material].map((a) => AFFIXES[a].effect).join(' ou ');
  return (
    <>
      <h3>Encomendas</h3>
      <p class="sub">
        O prefeito paga com o tesouro e o material do abismo; a peça sai com o tier mais alto da forja e cai no cofre da vila, de onde vai de presente para um
        herói.
      </p>
      <div class="seg">
        {ITEM_SLOTS.map((s) => (
          <button key={s} class={`btn small${slot === s ? ' active' : ''}`} onClick={() => setSlot(s)} aria-pressed={slot === s}>
            {ORDER_SLOT_LABEL[s]}
          </button>
        ))}
      </div>
      <div class="seg">
        {materials.map((m) => (
          <button key={m} class={`btn small${material === m ? ' active' : ''}`} onClick={() => setMaterial(m)} aria-pressed={material === m}>
            {MATERIAL_NAMES[m]} ({town.materials[m]})
          </button>
        ))}
      </div>
      <div class="seg">
        <button class={`btn small${!epic ? ' active' : ''}`} onClick={() => setEpic(false)} aria-pressed={!epic}>
          Rara
        </button>
        <button class={`btn small${epic ? ' active' : ''}`} onClick={() => setEpic(true)} aria-pressed={epic} disabled={!!epicBlocked && epicBlocked.startsWith('Peças')}>
          Épica
        </button>
      </div>
      <p class="sub">
        {slot === 'amulet' ? 'Amuleto' : `Tier ${cost.tier}`} · {rarity === 'epica' ? 'dois afixos' : 'um afixo'}: {affixes}
        {rarity === 'epica' ? ' e mais um sorteado' : ''}. Custa {fmt(cost.gold)} de ouro e {cost.material} de {MATERIAL_NAMES[material].toLowerCase()}; fica pronta em{' '}
        {cost.days} dias.
      </p>
      {epic && epicBlocked && <p class="sub">{epicBlocked}</p>}
      <button class="btn primary" disabled={!!blocked || !!short} onClick={() => command(commands.commission, slot, material, rarity)}>
        Encomendar
      </button>
      {!blocked && short && <p class="sub">Falta {short === 'ouro' ? 'ouro no tesouro' : MATERIAL_NAMES[material].toLowerCase()}.</p>}
      {blocked && <p class="sub">{blocked}</p>}
      {town.forge.length > 0 && (
        <ul class="effects">
          {town.forge.map((o) => {
            const days = Math.max(1, Math.ceil((o.readyTick - world.tick) / TICKS_PER_DAY));
            return (
              <li key={o.id}>
                {ORDER_SLOT_LABEL[o.slot]} {o.rarity === 'epica' ? 'épica' : 'rara'} de {MATERIAL_NAMES[o.material].toLowerCase()} · pronta em {days}{' '}
                {days === 1 ? 'dia' : 'dias'}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Peças sem dono guardadas no cofre: presentear a um herói na vila ou vender. */
function Arsenal(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const items = [...world.town.arsenal].sort((a, b) => itemValue(b) - itemValue(a));
  const heroes = townHeroes(world);
  return (
    <>
      <h3>
        Arsenal <span class="sub">({items.length}/{BALANCE.arsenalMax})</span>
      </h3>
      {items.length === 0 ? (
        <p class="sub">Vazio. Peças achadas que ninguém quis, deixadas por quem trocou de equipamento ou encomendadas na forja ficam aqui.</p>
      ) : (
        items.map((item) => <ArsenalItem key={item.id} world={world} item={item} heroes={heroes} onGift={(heroId) => command(commands.giftItem, item.id, heroId)} onSell={() => command(commands.sellItem, item.id)} />)
      )}
    </>
  );
}

function ArsenalItem(props: { world: World; item: Item; heroes: ReturnType<typeof townHeroes>; onGift: (heroId: number) => void; onSell: () => void }) {
  const { world, item } = props;
  // Quem mais ganha com a peça aparece primeiro na lista.
  const ranked = [...props.heroes].sort((a, b) => upgradeGain(b, item) - upgradeGain(a, item));
  const [heroId, setHeroId] = useState<number | null>(ranked[0]?.id ?? null);
  const chosen = ranked.find((h) => h.id === heroId) ?? ranked[0];
  return (
    <ItemCard world={world} item={item} classId={chosen?.classId ?? null}>
      <span class="item-actions">
        {ranked.length > 0 ? (
          <>
            <select value={chosen?.id ?? ''} onChange={(e) => setHeroId(Number((e.target as HTMLSelectElement).value))} aria-label="Para quem">
              {ranked.map((h) => {
                const gain = upgradeGain(h, item);
                return (
                  <option key={h.id} value={h.id}>
                    {h.name} {gain > 0 ? `(+${gain.toFixed(1)})` : '(não melhora)'}
                  </option>
                );
              })}
            </select>
            <button class="btn small primary" disabled={!chosen} onClick={() => chosen && props.onGift(chosen.id)} title="Custa 1 de energia do prefeito">
              Entregar
            </button>
          </>
        ) : (
          <small class="sub">Nenhum herói na vila agora.</small>
        )}
        <button class="btn small" onClick={props.onSell}>
          Vender (+{fmt(sellPrice(item))})
        </button>
      </span>
    </ItemCard>
  );
}

const BENCH_VERB: Record<'encantar' | 'reforjar' | 'polir', string> = { encantar: 'encantou', reforjar: 'reforjou', polir: 'poliu' };

/** A bancada do joalheiro: o que custa e quem passou por ela (o ouro é dos heróis). */
function JewelerBench(props: { world: World }) {
  const { world } = props;
  const visits = [...(world.town.bench ?? [])].reverse();
  return (
    <>
      <h3>Bancada do joalheiro</h3>
      <p class="sub">
        Heróis com ouro sobrando vêm por conta própria e pagam do próprio bolso: <strong>encantar</strong> põe mais um afixo numa peça rara ou épica (
        {fmt(BALANCE.benchEnchantBase)} + {fmt(BALANCE.benchEnchantPerTier)} por tier), <strong>reforjar</strong> troca um afixo que não serve à classe (metade) e{' '}
        <strong>polir</strong> sobe o tier de uma lendária ({fmt(BALANCE.benchPolishPrice)}). A forja fica com {pct(BALANCE.benchTreasuryShare)} do valor.
      </p>
      {visits.length === 0 ? (
        <p class="sub">Ninguém passou pela bancada ainda.</p>
      ) : (
        <ul class="effects">
          {visits.map((v, i) => {
            const hero = world.heroes.find((h) => h.id === v.heroId);
            const item = hero ? Object.values(hero.items ?? {}).find((it) => it?.id === v.itemId) : undefined;
            const days = Math.floor((world.tick - v.tick) / TICKS_PER_DAY);
            return (
              <li key={i}>
                <HeroLink id={v.heroId} /> {BENCH_VERB[v.service]} {item && hero ? itemName(item, hero.classId).toLowerCase() : 'uma peça'} por {fmt(v.price)} de ouro ·{' '}
                {days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Mural dos mecenas: as obras que os heróis pagaram, o efeito de agora e quem pagou. */
function PatronWall(props: { world: World }) {
  const { world } = props;
  const any = WORK_IDS.some((id) => workLevel(world, id) > 0);
  return (
    <>
      <h3>Mural dos mecenas</h3>
      <p class="sub">
        Heróis com mais de {fmt(BALANCE.patronGold)} de ouro e o equipamento em dia pagam obras na vila com o próprio dinheiro. O efeito cresce até o nível{' '}
        {BALANCE.workEffectCap}; depois, cada nível é só o nome gravado.
      </p>
      <ul class="effects">
        {WORK_IDS.map((id) => {
          const def = WORKS[id];
          const lvl = workLevel(world, id);
          const eff = workEffectLevel(world, id);
          const patrons = [...new Set((world.town.works?.[id]?.patrons ?? []).map((p) => p.heroId))];
          return (
            <li key={id}>
              <strong>
                {def.name} {def.place}
              </strong>{' '}
              · nível {lvl}
              {eff > 0 ? ` (${def.effect}, ×${eff})` : ` (${def.effect} por nível)`} · próximo nível: {fmt(workPrice(world, id))} de ouro
              {patrons.length > 0 && (
                <>
                  {' '}
                  · pago por{' '}
                  {patrons.map((heroId, i) => (
                    <span key={heroId}>
                      {i > 0 && ', '}
                      <HeroLink id={heroId} />
                    </span>
                  ))}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!any && <p class="sub">Nenhuma obra ainda: os heróis ainda estão gastando com o próprio equipamento.</p>}
    </>
  );
}
