import { useState } from 'preact/hooks';
import {
  ageYears,
  BALANCE,
  byWhom,
  childAge,
  CLASSES,
  commands,
  dayOf,
  defaultRole,
  fleeLimit,
  forgePrice,
  formatDate,
  getBond,
  heroStats,
  maxGearTier,
  maxLevel,
  recoveryPerDay,
  ROLE_NAMES,
  roleCount,
  TRAITS,
  WOUNDS,
  xpToNext,
} from '../../sim/index.ts';
import type { GiftKind, Hero, InjuryKind, RetiredRole, World } from '../../sim/index.ts';
import { Bar, HeroLink, PanelShell, Stat, useCommand, useGame } from '../components.tsx';
import { ArmorIcon, HeroPortrait, WeaponIcon } from '../PixelSprite.tsx';
import { ItemCard, SlotIcon } from '../items.tsx';
import { WEAPON_NAMES } from '../../render/assets.ts';
import { activityText, bondLabel, cap, className, fmt, g, injuryName, liveHp, pct, plural } from '../format.ts';
import { EnergyCandles } from '../Energy.tsx';

function bondsOf(world: World, hero: Hero): { other: Hero; value: number }[] {
  const out: { other: Hero; value: number }[] = [];
  for (const other of world.heroes) {
    if (other.id === hero.id) continue;
    const value = getBond(world, hero.id, other.id);
    if (Math.abs(value) >= 5) out.push({ other, value });
  }
  return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);
}

/** "−15% de ataque, −50% de crítico" a partir dos multiplicadores do núcleo. */
function woundText(m: Partial<Record<'hp' | 'atk' | 'interval' | 'crit', number>>): string {
  const parts: string[] = [];
  const down = (x: number) => `−${Math.round((1 - x) * 100)}%`;
  if (m.hp !== undefined) parts.push(`${down(m.hp)} de vida`);
  if (m.atk !== undefined) parts.push(`${down(m.atk)} de ataque`);
  if (m.interval !== undefined) parts.push(`${down(1 / m.interval)} de ritmo`);
  if (m.crit !== undefined) parts.push(`${down(m.crit)} de crítico`);
  return parts.join(', ');
}

const ROLE_EFFECTS: Record<RetiredRole, string> = {
  mentor: 'mais experiência no treino',
  ferreiro: 'equipamento mais barato',
  contador: 'mais ânimo na taverna',
  curandeiro: 'lesões saram mais rápido',
};

const ROLES = Object.keys(ROLE_NAMES) as RetiredRole[];

const GIFTS: { kind: GiftKind; label: string; fan?: string }[] = [
  { kind: 'bebida', label: 'Bebida', fan: 'beberrao' },
  { kind: 'reliquia', label: 'Relíquia', fan: 'devoto' },
  { kind: 'arma', label: 'Arma nova' },
];

