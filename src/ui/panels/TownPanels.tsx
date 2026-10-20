// Painéis dos lugares da vila: prédios, berrante, quadro de contratos e cofre.

import { useState } from 'preact/hooks';
import {
  activeHeroes,
  BALANCE,
  BUILDINGS,
  buildingLevel,
  canAfford,
  citizenTaxesPerDay,
  commands,
  dayOf,
  DECREES,
  DECREE_IDS,
  decreeDailyCost,
  guardCount,
  guardSalaryPerDay,
  festivalCost,
  floorLabel,
  heroCapacity,
  hornCost,
  MATERIAL_NAMES,
  MAX_BUILDING_LEVEL,
  maxParties,
  nextLevelCost,
  pensionPerDay,
  populationCap,
  recruitsPerHorn,
  totalBuildingLevels,
  townHeroes,
} from '../../sim/index.ts';
import type { ActivityKind, BuildingId, Doctrine, MaterialId, World } from '../../sim/index.ts';
import { HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { buildingEffects, DOCTRINES, fmt, pct, plural } from '../format.ts';
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

function Cost(props: { world: World; id: BuildingId }) {
  const cost = nextLevelCost(props.world, props.id);
  if (!cost) return null;
  const town = props.world.town;
  const mats = Object.entries(cost.materials ?? {}) as [MaterialId, number][];
  return (
    <ul class="cost">
      <li class={town.treasury >= cost.gold ? '' : 'bad'}>
        {fmt(cost.gold)} de ouro <span class="sub">(tem {fmt(town.treasury)})</span>
      </li>
      {mats.map(([m, q]) => (
        <li key={m} class={town.materials[m] >= q ? '' : 'bad'}>
          {q} de {MATERIAL_NAMES[m].toLowerCase()} <span class="sub">(tem {town.materials[m]})</span>
        </li>
      ))}
    </ul>
  );
}

export function BuildingPanel(props: { id: BuildingId }) {
  const { world, ui } = useGame();
  const command = useCommand();
  const { id } = props;
  const def = BUILDINGS[id];
  const lvl = buildingLevel(world, id);
  const cost = nextLevelCost(world, id);
  const activity = BUILDING_ACTIVITY[id];
  const workers = world.heroes.filter((h) => h.status === 'retired' && h.retiredRole && ROLE_PLACE[h.retiredRole] === id).map((h) => h.id);
  const inside = [...(activity ? townHeroes(world).filter((h) => h.activity?.kind === activity).map((h) => h.id) : []), ...workers];
  const affordable = cost ? canAfford(world, cost) : false;
  return (
    <PanelShell title={def.name} subtitle={lvl === 0 ? 'Em ruínas' : `Nível ${lvl} de ${MAX_BUILDING_LEVEL}`}>
      <p>{def.blurb}</p>
      <h3>Agora</h3>
      <ul class="effects">
        {buildingEffects(id, lvl).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {cost && (
        <>
          <h3>{lvl === 0 ? 'Reconstruir' : `Nível ${lvl + 1}`}</h3>
          <ul class="effects next">
            {buildingEffects(id, lvl + 1).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Cost world={world} id={id} />
          <button class="btn primary" disabled={!affordable} onClick={() => command(commands.build, id)}>
            {lvl === 0 ? `Reconstruir ${def.gender === 'm' ? 'o' : 'a'} ${def.name.toLowerCase()}` : `Melhorar para o nível ${lvl + 1}`}
          </button>
          {!affordable && cost.materials && <p class="sub">Materiais vêm do abismo: os heróis trazem ao voltar.</p>}
        </>
      )}
      {!cost && <p class="tag gold">Nível máximo.</p>}
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

function frontier(world: World): { act: number; floor: number }[] {
  const out: { act: number; floor: number }[] = [];
  world.acts.forEach((act, a) => {
    if (!act.unlocked) return;
    const f = act.conquered.findIndex((c) => !c);
    if (f >= 0) out.push({ act: a, floor: f });
  });
  return out;
}

export function BoardPanel() {
  const { world, ui } = useGame();
  const command = useCommand();
  const guild = buildingLevel(world, 'guilda');
  const town = world.town;
  const targets = frontier(world);
  const [choice, setChoice] = useState(0);
  const target = targets[Math.min(choice, targets.length - 1)];
  const suggested = target ? commands.suggestedReward(target.act, target.floor) : 0;
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
                  Conquistar o {floorLabel(c.act, c.floor)} · <strong>{fmt(c.reward)} de ouro</strong>
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
                      {floorLabel(t.act, t.floor)}
                    </button>
                  ))}
                </div>
              )}
              <p>
                Alvo: <strong>{floorLabel(target.act, target.floor)}</strong>
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
                disabled={value <= 0 || town.treasury < value || town.contracts.some((c) => c.act === target.act && c.floor === target.floor)}
                onClick={() => {
                  if (command(commands.postContract, target.act, target.floor, value)) setReward(null);
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
        <Stat label="Manutenção/dia" value={`−${upkeep.toFixed(1)}`} hint="Cada nível de prédio custa manutenção" />
        <Stat label="Pensões/dia" value={`−${pensions.toFixed(1)}`} hint="Cada aposentado recebe uma pensão da vila" />
        <Stat label="Salários/dia" value={`−${payroll.toFixed(1)}`} hint={`${guards} guarda${guards === 1 ? '' : 's'} na milícia`} />
        <Stat label="Decretos/dia" value={`−${decreeCost.toFixed(1)}`} hint={`${activeDecrees} de ${BALANCE.maxActiveDecrees} decretos ativos`} />
        <Stat label="Saldo/dia" value={`${net >= 0 ? '+' : ''}${net.toFixed(1)}`} hint="Impostos menos manutenção, pensões, salários e decretos" />
        <Stat label="Reputação" value={Math.round(town.reputation)} hint="Atrai heróis de rank maior" />
      </div>
      {daily.length > 1 && (
        <>
          <h3>Tesouro nos últimos {daily.length} dias</h3>
          <Sparkline values={daily.map((d) => d.treasury)} />
        </>
      )}
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
          const blocked = !on && (activeDecrees >= BALANCE.maxActiveDecrees || town.treasury < def.enactCost);
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
              <em>{on ? 'Ativo · revogar' : `Promulgar · ${def.enactCost} de ouro${def.dailyCost ? ` · ${def.dailyCost}/dia` : ''}`}</em>
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
        {(Object.keys(town.materials) as MaterialId[])
          .filter((m, i) => town.materials[m] > 0 || world.acts[i]?.unlocked)
          .map((m) => (
            <Stat key={m} label={MATERIAL_NAMES[m]} value={town.materials[m]} />
          ))}
      </div>
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
