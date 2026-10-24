// Salão das Lendas (M6 F5): o bestiário que se abre com o que a guilda vê e abate, as casas das
// famílias com a árvore e os feitos, os troféus (Senhores e nêmesis caídas) e as estátuas da
// frente do prédio. Só consulta, fora renomear uma casa e fixar uma estátua.

import { useState } from 'preact/hooks';
import { BIOME_LORE, LEGENDARY_LORE, LORD_LORE, MONSTER_LORE, MYSTERY_LORE, RULE_LORE } from '../../data/codex.ts';
import { HOUSE_DEEDS } from '../../data/houses.ts';
import { MONSTERS } from '../../render/assets.ts';
import {
  allItems,
  BALANCE,
  biomePageComplete,
  BIOMES,
  childAge,
  className,
  codexOf,
  codexProgress,
  commands,
  dayOf,
  DIM_RULE_IDS,
  DIM_RULES,
  generations,
  hallLevel,
  hallStatues,
  houseAge,
  houseById,
  houseMembers,
  housesOf,
  LEGENDARY_TITLES,
  legendsOf,
  lordOf,
  lordSlayers,
  monsterStage,
  pedestalsOf,
  yearOf,
} from '../../sim/index.ts';
import type { BiomeDef, Hero, House, World } from '../../sim/index.ts';
import { HeroLink, PanelShell, useCommand, useGame } from '../components.tsx';
import { Crest } from '../Crest.tsx';
import { plural } from '../format.ts';
import { MonsterPortrait, MonsterSprite } from '../PixelSprite.tsx';
import type { HallTab } from '../store.ts';

const TABS: [HallTab, string][] = [
  ['codex', 'Bestiário'],
  ['houses', 'Casas'],
  ['trophies', 'Troféus'],
  ['statues', 'Estátuas'],
];

export function HallPanel(props: { tab?: HallTab; houseId?: number }) {
  const { world } = useGame();
  const [tab, setTab] = useState<HallTab>(props.tab ?? 'codex');
  const legends = legendsOf(world);
  const level = hallLevel(world);
  const next = level === 1 ? BALANCE.hallLevel2Legends : level === 2 ? BALANCE.hallLevel3Legends : null;
  return (
    <PanelShell
      title="Salão das Lendas"
      subtitle={`Nível ${level} · ${plural(legends.total, 'lenda', 'lendas')}${next !== null ? ` (o nível ${level + 1} vem com ${next})` : ''}. Cada Senhor vencido, página completa do bestiário e feito de casa conta uma.`}
      wide
    >
      <div class="row tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'codex' && <CodexTab world={world} />}
      {tab === 'houses' && <HousesTab world={world} initial={props.houseId ?? null} />}
      {tab === 'trophies' && <TrophiesTab world={world} />}
      {tab === 'statues' && <StatuesTab world={world} />}
    </PanelShell>
  );
}

// ── Bestiário ──────────────────────────────────────────────────────────────

const UNKNOWN = '???';

function CodexTab(props: { world: World }) {
  const codex = codexOf(props.world);
  const progress = codexProgress(codex);
  return (
    <>
      <p class="sub">
        {progress.open} de {progress.total} entradas abertas. O monstro mostra o hábito com {BALANCE.codexHabitKills} abates e a história com {BALANCE.codexStoryKills}; o Senhor guarda o segredo para quem o vence sem baixas.
      </p>
      <h3>Lugares do abismo</h3>
      {BIOMES.map((b, i) => (
        <BiomeEntry key={i} world={props.world} biome={b} index={i} />
      ))}
      <h3>Regras das dimensões</h3>
      <ul class="codex-list">
        {DIM_RULE_IDS.map((id) =>
          codex.rules.includes(id) ? (
            <li key={id}>
              <strong>{DIM_RULES[id].name}</strong> <span class="muted">· {DIM_RULES[id].blurb}</span>
              <p>{RULE_LORE[id]}</p>
            </li>
          ) : (
            <li key={id} class="locked">
              {UNKNOWN}
            </li>
          ),
        )}
      </ul>
      <h3>Lendárias</h3>
      <ul class="codex-list">
        {LEGENDARY_TITLES.map((t) =>
          codex.legendaries.includes(t) ? (
            <li key={t}>
              <strong>{t}</strong>
              <p>{LEGENDARY_LORE[t]}</p>
            </li>
          ) : (
            <li key={t} class="locked">
              {UNKNOWN}
            </li>
          ),
        )}
      </ul>
      <h3>Mistérios</h3>
      <ul class="codex-list">
        {MYSTERY_LORE.map((m) =>
          codex.mysteries.includes(m.id) ? (
            <li key={m.id}>
              <strong>{m.name}</strong>
              <p>{m.text}</p>
            </li>
          ) : (
            <li key={m.id} class="locked">
              {UNKNOWN}
            </li>
          ),
        )}
      </ul>
    </>
  );
}

