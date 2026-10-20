import { useState } from 'preact/hooks';
import {
  ageYears,
  byWhom,
  CLASSES,
  commands,
  fleeThreshold,
  formatDate,
  getBond,
  gearPrice,
  heroStats,
  maxGearTier,
  maxLevel,
  TRAITS,
  xpToNext,
} from '../../sim/index.ts';
import type { Hero, World } from '../../sim/index.ts';
import { Bar, HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { HeroPortrait } from '../PixelSprite.tsx';
import { activityText, bondLabel, className, fmt, g, liveHp, pct } from '../format.ts';

function bondsOf(world: World, hero: Hero): { other: Hero; value: number }[] {
  const out: { other: Hero; value: number }[] = [];
  for (const other of world.heroes) {
    if (other.id === hero.id) continue;
    const value = getBond(world, hero.id, other.id);
    if (Math.abs(value) >= 5) out.push({ other, value });
  }
  return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);
}

export function HeroPanel(props: { heroId: number }) {
  const { world, ui } = useGame();
  const command = useCommand();
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const hero = world.heroes.find((h) => h.id === props.heroId);
  if (!hero) {
    return (
      <PanelShell title="Herói">
        <p>Esse herói não está mais nos registros.</p>
      </PanelShell>
    );
  }
  const stats = heroStats(world, hero);
  const { hp, max } = liveHp(world, hero);
  const flee = fleeThreshold(hero, world.town.doctrine);
  const alive = hero.status === 'town' || hero.status === 'expedition';
  const capped = hero.level >= maxLevel(hero);
  const bonds = bondsOf(world, hero);
  const griefFor = hero.griefFor === null ? undefined : world.heroes.find((h) => h.id === hero.griefFor);
  const nextGear = Math.min(hero.gear.weapon, hero.gear.armor) + 1;
  const cls = CLASSES[hero.classId];

  return (
    <PanelShell
      title={
        <>
          {hero.name} <span class={`rank rank-${hero.rank}`}>{hero.rank}</span>
        </>
      }
      subtitle={`${className(hero)} · nível ${hero.level} · ${ageYears(world, hero)} anos`}
    >
      <div class="hero-head">
        <span class="hero-portrait">
          <HeroPortrait hero={hero} scale={3} />
        </span>
        <p class={`status status-${hero.status}`}>{activityText(world, hero)}</p>
      </div>
      {hero.vengeful && <p class="tag bad">Em fúria vingativa: ignora o sino de retirada.</p>}
      {griefFor && hero.grief > 0 && (
        <p class="tag grief">
          De luto por <HeroLink id={griefFor.id} /> ({Math.round(hero.grief)})
        </p>
      )}

      {alive && (
        <div class="bars">
          <label>Vida</label>
          <Bar kind="hp" value={hp} max={max} text={`${fmt(hp)} / ${fmt(max)}`} />
          <label>Ânimo</label>
          <Bar
            kind="morale"
            value={hero.morale}
            max={100}
            marker={Number.isFinite(flee) ? flee : null}
            markerTitle={`Foge abaixo de ${Math.round(flee)}`}
            text={Number.isFinite(flee) ? `${Math.round(hero.morale)} · foge abaixo de ${Math.round(flee)}` : `${Math.round(hero.morale)} · não recua`}
          />
          <label>Lealdade</label>
          <Bar kind="loyalty" value={hero.loyalty} max={100} marker={15} markerTitle="Abaixo disso, vai embora" text={`${Math.round(hero.loyalty)}`} />
          <label>{capped ? 'Teto do rank' : 'Experiência'}</label>
          <Bar kind="xp" value={capped ? 1 : hero.xp} max={capped ? 1 : xpToNext(hero.level)} text={capped ? `nível máximo do rank ${hero.rank}` : `${fmt(hero.xp)} / ${fmt(xpToNext(hero.level))}`} />
        </div>
      )}

      {hero.status === 'town' && (
        <div class="needs">
          <div>
            <label>Energia</label>
            <Bar kind="energy" value={hero.needs.energy} max={100} slim />
          </div>
          <div>
            <label>Diversão</label>
            <Bar kind="fun" value={hero.needs.fun} max={100} slim />
          </div>
          <div>
            <label>Fé</label>
            <Bar kind="faith" value={hero.needs.faith} max={100} slim />
          </div>
        </div>
      )}

      {hero.death && (
        <div class="death">
          <p>
            Tombou no {hero.death.where}, {g(hero, 'abatido', 'abatida')} {byWhom(hero.death.by)}.
          </p>
          <p class="sub">{formatDate(hero.death.tick)}</p>
        </div>
      )}

      <h3>Atributos</h3>
      <p class="sub">{cls.blurb}</p>
      <div class="stats">
        <Stat label="Vida máx." value={fmt(stats.maxHp)} />
        <Stat label="Ataque" value={stats.atk.toFixed(1)} />
        <Stat label="Defesa" value={fmt(stats.def)} />
        <Stat label="Ações/s" value={(10 / stats.interval).toFixed(2)} />
        <Stat label="Perfuração" value={pct(stats.pierce)} />
        <Stat label="Crítico" value={pct(stats.crit)} />
        <Stat label="Arma" value={`tier ${hero.gear.weapon}`} />
        <Stat label="Armadura" value={`tier ${hero.gear.armor}`} />
        <Stat label="Ouro" value={fmt(hero.gold)} />
      </div>

      <h3>Traços</h3>
      <ul class="traits">
        {hero.traits.map((t) =>
          t.revealed ? (
            <li key={t.id}>
              <strong>{TRAITS[t.id].name[hero.gender]}</strong>
              <span>{TRAITS[t.id].blurb}</span>
            </li>
          ) : (
            <li key={t.id} class="hidden-trait">
              <strong>?</strong>
              <span>Traço oculto. A vila só descobre num momento marcante.</span>
            </li>
          ),
        )}
      </ul>

      <h3>Vínculos</h3>
      {bonds.length === 0 ? (
        <p class="sub">Ainda não criou laços com ninguém.</p>
      ) : (
        <ul class="bonds">
          {bonds.map(({ other, value }) => (
            <li key={other.id}>
              <HeroLink id={other.id} />
              <span class={value >= 30 ? 'good' : value <= -10 ? 'bad' : 'muted'}>
                {bondLabel(value, other)} ({value > 0 ? '+' : ''}
                {Math.round(value)})
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>Feitos</h3>
      {hero.deeds.length === 0 ? (
        <p class="sub">Nenhum feito ainda.</p>
      ) : (
        <ul class="deeds">
          {[...hero.deeds].reverse().slice(0, 10).map((d, i) => (
            <li key={i}>
              <span>{d.text[0]!.toUpperCase() + d.text.slice(1)}</span>
              <span class="sub">{formatDate(d.tick)}</span>
            </li>
          ))}
        </ul>
      )}
      <div class="stats">
        <Stat label="Expedições" value={hero.stats.expeditions} />
        <Stat label="Abates" value={hero.stats.kills} />
        <Stat label="Andares" value={hero.stats.floorsConquered} />
        <Stat label="Chefes" value={hero.stats.bossKills} />
        <Stat label="Fugas" value={hero.stats.fled} />
        <Stat label="Aliados perdidos" value={hero.stats.alliesLost} />
      </div>

      {alive && (
        <>
          <h3>O prefeito pode…</h3>
          <p class="sub">
            Patrocinar dá ouro do tesouro e aumenta a lealdade.
            {nextGear <= maxGearTier(world) && ` Equipamento tier ${nextGear} custa ${fmt(gearPrice(nextGear))}.`}
          </p>
          <div class="row">
            {[10, 25, 50, 100].map((amount) => (
              <button key={amount} class="btn" disabled={world.town.treasury < amount} onClick={() => command(commands.sponsor, hero.id, amount)}>
                Patrocinar {amount}
              </button>
            ))}
          </div>
          {hero.status === 'town' && (
            <div class="row">
              {confirmDismiss ? (
                <>
                  <button
                    class="btn danger"
                    onClick={() => {
                      if (command(commands.dismiss, hero.id)) ui.close();
                      setConfirmDismiss(false);
                    }}
                  >
                    Confirmar dispensa
                  </button>
                  <button class="btn" onClick={() => setConfirmDismiss(false)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button class="btn ghost" onClick={() => setConfirmDismiss(true)}>
                  Dispensar da vila
                </button>
              )}
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}
