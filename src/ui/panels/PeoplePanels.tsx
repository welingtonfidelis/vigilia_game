// Elenco, cemitério, menu, boas-vindas e fim da campanha.

import { useState } from 'preact/hooks';
import { BALANCE, byWhom, childAge, commands, createWorld, dayOf, DIFFICULTIES, DIFFICULTY_IDS, formatDate, heroCapacity, ROLE_NAMES, roleCount, TRAITS, yearOf } from '../../sim/index.ts';
import type { Difficulty } from '../../sim/index.ts';
import type { Hero, HeroStatus, RetiredRole } from '../../sim/index.ts';
import { clearSave, readOldSave, readSaveMeta, browserStore, loadWorld, saveWorld } from '../../game/storage.ts';
import { Bar, HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { activityText, className, fmt, liveHp, plural } from '../format.ts';
import { GRAVE_SLOTS, graveOrder } from '../../render/layout.ts';
import { ChildIcon, HeroPortrait } from '../PixelSprite.tsx';

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

type RosterTab = 'ativos' | 'aposentados' | 'criancas' | 'partiram';

export function RosterPanel() {
  const { world, ui } = useGame();
  const [tab, setTab] = useState<RosterTab>('ativos');
  const active = world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition').sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.level - a.level);
  const retired = world.heroes.filter((h) => h.status === 'retired');
  const gone = world.heroes.filter((h) => h.status === 'left');
  const kids = [...world.children].sort((a, b) => a.bornDay - b.bornDay);
  const tabs: [RosterTab, string, number][] = [
    ['ativos', 'Na ativa', active.length],
    ['aposentados', 'Aposentados', retired.length],
    ['criancas', 'Crianças', kids.length],
    ['partiram', 'Partiram', gone.length],
  ];
  return (
    <PanelShell title="Heróis" subtitle={`${active.length} de ${heroCapacity(world)} vagas · ${world.town.arrivals.length} a caminho`}>
      <div class="row tabs" role="tablist">
        {tabs.map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label} <small>{n}</small>
          </button>
        ))}
      </div>
      {tab === 'ativos' && (
        <>
          {active.length === 0 && <p class="sub">Nenhum herói na vila. Toque o berrante.</p>}
          <ul class="roster">
            {active.map((h) => (
              <HeroRow key={h.id} hero={h} />
            ))}
          </ul>
        </>
      )}
      {tab === 'aposentados' && (
        <>
          <p class="sub">Quem pendura as armas fica na vila e trabalha. Até {BALANCE.roleCap} por função somam efeito.</p>
          {(Object.keys(ROLE_NAMES) as RetiredRole[]).map((role) => (
            <p key={role} class="sub">
              {ROLE_NAMES[role].m.replace(/^./, (c) => c.toUpperCase())} {ROLE_NAMES[role].where}: {roleCount(world, role)} de {BALANCE.roleCap}
            </p>
          ))}
          {retired.length === 0 && <p class="sub">Ninguém se aposentou ainda.</p>}
          <ul class="roster">
            {retired.map((h) => (
              <HeroRow key={h.id} hero={h} />
            ))}
          </ul>
        </>
      )}
      {tab === 'criancas' && (
        <>
          <p class="sub">Filhos dos casais da vila. Aos {BALANCE.comingOfAgeYears} anos pegam em armas, herdando um traço e a arma da família.</p>
          {kids.length === 0 && <p class="sub">Nenhuma criança ainda. Casais nascem de vínculos fortes.</p>}
          <ul class="bonds">
            {kids.map((c) => {
              const age = childAge(world, c);
              const parents = c.parents.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h);
              return (
                <li key={c.id}>
                  <span class="kid">
                    <ChildIcon gender={c.gender} />
                    <span>
                      <strong>{c.name}</strong>
                      <small class="muted">
                        {' '}
                        {plural(age, 'ano', 'anos')} · de{' '}
                        {parents.map((p, i) => (
                          <span key={p.id}>
                            {i > 0 && ' e '}
                            <button class={`link${p.status === 'dead' ? ' dead' : ''}`} onClick={() => ui.open({ kind: 'hero', heroId: p.id })}>
                              {p.name}
                            </button>
                          </span>
                        ))}
                      </small>
                    </span>
                  </span>
                  <span class="muted">{TRAITS[c.trait].name[c.gender]}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {tab === 'partiram' && (
        <>
          {gone.length === 0 && <p class="sub">Ninguém foi embora.</p>}
          <ul class="roster">
            {gone.map((h) => (
              <HeroRow key={h.id} hero={h} />
            ))}
          </ul>
        </>
      )}
    </PanelShell>
  );
}

/** Busto da entrada do cemitério (M6 F6): o prefeito escolhe o herói caído e troca quando quiser. */
function BustSection(props: { dead: Hero[] }) {
  const { world } = useGame();
  const command = useCommand();
  const current = world.town.bust ?? null;
  const [pick, setPick] = useState<number>(current ?? props.dead[0]!.id);
  const bust = current === null ? undefined : world.heroes.find((h) => h.id === current);
  return (
    <>
      <h3>Busto da entrada</h3>
      <p class="sub">{bust ? <>O busto ao lado do portãozinho lembra <HeroLink id={bust.id} cross />.</> : 'A coluna ao lado do portãozinho ainda espera um busto.'}</p>
      <div class="post-pick">
        <select value={pick} onChange={(e) => setPick(Number((e.target as HTMLSelectElement).value))}>
          {props.dead.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {className(h)} {h.rank}, nível {h.level}
            </option>
          ))}
        </select>
        <button class="btn small" disabled={pick === current} onClick={() => command(commands.setBust, pick)}>
          {bust ? 'Trocar o busto' : 'Erguer o busto'}
        </button>
      </div>
    </>
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
      {dead.length > 0 && <BustSection dead={dead} />}
      {dead.length > GRAVE_SLOTS && (
        <p class="sub">Cabem {GRAVE_SLOTS} covas dentro da cerca; as mais antigas foram para o ossário, mas os nomes ficam aqui.</p>
      )}
      <ul class="graves">
        {dead.map((h) => (
          <li key={h.id}>
            <HeroLink id={h.id} />
            <small>
              {className(h)} {h.rank}, nível {h.level} · {h.stats.expeditions} {h.stats.expeditions === 1 ? 'expedição' : 'expedições'}
            </small>
            {h.epitaph ? (
              <blockquote class="epitaph">{h.epitaph}</blockquote>
            ) : (
              <>
                {h.death && (
                  <small class="muted">
                    {h.death.where}, {byWhom(h.death.by)} · {formatDate(h.death.tick)}
                  </small>
                )}
                {h.deeds.length > 0 && <small class="gold">{h.deeds[h.deeds.length - 1]!.text}</small>}
              </>
            )}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function CampaignEndPanel() {
  const { world, ui, session } = useGame();
  const fallen = graveOrder(world).slice(-6).reverse();
  const years = yearOf(dayOf(world.tick));
  return (
    <PanelShell wide title="Aquilo que Vigia foi silenciado" subtitle={`Fim da campanha · ${formatDate(world.tick)}`}>
      <p>
        Pela primeira vez em séculos a vila dorme sem medo. O abismo está quieto, e quem desceu até o fundo voltou com uma história que ninguém
        vai esquecer.
      </p>
      <div class="stats">
        <Stat label="Anos de vila" value={years} />
        <Stat label="Senhores vencidos" value={fmt(world.metrics.bossKills.length)} />
        <Stat label="Expedições" value={fmt(world.metrics.expeditions)} />
        <Stat label="Heróis caídos" value={fmt(world.metrics.deaths)} />
        <Stat label="Ouro saqueado" value={fmt(world.metrics.goldLooted)} />
        <Stat label="População" value={fmt(world.town.population)} />
      </div>
      <div class="row">
        <button class="btn primary big" onClick={() => { session.setPaused(false); ui.close(); }}>
          Continuar jogando
        </button>
        <button class="btn" onClick={() => ui.open({ kind: 'chronicle' })}>
          Ler a crônica
        </button>
      </div>
      <h3>Quem não voltou</h3>
      {fallen.length === 0 ? (
        <p class="sub">Ninguém morreu nesta campanha. A vila inteira viu o abismo se calar.</p>
      ) : (
        <ul class="graves">
          {fallen.map((h) => (
            <li key={h.id}>
              <HeroLink id={h.id} />
              <small>
                {className(h)} {h.rank}, nível {h.level} · {h.stats.expeditions} {h.stats.expeditions === 1 ? 'expedição' : 'expedições'}
              </small>
              {h.epitaph && <blockquote class="epitaph">{h.epitaph}</blockquote>}
            </li>
          ))}
        </ul>
      )}
      <p class="sub">A vila segue viva: dá para continuar tocando o berrante, construindo e descendo enquanto quiser.</p>
    </PanelShell>
  );
}

export function MenuPanel() {
  const { session, ui, world } = useGame();
  const store = browserStore();
  const meta = readSaveMeta(store);
  const [confirmNew, setConfirmNew] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const current: Difficulty = world.difficulty ?? 'normal';
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>(current);
  const command = useCommand();
  const prefs = ui.prefs;
  const scale = (d: number) => ui.setPrefs({ uiScale: Math.round(Math.max(0.8, Math.min(1.6, prefs.uiScale + d)) * 10) / 10 });
  return (
    <PanelShell title="Menu" subtitle={`Versão ${__APP_VERSION__} (em construção) · semente ${session.world.seed}`}>
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
      {world.endedTick !== null && (
        <button class="btn" onClick={() => ui.open({ kind: 'campaignEnd' })}>
          Ver o fim da campanha
        </button>
      )}
      <label class="check">
        <input type="checkbox" checked={prefs.autosave} onChange={(e) => ui.setPrefs({ autosave: (e.target as HTMLInputElement).checked })} /> Salvar sozinho a cada dia do jogo
      </label>
      <label class="check">
        <input type="checkbox" checked={prefs.pauseOnDeath} onChange={(e) => ui.setPrefs({ pauseOnDeath: (e.target as HTMLInputElement).checked })} /> Pausar quando um herói morrer
      </label>
      <label class="check">
        <input type="checkbox" checked={prefs.runInBackground} onChange={(e) => ui.setPrefs({ runInBackground: (e.target as HTMLInputElement).checked })} /> Continuar o jogo com a aba em segundo plano (sempre em 1×)
      </label>

      <h3>Chamadas do abismo</h3>
      <p class="sub">Um aviso com o botão Assistir quando algo vai acontecer lá embaixo.</p>
      {(
        [
          ['senhor', 'Começa a luta contra o Senhor'],
          ['guardiao', 'Um grupo chega ao guardião da passagem'],
          ['nemesis', 'Uma nêmesis aparece'],
          ['encontro', 'Um grupo acha um encontro e pede conselho'],
          ['torneio', 'O torneio da estação (a chave e os duelos)'],
        ] as const
      ).map(([kind, label]) => (
        <label key={kind} class="check">
          <input
            type="checkbox"
            checked={prefs.calls[kind] !== false}
            onChange={(e) => ui.setPrefs({ calls: { ...prefs.calls, [kind]: (e.target as HTMLInputElement).checked } })}
          />{' '}
          {label}
        </label>
      ))}

      <h3>Dificuldade</h3>
      <div class="seg" role="radiogroup" aria-label="Dificuldade da campanha">
        {DIFFICULTY_IDS.map((d) => (
          <button key={d} class={`btn small${current === d ? ' active' : ''}`} role="radio" aria-checked={current === d} onClick={() => command(commands.setDifficulty, d)}>
            {DIFFICULTIES[d].name}
          </button>
        ))}
      </div>
      <p class="sub">{DIFFICULTIES[current].description} Trocar vale daqui em diante.</p>

      <h3>Novo jogo</h3>
      {confirmNew ? (
        <>
          <p class="tag warn">O jogo atual será perdido (o save também).</p>
          <div class="seg" role="radiogroup" aria-label="Dificuldade da nova vila">
            {DIFFICULTY_IDS.map((d) => (
              <button key={d} class={`btn small${newDifficulty === d ? ' active' : ''}`} role="radio" aria-checked={newDifficulty === d} onClick={() => setNewDifficulty(d)}>
                {DIFFICULTIES[d].name}
              </button>
            ))}
          </div>
          <div class="row stepper">
            <label for="seed">Semente</label>
            <input id="seed" type="number" value={seed} onInput={(e) => setSeed(Math.abs(Math.round(Number((e.target as HTMLInputElement).value) || 0)))} />
          </div>
          <div class="row">
            <button
              class="btn danger"
              onClick={() => {
                clearSave(store);
                session.replace(createWorld(seed, newDifficulty));
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

      <h3>Arte</h3>
      <div class="seg" role="radiogroup" aria-label="Arte do jogo">
        {(['16', '32'] as const).map((a) => (
          <button key={a} class={`btn small${prefs.art === a ? ' active' : ''}`} role="radio" aria-checked={prefs.art === a} onClick={() => ui.setPrefs({ art: a })}>
            {a}-bit
          </button>
        ))}
      </div>
      <p class="sub">A 32-bit tem o dobro de pixels e mais detalhe; peça que ainda não foi redesenhada aparece em 16-bit. Troca na hora, sem perder nada.</p>

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
      <label class="check">
        <input type="checkbox" checked={prefs.fabLeft} onChange={(e) => ui.setPrefs({ fabLeft: (e.target as HTMLInputElement).checked })} /> No celular, botão dos painéis no canto esquerdo (para canhotos)
      </label>
      <h3>Clima</h3>
      <div class="seg" role="radiogroup" aria-label="Clima das estações">
        {(
          [
            ['completo', 'Completo'],
            ['leve', 'Leve'],
            ['desligado', 'Desligado'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} class={`btn small${prefs.weather === id ? ' active' : ''}`} role="radio" aria-checked={prefs.weather === id} onClick={() => ui.setPrefs({ weather: id })}>
            {label}
          </button>
        ))}
      </div>
      <p class="sub">Chuva, neve, folhas e relâmpagos na vila. O leve corta as partículas pela metade e tira os relâmpagos; desligado deixa só as cores da estação.</p>

      <h3>Controles</h3>
      <ul class="effects">
        <li>WASD ou setas: andar com o prefeito. Clique ou toque no chão para andar até lá.</li>
        <li>Clique num prédio, no berrante, no quadro ou no cofre: o prefeito vai até lá e interage. Perto de algo, E interage.</li>
        <li>Clique num herói para ver a ficha.</li>
        <li>Espaço: pausa · 1, 2, 3: velocidade 1×, 2×, 4× · G: acompanhar as masmorras · M: abismo · H: heróis · C: crônica · L: Salão das Lendas · N: som · Esc: fechar.</li>
      </ul>

      <h3>As velas do prefeito</h3>
      <ul class="effects">
        <li>As velas no alto da tela são a energia do prefeito: {BALANCE.mayorEnergy} por dia, e voltam à meia-noite.</li>
        <li>Na ficha de um herói (clique nele): conversar (1 vela, uma vez por dia com cada um), consolar quem está de luto (1) e dar presentes (1 vela e o ouro do tesouro).</li>
        <li>No cofre: dar uma peça do arsenal a um herói (1 vela).</li>
        <li>Na fogueira da praça: discursar (2 velas, uma vez por dia). Anima e fideliza todos os heróis que estão na vila.</li>
      </ul>

      <h3>Créditos</h3>
      <p class="sub">
        Toda a arte em pixel é do Vigília Art Pack (CC0), feita para o jogo: vila, heróis, monstros e masmorra, em 16-bit e em 32-bit.
      </p>
    </PanelShell>
  );
}

/** Baixa o save de antes do M5 como arquivo (o jogo não lê mais esse formato). */
function exportOldSave(): void {
  const json = readOldSave(browserStore());
  if (!json) return;
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vigilia-save-antigo.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function WelcomePanel(props: { oldSave?: boolean }) {
  const { ui } = useGame();
  return (
    <PanelShell title="Bem-vindo a Vigília" subtitle="Você é o prefeito. Os heróis não obedecem: escolhem.">
      {props.oldSave && (
        <div class="notice">
          <p>
            <strong>O abismo mudou.</strong> A caverna agora liga a vila a outras dimensões, e esta versão começa uma campanha nova. O seu jogo antigo
            ficou guardado neste navegador.
          </p>
          <button class="btn" onClick={exportOldSave}>
            Baixar o save antigo
          </button>
        </div>
      )}
      <p>A vila foi arrasada pelo que sobe do abismo, na caverna a leste. Só a taverna ficou de pé.</p>
      <p>
        Toque o <strong>berrante</strong> (na guarita do portão, ao norte) para chamar aventureiros. Eles formam grupos sozinhos no <strong>quadro</strong>, descem e voltam
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
