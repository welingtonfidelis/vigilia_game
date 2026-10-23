// Amuleto e Senhores (M5 F2): fragmentos, montagem pelo joalheiro, o contrato do Senhor
// com a escolha do grupo e a tela de quando um Senhor cai.

import { useState } from 'preact/hooks';
import { BALANCE, BIOMES, commands, dayOf, formatDate, lordCandidates, lordConfidence, lordOf, maxPartySize, TICKS_PER_DAY, TICKS_PER_HOUR, yearOf } from '../../sim/index.ts';
import type { World } from '../../sim/index.ts';
import { Bar, HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { className, fmt } from '../format.ts';

/** "O grupo acha que dá conta", "Arriscado"… pela confiança estimada. */
function confidenceText(conf: number): { text: string; tone: string } {
  if (conf >= 1.2) return { text: 'O grupo acha que dá conta.', tone: 'good' };
  if (conf >= 0.9) return { text: 'Arriscado: pode dar certo, pode não dar.', tone: 'warn' };
  return { text: 'Muito arriscado: a guilda não recomenda.', tone: 'bad' };
}

function waitText(world: World, readyTick: number): string {
  const hours = Math.max(1, Math.ceil((readyTick - world.tick) / TICKS_PER_HOUR));
  return hours >= 24 ? `${Math.ceil(hours / 24)} ${Math.ceil(hours / 24) === 1 ? 'dia' : 'dias'}` : `${hours} h`;
}

/** Fragmentos, montagem e o contrato do Senhor do nível atual. */
export function AmuletSection() {
  const { world, ui } = useGame();
  const command = useCommand();
  const abyss = world.abyss;
  const amulet = abyss.amulet;
  const lord = lordOf(amulet?.level ?? abyss.level);
  const need = BALANCE.fragmentsPerAmulet;
  const cost = commands.amuletCostFor(world, abyss.level);
  const fragmentPrice = commands.fragmentPriceFor(world);
  const max = maxPartySize(world);
  const candidates = lordCandidates(world);
  const [picked, setPicked] = useState<number[] | null>(null);
  const chosen = (picked ?? candidates.slice(0, max).map((h) => h.id)).filter((id) => candidates.some((h) => h.id === id));
  const team = candidates.filter((h) => chosen.includes(h.id));
  const lair = world.parties.find((p) => p.lord !== undefined);
  const toggle = (id: number) => {
    const now = chosen.includes(id) ? chosen.filter((x) => x !== id) : chosen.length < max ? [...chosen, id] : chosen;
    setPicked(now);
  };
  return (
    <div class="amulet">
      <p>
        <strong>{lord.name}</strong> guarda o nível {amulet?.level ?? abyss.level} do abismo, no covil {BIOMES[lord.biome]!.of}.
        {lord.final ? ' É o chefe máximo: vencê-lo fecha a campanha.' : ''}
      </p>
      {!amulet && (
        <>
          <label>
            Fragmentos do nível {abyss.level}: {abyss.fragments} de {need}
          </label>
          <Bar kind="xp" value={Math.min(abyss.fragments, need)} max={need} text={`${abyss.fragments}/${need}`} slim />
          <p class="sub">
            Os fragmentos aparecem de vez em quando nas lutas e nas voltas triunfais, só nas passagens do nível atual. Quem morre com um
            fragmento deixa ele com os restos.
          </p>
          <button
            class="btn primary"
            disabled={abyss.fragments < need || world.town.treasury < cost}
            onClick={() => command(commands.forgeAmulet)}
            title={abyss.fragments < need ? `Faltam ${need - abyss.fragments} fragmentos` : undefined}
          >
            Montar o amuleto ({fmt(cost)} de ouro)
          </button>
          {abyss.fragments < need && (
            <>
              <p class="sub">
                Mercadores do abismo vendem fragmentos ao joalheiro, cada vez mais caro: no máximo {BALANCE.fragmentBuyMax} por nível, e os outros
                vêm das lutas. Comprados neste nível: {abyss.bought} de {BALANCE.fragmentBuyMax}.
              </p>
              <button
                class="btn"
                disabled={fragmentPrice === null || world.town.treasury < fragmentPrice}
                onClick={() => command(commands.buyFragment)}
              >
                {fragmentPrice === null ? 'Os mercadores não têm mais fragmentos deste nível' : `Comprar um fragmento (${fmt(fragmentPrice)} de ouro)`}
              </button>
            </>
          )}
        </>
      )}
      {amulet && world.tick < amulet.readyTick && <p class="tag">O joalheiro termina o amuleto em {waitText(world, amulet.readyTick)}.</p>}
      {amulet && amulet.inUse && lair && (
        <div class="row">
          <p class="tag gold">Um grupo desceu com o amuleto ao covil.</p>
          <button class="btn small" onClick={() => ui.open({ kind: 'battle', partyId: lair.id })}>
            Acompanhar
          </button>
        </div>
      )}
      {amulet && !amulet.inUse && world.tick >= amulet.readyTick && (
        <>
          <h3>Contrato do Senhor</h3>
          <p class="sub">
            A guilda propõe os {max} mais fortes que estão na vila, com um tanque e um curandeiro quando há; troque quem quiser. O Senhor nunca
            luta igual: cada desafio traz afixos novos. Se o grupo cair, fugir ou recuar, o amuleto se desfaz, e os mortos ficam no covil, sem
            resgate.
          </p>
          <ul class="lord-team">
            {candidates.slice(0, Math.max(max + 4, 8)).map((h) => (
              <li key={h.id}>
                <label>
                  <input type="checkbox" checked={chosen.includes(h.id)} onChange={() => toggle(h.id)} disabled={!chosen.includes(h.id) && chosen.length >= max} />{' '}
                  <HeroLink id={h.id} /> <small>
                    {className(h)} {h.rank} · nível {h.level}
                  </small>
                </label>
              </li>
            ))}
          </ul>
          {team.length > 0 && (
            <p class={`tag ${confidenceText(lordConfidence(world, team, amulet.level)).tone}`}>{confidenceText(lordConfidence(world, team, amulet.level)).text}</p>
          )}
          <button class="btn primary" disabled={team.length === 0} onClick={() => command(commands.challengeLord, chosen) && setPicked(null)}>
            Mandar {team.length === 1 ? 'o herói' : `os ${team.length}`} ao covil
          </button>
        </>
      )}
      <LordHistory world={world} />
    </div>
  );
}

function LordHistory(props: { world: World }) {
  const kills = props.world.metrics.bossKills;
  if (kills.length === 0) return null;
  return (
    <>
      <h3>Senhores vencidos</h3>
      <ul class="effects">
        {kills.map((k) => (
          <li key={k.level}>
            Nível {k.level}: {lordOf(k.level).name} · ano {yearOf(k.day)}
          </li>
        ))}
      </ul>
    </>
  );
}

export function AmuletPanel() {
  const { world } = useGame();
  return (
    <PanelShell title="Amuleto do abismo" subtitle={`Nível ${world.abyss.level} · ${world.metrics.bossKills.length} Senhores vencidos`}>
      <AmuletSection />
    </PanelShell>
  );
}

/** Um Senhor caiu: o abismo desce um nível. */
export function LordEndPanel(props: { level: number }) {
  const { world, session, ui } = useGame();
  const lord = lordOf(props.level);
  const next = lordOf(props.level + 1);
  const kill = world.metrics.bossKills.find((k) => k.level === props.level);
  const deaths = world.heroes.filter((h) => h.status === 'dead').length;
  return (
    <PanelShell title={`${lord.name} caiu`} subtitle={`Nível ${props.level} do abismo · ${kill ? formatDate(kill.day * TICKS_PER_DAY) : formatDate(world.tick)}`}>
      <p>
        O amuleto se cumpriu. O abismo desce ao <strong>nível {props.level + 1}</strong>: as passagens novas abrem mais fundo, os monstros
        ficam mais fortes e os fragmentos passam a ser do nível novo.
      </p>
      <div class="stats">
        <Stat label="Próximo Senhor" value={next.name} />
        <Stat label="Heróis caídos até aqui" value={fmt(deaths)} />
        <Stat label="Ano" value={kill ? yearOf(kill.day) : yearOf(dayOf(world.tick))} />
      </div>
      <div class="row">
        <button
          class="btn primary big"
          onClick={() => {
            session.setPaused(false);
            ui.close();
          }}
        >
          Continuar
        </button>
        <button class="btn" onClick={() => ui.open({ kind: 'chronicle' })}>
          Ler a crônica
        </button>
      </div>
    </PanelShell>
  );
}