function BiomeEntry(props: { world: World; biome: BiomeDef; index: number }) {
  const codex = codexOf(props.world);
  const { biome, index } = props;
  const known = codex.biomes.includes(index);
  const complete = biomePageComplete(codex, index);
  const opened = biome.enemies.filter((e) => monsterStage(codex, e.id) >= 3).length + ((codex.lords[biome.boss.id] ?? 0) >= 2 ? 1 : 0);
  return (
    <details class={`codex-biome${known ? '' : ' locked'}`}>
      <summary>
        <strong>{known ? biome.name : UNKNOWN}</strong>
        {known && <span class={`tag${complete ? ' gold' : ''}`}>{complete ? 'página completa' : `${opened}/4`}</span>}
      </summary>
      {known ? <p class="codex-lore">{BIOME_LORE[index]}</p> : <p class="sub">Um lugar onde a guilda ainda não desceu.</p>}
      <div class="codex-cards">
        {biome.enemies.map((e) => {
          const stage = monsterStage(codex, e.id);
          const kills = codex.monsters[e.id] ?? 0;
          const lore = MONSTER_LORE[e.id];
          const asset = MONSTERS[e.id]?.asset;
          return (
            <div key={e.id} class={`codex-card stage-${stage}`}>
              <span class="codex-art">
                <CodexArt asset={asset} stage={stage} boss={false} />
              </span>
              <div>
                <strong>{stage > 0 ? e.name : UNKNOWN}</strong>
                {stage > 0 && (
                  <small class="muted">
                    {' '}
                    · {plural(kills, 'abate', 'abates')}
                    {stage < 3 && ` (${stage < 2 ? BALANCE.codexHabitKills : BALANCE.codexStoryKills} para o próximo passo)`}
                  </small>
                )}
                {stage >= 2 && (
                  <p class="muted">
                    Vida {e.hp} · ataque {e.atk} · defesa {e.def}
                    {e.tags.includes('swarm') ? ' · em bando' : ''}
                    {e.tags.includes('backline') ? ' · ataca de trás' : ''}
                  </p>
                )}
                {stage >= 2 && lore && <p>{lore.habit}</p>}
                {stage >= 3 && lore && <p class="codex-lore">{lore.story}</p>}
              </div>
            </div>
          );
        })}
        <LordCard world={props.world} biome={biome} />
      </div>
    </details>
  );
}

/** Só visto: a sombra do sprite (o retrato tem fundo). Com o hábito aberto, o retrato. */
function CodexArt(props: { asset: string | undefined; stage: number; boss: boolean }) {
  if (props.stage === 0 || !props.asset) return <b>?</b>;
  if (props.stage === 1) return <MonsterSprite asset={props.asset} boss={props.boss} animate={false} scale={props.boss ? 0.75 : 2} />;
  return <MonsterPortrait asset={props.asset} />;
}

function LordCard(props: { world: World; biome: BiomeDef }) {
  const codex = codexOf(props.world);
  const boss = props.biome.boss;
  const stage = codex.lords[boss.id] ?? 0;
  const lore = LORD_LORE[boss.id];
  const asset = MONSTERS[boss.id]?.asset;
  const level = Array.from({ length: 10 }, (_, i) => i + 1).find((l) => lordOf(l).id === boss.id);
  return (
    <div class={`codex-card lord stage-${stage}`}>
      <span class="codex-art">
        <CodexArt asset={asset} stage={stage} boss />
      </span>
      <div>
        <strong>{stage > 0 ? boss.name : UNKNOWN}</strong> <small class="muted">· Senhor do nível {level}</small>
        {stage >= 1 && lore && <p>{lore.seen}</p>}
        {stage >= 2 && lore && <p>{lore.defeated}</p>}
        {stage >= 3 && lore && <p class="codex-lore">{lore.flawless}</p>}
        {stage === 2 && <p class="sub">Vencer sem perder ninguém abre o resto da história.</p>}
      </div>
    </div>
  );
}