function InjuryBlock(props: { world: World; hero: Hero }) {
  const { world, hero } = props;
  if (!hero.injury && hero.scars.length === 0) return null;
  const injury = hero.injury;
  return (
    <div class="injury">
      {injury && (
        <>
          <p>
            <strong>Lesão:</strong> {injuryName(injury.kind)} <span class="sub">({woundText(WOUNDS[injury.kind].injury)})</span>
          </p>
          <Bar
            kind="heal"
            value={injury.total - injury.daysLeft}
            max={injury.total}
            text={`sara em ~${plural(Math.max(1, Math.ceil(injury.daysLeft / recoveryPerDay(world))), 'dia', 'dias')} · não desce até lá`}
          />
        </>
      )}
      {hero.scars.length > 0 && (
        <p class="sub">
          Cicatrizes:{' '}
          {hero.scars.map((s: InjuryKind, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {WOUNDS[s].name} ({woundText(WOUNDS[s].scar)})
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function FamilyBlock(props: { world: World; hero: Hero }) {
  const { world, hero } = props;
  const partner = hero.partnerId === null ? undefined : world.heroes.find((h) => h.id === hero.partnerId);
  const grown = world.heroes.filter((h) => h.parents.includes(hero.id));
  const kids = world.children.filter((c) => c.parents.includes(hero.id));
  if (!partner && hero.parents.length === 0 && grown.length === 0 && kids.length === 0) return null;
  return (
    <>
      <h3>Família</h3>
      <ul class="bonds">
        {partner && (
          <li>
            <HeroLink id={partner.id} />
            <span class="good">{g(partner, 'marido', 'esposa')}</span>
          </li>
        )}
        {hero.parents.map((id) => {
          const p = world.heroes.find((h) => h.id === id);
          return (
            p && (
              <li key={id}>
                <HeroLink id={id} />
                <span class="muted">{g(p, 'pai', 'mãe')}</span>
              </li>
            )
          );
        })}
        {grown.map((c) => (
          <li key={c.id}>
            <HeroLink id={c.id} />
            <span class="muted">
              {g(c, 'filho', 'filha')} · {className(c)}
            </span>
          </li>
        ))}
        {kids.map((c) => {
          const age = childAge(world, c);
          const left = BALANCE.comingOfAgeYears - age;
          return (
            <li key={c.id}>
              <span>{c.name}</span>
              <span class="muted">
                {c.gender === 'm' ? 'filho' : 'filha'}, {plural(age, 'ano', 'anos')} · pega em armas em {plural(left, 'ano', 'anos')}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RolePicker(props: { world: World; hero: Hero; current: RetiredRole | null; onPick: (role: RetiredRole) => void }) {
  const { world, hero } = props;
  const suggested = defaultRole(hero, world);
  return (
    <div class="choices">
      {ROLES.map((role) => {
        const r = ROLE_NAMES[role];
        const count = roleCount(world, role);
        return (
          <button key={role} class={`choice${props.current === role ? ' active' : ''}`} aria-pressed={props.current === role} onClick={() => props.onPick(role)}>
            <strong>
              {cap(r[hero.gender])} {r.where}
              {role === suggested && props.current !== role ? ' · sugerida' : ''}
            </strong>
            <span>
              {cap(ROLE_EFFECTS[role])} · {count} de {BALANCE.roleCap} {count >= BALANCE.roleCap ? '(efeito no máximo)' : 'na função'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Conversar, presentear e consolar: custam energia do prefeito. */
function MayorActions(props: { world: World; hero: Hero }) {
  const { world, hero } = props;
  const command = useCommand();
  const energy = world.town.mayorEnergy;
  const today = dayOf(world.tick);
  const talked = hero.lastTalkDay === today;
  const noEnergy = energy < 1 ? 'O prefeito está sem energia hoje.' : null;
  const reasons: string[] = [];
  if (noEnergy) reasons.push(noEnergy);
  else if (talked) reasons.push(`Já conversou com ${hero.name} hoje.`);
  return (
    <>
      <h3>
        O prefeito pode… <EnergyCandles energy={energy} />
      </h3>
      <div class="row">
        <button class="btn" disabled={!!noEnergy || talked} title={talked ? 'Uma conversa por dia' : '1 de energia'} onClick={() => command(commands.talk, hero.id)}>
          Conversar <small>· 1</small>
        </button>
        {hero.grief > 0 && (
          <button class="btn" disabled={!!noEnergy} title="1 de energia" onClick={() => command(commands.comfort, hero.id)}>
            Consolar <small>· 1</small>
          </button>
        )}
      </div>
      <div class="row">
        {GIFTS.map(({ kind, label, fan }) => {
          const price = commands.giftPrice(world, hero.id, kind);
          const maxed = kind === 'arma' && hero.gear.weapon + 1 > maxGearTier(world, 'weapon');
          const poor = world.town.treasury < price;
          const loves = fan && hero.traits.some((t) => t.id === fan && t.revealed);
          const why = noEnergy ?? (maxed ? 'O ferreiro ainda não forja uma arma melhor.' : poor ? `Faltam ${fmt(price - world.town.treasury)} de ouro.` : '');
          return (
            <button key={kind} class={`btn${loves ? ' fav' : ''}`} disabled={!!why} title={why || `1 de energia + ${fmt(price)} de ouro`} onClick={() => command(commands.gift, hero.id, kind)}>
              {label} <small>· {maxed ? '—' : `${fmt(price)} de ouro`}</small>
              {loves && <small class="gold"> ♥</small>}
            </button>
          );
        })}
      </div>
      {reasons.length > 0 && <p class="sub">{reasons[0]}</p>}
    </>
  );
}

function RenameField(props: { hero: Hero }) {
  const command = useCommand();
  const [name, setName] = useState(props.hero.name);
  const clean = name.trim();
  const valid = clean.length >= 2 && clean.length <= 20 && clean !== props.hero.name;
  return (
    <form
      class="row stepper rename"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) command(commands.rename, props.hero.id, clean);
      }}
    >
      <input type="text" value={name} maxLength={20} aria-label="Novo nome" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      <button class="btn" type="submit" disabled={!valid} title="De 2 a 20 letras">
        Renomear
      </button>
    </form>
  );
}

export function HeroPanel(props: { heroId: number }) {
  const { world, ui } = useGame();
  const command = useCommand();
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [retireRole, setRetireRole] = useState<RetiredRole | null>(null);
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
  const flee = fleeLimit(world, hero);
  const alive = hero.status === 'town' || hero.status === 'expedition';
  const capped = hero.level >= maxLevel(hero);
  const bonds = bondsOf(world, hero);
  const griefFor = hero.griefFor === null ? undefined : world.heroes.find((h) => h.id === hero.griefFor);
  const nextGear = Math.min(hero.gear.weapon, hero.gear.armor) + 1;
  const weaponBonus = Math.round(hero.gear.weapon * BALANCE.weaponAtkPerTier * 100);
  const armorHpBonus = Math.round(hero.gear.armor * BALANCE.armorHpPerTier * 100);
  const armorDefBonus = hero.gear.armor * BALANCE.armorDefPerTier;
  const cls = CLASSES[hero.classId];
  const role = hero.retiredRole;

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
          <HeroPortrait hero={hero} variant="detail" />
        </span>
        <p class={`status status-${hero.status}`}>{activityText(world, hero)}</p>
      </div>
      {hero.vengeful && <p class="tag bad">Em fúria vingativa: ignora o sino de retirada.</p>}
      {griefFor && hero.grief > 0 && (
        <p class="tag grief">
          De luto por <HeroLink id={griefFor.id} /> ({Math.round(hero.grief)})
        </p>
      )}

      {hero.death && (
        <div class="death">
          {hero.epitaph && <blockquote class="epitaph">{hero.epitaph}</blockquote>}
          <p>
            {hero.death.by === 'velhice'
              ? `Morreu de velhice ${hero.death.where}.`
              : `Tombou no ${hero.death.where}, ${g(hero, 'abatido', 'abatida')} ${byWhom(hero.death.by)}.`}
          </p>
          <p class="sub">{formatDate(hero.death.tick)}</p>
        </div>
      )}

      <InjuryBlock world={world} hero={hero} />

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

      {hero.status === 'town' && <MayorActions world={world} hero={hero} />}

      {hero.status === 'retired' && (
        <>
          <h3>Função na vila</h3>
          <p class="sub">Aposentados não descem mais, mas ajudam a vila. Até {BALANCE.roleCap} por função somam efeito.</p>
          <RolePicker world={world} hero={hero} current={role} onPick={(r) => command(commands.assignRole, hero.id, r)} />
        </>
      )}

      <FamilyBlock world={world} hero={hero} />

      <h3>Equipamento</h3>
      <div class="gear">
        {hero.items?.weapon ? (
          <ItemCard world={world} item={hero.items.weapon} classId={hero.classId}>
            {weaponBonus > 0 && <small class="item-bonus">+{weaponBonus}% de ataque pelo tier</small>}
          </ItemCard>
        ) : (
          <div class="gear-item">
            <span class="gear-icon">
              <WeaponIcon classId={hero.classId} />
            </span>
            <span class="gear-text">
              <strong>{WEAPON_NAMES[hero.classId]}</strong>
              <small>Ainda é a arma de sempre</small>
            </span>
          </div>
        )}
        {hero.items?.armor ? (
          <ItemCard world={world} item={hero.items.armor} classId={hero.classId}>
            {armorHpBonus > 0 && <small class="item-bonus">+{armorHpBonus}% de vida e +{armorDefBonus} de defesa pelo tier</small>}
          </ItemCard>
        ) : (
          <div class="gear-item">
            <span class="gear-icon">
              <ArmorIcon />
            </span>
            <span class="gear-text">
              <strong>Armadura</strong>
              <small>Ainda é a roupa de sempre</small>
            </span>
          </div>
        )}
        {hero.items?.amulet ? (
          <ItemCard world={world} item={hero.items.amulet} classId={hero.classId} />
        ) : (
          <div class="gear-item empty">
            <span class="gear-icon">
              <SlotIcon slot="amulet" classId={null} />
            </span>
            <span class="gear-text">
              <strong>Amuleto</strong>
              <small>Nenhum. Amuletos vêm do abismo, da forja ou de presente.</small>
            </span>
          </div>
        )}
      </div>
      <p class="sub">
        O herói compra o tier comum na forja com o próprio ouro e só troca uma peça com nome por outra melhor. Peças raras, épicas e lendárias vêm do abismo, das
        encomendas e do cofre da vila. Os números abaixo já incluem tudo.
      </p>

      <h3>Atributos</h3>
      <p class="sub">{cls.blurb}</p>
      <div class="stats">
        <Stat label="Vida máx." value={fmt(stats.maxHp)} />
        <Stat label="Ataque" value={stats.atk.toFixed(1)} />
        <Stat label="Defesa" value={fmt(stats.def)} />
        <Stat label="Ações/s" value={(10 / stats.interval).toFixed(2)} />
        <Stat label="Perfuração" value={pct(stats.pierce)} />
        <Stat label="Crítico" value={pct(stats.crit)} />
        <Stat label="Ouro" value={fmt(hero.gold)} />
        <Stat label="Descidas providas" value={fmt(hero.stats.provisions ?? 0)} hint="Vezes em que comprou ração e tochas ao partir" />
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
              <span>Traço oculto. A vila só descobre num momento marcante (ou conversando).</span>
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
                {other.id === hero.partnerId ? g(other, 'marido', 'esposa') : bondLabel(value, other)} ({value > 0 ? '+' : ''}
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

      {(alive || hero.status === 'retired') && (
        <>
          <h3>Mais</h3>
          <RenameField key={hero.name} hero={hero} />
        </>
      )}

      {alive && (
        <>
          <p class="sub">
            Patrocinar dá ouro do tesouro e aumenta a lealdade.
            {nextGear <= maxGearTier(world) && ` Equipamento tier ${nextGear} custa ${fmt(forgePrice(world, nextGear))} na forja.`}
          </p>
          <div class="row">
            {[10, 25, 50, 100].map((amount) => (
              <button key={amount} class="btn" disabled={world.town.treasury < amount} onClick={() => command(commands.sponsor, hero.id, amount)}>
                Patrocinar {amount}
              </button>
            ))}
          </div>
          {hero.status === 'town' && (
            <>
              {retiring ? (
                <>
                  <p class="sub">Aposentadoria honrosa: {g(hero, 'ele', 'ela')} fica na vila com uma função, e os amigos não se ofendem. Escolha a função:</p>
                  <RolePicker world={world} hero={hero} current={retireRole} onPick={setRetireRole} />
                  <div class="row">
                    <button
                      class="btn primary"
                      disabled={!retireRole}
                      onClick={() => {
                        if (retireRole) command(commands.retire, hero.id, retireRole);
                        setRetiring(false);
                      }}
                    >
                      {retireRole ? `Aposentar como ${ROLE_NAMES[retireRole][hero.gender]}` : 'Escolha a função'}
                    </button>
                    <button class="btn" onClick={() => setRetiring(false)}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div class="row">
                  <button
                    class="btn"
                    onClick={() => {
                      setRetireRole(defaultRole(hero, world));
                      setRetiring(true);
                    }}
                  >
                    Aposentar com honras…
                  </button>
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
                    <button class="btn ghost" onClick={() => setConfirmDismiss(true)} title="Os amigos não gostam">
                      Dispensar da vila
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </PanelShell>
  );
}
