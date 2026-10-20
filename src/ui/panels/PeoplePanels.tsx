// Elenco, cemitério, menu, boas-vindas e fim de ato.

import { useState } from 'preact/hooks';
import { ACTS, byWhom, createWorld, formatDate, heroCapacity } from '../../sim/index.ts';
import type { Hero, HeroStatus } from '../../sim/index.ts';
import { clearSave, readSaveMeta, browserStore, loadWorld, saveWorld } from '../../game/storage.ts';
import { Bar, HeroLink, PanelShell, useGame } from '../components.tsx';
import { activityText, className, liveHp } from '../format.ts';
import { graveOrder } from '../../render/layout.ts';
import { HeroPortrait } from '../PixelSprite.tsx';

const ORDER: Record<HeroStatus, number> = { expedition: 0, town: 1, retired: 2, left: 3, dead: 4 };

function HeroRow(props: { hero: Hero }) {
  const { world, ui } = useGame();
  const h = props.hero;
  const { hp, max } = liveHp(world, h);
  return (
    <li class={`roster-row status-${h.status}`}>
      <button class="roster-main" onClick={() => ui.open({ kind: 'hero', heroId: h.id })}>
        <span class="roster-art">
          <HeroPortrait hero={h} scale={1} animate={false} />
          <span class={`rank rank-${h.rank}`}>{h.rank}</span>
        </span>
        <span class="roster-name">
          <strong>{h.name}</strong>
          <small>
            {className(h)} · nv {h.level}
          </small>
        </span>
        <span class="roster-bars">
          <Bar kind="hp" value={hp} max={max} slim />
          <Bar kind="morale" value={h.morale} max={100} slim />
        </span>
      </button>
      <small class="roster-activity">{activityText(world, h)}</small>
    </li>
  );
}

export function RosterPanel() {
  const { world } = useGame();
  const [showGone, setShowGone] = useState(false);
  const active = world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition').sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.level - a.level);
  const gone = world.heroes.filter((h) => h.status === 'left' || h.status === 'retired');
  return (
    <PanelShell title="Heróis" subtitle={`${active.length} de ${heroCapacity(world)} vagas · ${world.town.arrivals.length} a caminho`}>
      {active.length === 0 && <p class="sub">Nenhum herói na vila. Toque o berrante.</p>}
      <ul class="roster">
        {active.map((h) => (
          <HeroRow key={h.id} hero={h} />
        ))}
      </ul>
      {gone.length > 0 && (
        <>
          <button class="btn ghost" onClick={() => setShowGone(!showGone)}>
            {showGone ? 'Esconder' : 'Mostrar'} quem foi embora ({gone.length})
          </button>
          {showGone && (
            <ul class="roster">
              {gone.map((h) => (
                <HeroRow key={h.id} hero={h} />
              ))}
            </ul>
          )}
        </>
      )}
    </PanelShell>
  );
}