// ── Casas ──────────────────────────────────────────────────────────────────

function HousesTab(props: { world: World; initial: number | null }) {
  const [open, setOpen] = useState<number | null>(props.initial);
  const house = houseById(props.world, open);
  if (house) return <HouseDetail world={props.world} house={house} onBack={() => setOpen(null)} />;
  const houses = [...housesOf(props.world)].sort((a, b) => b.deeds.length - a.deeds.length || a.foundedTick - b.foundedTick);
  if (houses.length === 0) return <p class="sub">Nenhuma casa ainda. Quem casa e tem filho funda uma, e os filhos herdam o nome.</p>;
  return (
    <ul class="house-list">
      {houses.map((h) => {
        const members = houseMembers(props.world, h);
        const alive = members.filter((m) => m.status !== 'dead' && m.status !== 'left').length;
        return (
          <li key={h.id}>
            <button class="house-row" onClick={() => setOpen(h.id)}>
              <Crest house={h} size={34} />
              <span>
                <strong>Casa {h.name}</strong>
                <small class="muted">
                  {' '}
                  · fundada no ano {yearOf(dayOf(h.foundedTick))} · {plural(members.length, 'herói', 'heróis')} ({plural(alive, 'vivo', 'vivos')})
                </small>
                {h.deeds.length > 0 && (
                  <span class="house-deeds">
                    {h.deeds.map((d) => (
                      <span key={d.id} class="tag gold">
                        {HOUSE_DEEDS[d.id].name}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function HouseDetail(props: { world: World; house: House; onBack: () => void }) {
  const { world, house } = props;
  const command = useCommand();
  const [name, setName] = useState(house.name);
  const members = houseMembers(world, house);
  const gen = generations(world, house);
  const maxGen = Math.max(1, ...gen.values());
  const kids = world.children.filter((c) => c.houseId === house.id);
  const founders = house.founders.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h);
  const ids = new Set(members.map((m) => m.id));
  // As peças que passaram de mão em mão dentro da casa.
  const heirlooms = allItems(world).filter((i) => i.owners.filter((o) => ids.has(o)).length >= 2);
  return (
    <>
      <button class="btn small" onClick={props.onBack}>
        ‹ Todas as casas
      </button>
      <div class="house-head">
        <Crest house={house} size={64} />
        <div>
          <h3>Casa {house.name}</h3>
          <p class="sub">
            Fundada no ano {yearOf(dayOf(house.foundedTick))} por{' '}
            {founders.map((f, i) => (
              <span key={f.id}>
                {i > 0 && ' e '}
                <HeroLink id={f.id} cross />
              </span>
            ))}
            . {plural(houseAge(world, house), 'ano', 'anos')} de casa.
          </p>
          <form
            class="row"
            onSubmit={(e) => {
              e.preventDefault();
              command(commands.renameHouse, house.id, name);
            }}
          >
            <input class="house-name" value={name} maxLength={24} onInput={(e) => setName((e.target as HTMLInputElement).value)} aria-label="Nome da casa" />
            <button class="btn small" type="submit" disabled={name.trim() === house.name}>
              Trocar o nome
            </button>
          </form>
        </div>
      </div>
      <h3>Feitos da casa</h3>
      <ul class="codex-list">
        {(Object.keys(HOUSE_DEEDS) as (keyof typeof HOUSE_DEEDS)[]).map((id) => {
          const done = house.deeds.find((d) => d.id === id);
          return (
            <li key={id} class={done ? '' : 'locked'}>
              <strong>{HOUSE_DEEDS[id].name}</strong>
              <span class="muted"> · {done ? `ano ${yearOf(dayOf(done.tick))}` : 'ainda não'}</span>
              <p>{HOUSE_DEEDS[id].text}</p>
            </li>
          );
        })}
      </ul>
      <p class="sub">Cada feito dá reputação à vila; o primeiro ergue o estandarte da casa no Salão.</p>
      <h3>Árvore da família</h3>
      {Array.from({ length: maxGen }, (_, i) => i + 1).map((n) => {
        const row = members.filter((m) => gen.get(m.id) === n);
        if (row.length === 0) return null;
        return (
          <div key={n} class="house-gen">
            <small class="muted">{n}ª geração</small>
            <ul class="bonds">
              {row.map((m) => (
                <li key={m.id}>
                  <HeroLink id={m.id} cross />
                  <span class="muted">
                    {className(m)} · nível {m.level}
                    {m.status === 'retired' ? ' · aposentad' + (m.gender === 'f' ? 'a' : 'o') : ''}
                    {m.status === 'left' ? ' · partiu' : ''}
                    {m.status === 'dead' && m.death ? ` · caiu no ano ${yearOf(dayOf(m.death.tick))}` : ''}
                    {m.deeds.some((d) => d.kind === 'chefe') ? ' · Mata-Senhor' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {kids.length > 0 && (
        <div class="house-gen">
          <small class="muted">Crianças</small>
          <ul class="bonds">
            {kids.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <span class="muted">{plural(childAge(world, c), 'ano', 'anos')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {heirlooms.length > 0 && (
        <>
          <h3>Peças de família</h3>
          <ul class="codex-list">
            {heirlooms.map((item) => (
              <li key={item.id}>
                <strong>{item.title ?? (item.slot === 'weapon' ? 'Arma' : item.slot === 'armor' ? 'Armadura' : 'Amuleto')}</strong>
                <p class="muted">
                  {item.owners
                    .filter((o) => ids.has(o))
                    .map((o, i) => (
                      <span key={`${o}-${i}`}>
                        {i > 0 && ' → '}
                        <HeroLink id={o} cross />
                      </span>
                    ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ── Troféus ────────────────────────────────────────────────────────────────

function TrophiesTab(props: { world: World }) {
  const { world } = props;
  const kills = [...world.metrics.bossKills].reverse();
  const fallen = (world.abyss.nemeses ?? []).filter((n) => n.fallen).reverse();
  const slayerOf = new Map(lordSlayers(world).map((s) => [`${s.level}:${s.day}`, s.hero.id]));
  return (
    <>
      <h3>Senhores vencidos</h3>
      {kills.length === 0 ? (
        <p class="sub">Nenhum Senhor caiu ainda.</p>
      ) : (
        <ul class="codex-list">
          {kills.map((k, i) => {
            const slayer = k.slayerId ?? slayerOf.get(`${k.level}:${k.day}`);
            return (
              <li key={i}>
                <strong>{lordOf(k.level).name}</strong>
                <span class="muted">
                  {' '}
                  · nível {k.level} · ano {yearOf(k.day)}
                  {k.flawless ? ' · sem baixas' : ''}
                </span>
                {slayer !== undefined && (
                  <p class="muted">
                    Golpe final de <HeroLink id={slayer} cross />.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <h3>Nêmesis caídas</h3>
      {fallen.length === 0 ? (
        <p class="sub">Nenhuma nêmesis caiu ainda.</p>
      ) : (
        <ul class="codex-list">
          {fallen.map((n) => (
            <li key={n.id}>
              <strong>{n.name}</strong> <span class="muted">· {n.enemyName} · caiu no ano {yearOf(n.fallen!.day)}</span>
              <p class="muted">
                Levou{' '}
                {n.victims.map((v, i) => (
                  <span key={v}>
                    {i > 0 && (i === n.victims.length - 1 ? ' e ' : ', ')}
                    <HeroLink id={v} cross />
                  </span>
                ))}
                {n.fallen!.by !== null && (
                  <>
                    . Derrubada por <HeroLink id={n.fallen!.by} cross />
                  </>
                )}
                .
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── Estátuas ───────────────────────────────────────────────────────────────

function StatuesTab(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const slots = pedestalsOf(hallLevel(world));
  const statues = hallStatues(world);
  const pins = world.pinnedStatues ?? [];
  const all = lordSlayers(world);
  return (
    <>
      <p class="sub">
        Na frente do Salão, {plural(slots, 'pedestal', 'pedestais')} para quem deu o golpe final num Senhor. Cheios, a estátua mais nova entra no lugar da mais
        antiga; a fixada fica.
      </p>
      {all.length === 0 ? (
        <p class="sub">Os pedestais esperam o primeiro Senhor vencido.</p>
      ) : (
        <ul class="bonds">
          {all.map(({ hero, level, day }) => {
            const standing = statues.includes(hero);
            const pinned = pins.includes(hero.id);
            return (
              <li key={hero.id}>
                <HeroLink id={hero.id} cross />
                <span class="muted">
                  {lordOf(level).name} · ano {yearOf(day)}
                  {standing ? ' · no pedestal' : ''}
                </span>
                <button class="btn small" onClick={() => command(commands.togglePinStatue, hero.id)}>
                  {pinned ? 'Soltar' : 'Fixar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