export function MemorialPanel() {
  const { world } = useGame();
  const dead = graveOrder(world).reverse();
  const mourning = world.heroes.filter((h) => (h.status === 'town' || h.status === 'expedition') && h.grief > 0 && h.griefFor !== null);
  return (
    <PanelShell title="Cemitério" subtitle={dead.length === 0 ? 'Ainda vazio.' : `${dead.length} ${dead.length === 1 ? 'túmulo' : 'túmulos'}`}>
      {mourning.length > 0 && (
        <>
          <h3>De luto</h3>
          <ul class="bonds">
            {mourning.map((h) => (
              <li key={h.id}>
                <HeroLink id={h.id} /> <span class="grief">chora por {world.heroes.find((x) => x.id === h.griefFor)?.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <ul class="graves">
        {dead.map((h) => (
          <li key={h.id}>
            <HeroLink id={h.id} />
            <small>
              {className(h)} {h.rank}, nível {h.level} · {h.stats.expeditions} {h.stats.expeditions === 1 ? 'expedição' : 'expedições'}
            </small>
            {h.death && (
              <small class="muted">
                {h.death.where}, {byWhom(h.death.by)} · {formatDate(h.death.tick)}
              </small>
            )}
            {h.deeds.length > 0 && <small class="gold">{h.deeds[h.deeds.length - 1]!.text}</small>}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function MenuPanel() {
  const { session, ui } = useGame();
  const store = browserStore();
  const meta = readSaveMeta(store);
  const [confirmNew, setConfirmNew] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const prefs = ui.prefs;
  const scale = (d: number) => ui.setPrefs({ uiScale: Math.round(Math.max(0.8, Math.min(1.6, prefs.uiScale + d)) * 10) / 10 });
  return (
    <PanelShell title="Menu" subtitle={`Semente ${session.world.seed}`}>
      <h3>Jogo</h3>
      <div class="row">
        <button
          class="btn primary"
          onClick={() => {
            const r = saveWorld(store, session.world);
            ui.toast(r.ok ? 'Jogo salvo.' : r.reason, r.ok ? 'good' : 'warn');
          }}
        >
          Salvar agora
        </button>
        <button
          class="btn"
          disabled={!meta}
          onClick={() => {
            const r = loadWorld(store);
            if (!r.ok) return ui.toast(r.reason, 'warn');
            session.replace(r.world);
            ui.close();
            ui.toast('Jogo carregado.', 'good');
          }}
        >
          Carregar
        </button>
      </div>
      <p class="sub">{meta ? `Último save: ${meta.label} (salvo em ${new Date(meta.savedAt).toLocaleString('pt-BR')})` : 'Nenhum jogo salvo neste navegador.'}</p>
      <label class="check">
        <input type="checkbox" checked={prefs.autosave} onChange={(e) => ui.setPrefs({ autosave: (e.target as HTMLInputElement).checked })} /> Salvar sozinho a cada dia do jogo
      </label>
      <label class="check">
        <input type="checkbox" checked={prefs.pauseOnDeath} onChange={(e) => ui.setPrefs({ pauseOnDeath: (e.target as HTMLInputElement).checked })} /> Pausar quando um herói morrer
      </label>

      <h3>Novo jogo</h3>
      {confirmNew ? (
        <>
          <p class="tag warn">O jogo atual será perdido (o save também).</p>
          <div class="row stepper">
            <label for="seed">Semente</label>
            <input id="seed" type="number" value={seed} onInput={(e) => setSeed(Math.abs(Math.round(Number((e.target as HTMLInputElement).value) || 0)))} />
          </div>
          <div class="row">
            <button
              class="btn danger"
              onClick={() => {
                clearSave(store);
                session.replace(createWorld(seed));
                session.setPaused(false);
                setConfirmNew(false);
                ui.open({ kind: 'welcome' });
              }}
            >
              Começar do zero
            </button>
            <button class="btn" onClick={() => setConfirmNew(false)}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button class="btn ghost" onClick={() => setConfirmNew(true)}>
          Começar outra vila…
        </button>
      )}

      <h3>Som</h3>
      <label class="check">
        <input type="checkbox" checked={!prefs.muted} onChange={(e) => ui.setPrefs({ muted: !(e.target as HTMLInputElement).checked })} /> Som ligado
      </label>
      {(
        [
          ['masterVolume', 'Geral'],
          ['musicVolume', 'Música'],
          ['ambientVolume', 'Ambiente'],
          ['sfxVolume', 'Efeitos'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} class="volume">
          <span>{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(prefs[key] * 100)}
            disabled={prefs.muted}
            onInput={(e) => ui.setPrefs({ [key]: Number((e.target as HTMLInputElement).value) / 100 })}
          />
          <output>{Math.round(prefs[key] * 100)}%</output>
        </label>
      ))}

      <h3>Tela</h3>
      <div class="row stepper">
        <button class="btn" onClick={() => scale(-0.1)} aria-label="Diminuir interface">
          A−
        </button>
        <span>Interface {Math.round(prefs.uiScale * 100)}%</span>
        <button class="btn" onClick={() => scale(0.1)} aria-label="Aumentar interface">
          A+
        </button>
      </div>

      <h3>Controles</h3>
      <ul class="effects">
        <li>WASD ou setas: andar com o prefeito. Clique ou toque no chão para andar até lá.</li>
        <li>Clique num prédio, no berrante, no quadro ou no cofre: o prefeito vai até lá e interage. Perto de algo, E interage.</li>
        <li>Clique num herói para ver a ficha.</li>
        <li>Espaço: pausa · 1, 2, 3: velocidade 1×, 2×, 4× · M: abismo · H: heróis · C: crônica · N: som · Esc: fechar.</li>
        <li>Roda do mouse ou pinça com dois dedos: aproximar ou afastar o mapa.</li>
      </ul>

      <h3>Créditos</h3>
      <p class="sub">
        Arte em pixel com licença CC0:{' '}
        <a href="https://kenney.nl/assets/tiny-town" target="_blank" rel="noopener noreferrer">
          Tiny Town
        </a>
        , de Kenney (a vila), e{' '}
        <a href="https://0x72.itch.io/dungeontileset-ii" target="_blank" rel="noopener noreferrer">
          16x16 DungeonTileset II
        </a>
        , de 0x72 (heróis, monstros e masmorra).
      </p>
    </PanelShell>
  );
}

export function WelcomePanel() {
  const { ui } = useGame();
  return (
    <PanelShell title="Bem-vindo a Vigília" subtitle="Você é o prefeito. Os heróis não obedecem: escolhem.">
      <p>A vila foi arrasada pelo que sobe do abismo, ao norte. Só a taverna ficou de pé.</p>
      <p>
        Toque o <strong>berrante</strong> (a torre a oeste) para chamar aventureiros. Eles formam grupos sozinhos no <strong>quadro</strong>, descem e voltam
        com ouro e ossos. Com isso você <strong>reconstrói</strong> a vila.
      </p>
      <p>Você não controla o combate. Pode postar contratos, mudar a doutrina da guilda e, se der errado, tocar o sino de retirada.</p>
      <p>Alguns não vão voltar. Os amigos deles vão lembrar.</p>
      <ul class="effects">
        <li>WASD/setas ou clique para andar · E para interagir</li>
        <li>Espaço pausa · 1/2/3 mudam a velocidade</li>
      </ul>
      <button class="btn primary big" onClick={() => ui.close()}>
        Começar
      </button>
    </PanelShell>
  );
}

export function ActEndPanel(props: { act: number }) {
  const { world, session, ui } = useGame();
  const def = ACTS[props.act]!;
  const next = ACTS[props.act + 1];
  const deaths = world.heroes.filter((h) => h.status === 'dead').length;
  const killer = world.heroes.find((h) => h.deeds.some((d) => d.kind === 'chefe' && d.text.includes(def.boss.name.replace(/^(O|A) /, ''))));
  return (
    <PanelShell title={`${def.boss.name} caiu`} subtitle={`Fim do Ato ${props.act + 1} · ${formatDate(world.tick)}`}>
      {killer && (
        <p>
          O golpe final foi de <HeroLink id={killer.id} />.
        </p>
      )}
      <p>
        O caminho {def.of} está livre. {deaths === 0 ? 'Ninguém morreu até aqui.' : `${deaths} ${deaths === 1 ? 'herói ficou' : 'heróis ficaram'} pelo caminho.`}
      </p>
      {next && <p>Abaixo, um novo caminho se abriu: {next.name}. A corrupção de lá já começou a subir.</p>}
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
