// Audiências (M6 F1): os pedidos da manhã na mesa da praça e os desejos dos heróis.

import {
  BALANCE,
  choiceBlocker,
  choiceGold,
  className,
  commands,
  dayOf,
  effectSummary,
  formatDate,
  JOB_NAMES,
  PETITION_BY_ID,
  petitionText,
  TICKS_PER_DAY,
  wishText,
  WISHES,
} from '../../sim/index.ts';
import type { Hero, Petition, World } from '../../sim/index.ts';
import { HeroLink, PanelShell, useCommand, useGame } from '../components.tsx';
import { CrowCard } from './CrowCard.tsx';
import { fmt } from '../format.ts';

/** Quem pede, com o ofício ou a classe. */
function askerLabel(world: World, p: Petition): string {
  if (p.asker.kind === 'morador') {
    const c = world.citizens.find((x) => x.id === p.asker.id);
    return c ? `${c.name}, ${JOB_NAMES[c.job][c.gender]}` : 'Alguém';
  }
  const h = world.heroes.find((x) => x.id === p.asker.id);
  if (!h) return 'Alguém';
  return h.status === 'retired' ? `${h.name}, ${h.gender === 'f' ? 'aposentada' : 'aposentado'}` : `${h.name}, ${className(h).toLowerCase()} ${h.rank}`;
}

function untilText(world: World, untilDay: number): string {
  const left = untilDay - dayOf(world.tick);
  if (left <= 0) return 'Responda hoje';
  if (left === 1) return 'Até amanhã';
  return `Faltam ${left} dias`;
}

function PetitionCard(props: { petition: Petition }) {
  const { world } = useGame();
  const command = useCommand();
  const p = props.petition;
  const def = PETITION_BY_ID.get(p.defId);
  if (!def) return null;
  const t = petitionText(world, p);
  return (
    <article class="petition">
      <header>
        <strong>{askerLabel(world, p)}</strong>
        <small class={p.untilDay <= dayOf(world.tick) ? 'warn' : ''}>{untilText(world, p.untilDay)}</small>
      </header>
      <p>{def.text(t)}</p>
      <div class="event-choices">
        {def.choices.map((c) => {
          const blocked = choiceBlocker(world, c);
          const gold = choiceGold(world, c);
          const tags = [c.energy ? `${c.energy} de energia` : '', gold > 0 ? `${fmt(gold)} de ouro` : ''].filter(Boolean);
          return (
            <button key={c.id} class="event-choice" disabled={!!blocked} title={blocked ?? undefined} onClick={() => command(commands.answerPetition, p.id, c.id)}>
              <strong>{c.label(t)}</strong>
              <span>{effectSummary(world, p, c.effects).join(' · ') || 'Nada muda.'}</span>
              {tags.length > 0 && <em>{tags.join(' · ')}</em>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function WishLine(props: { hero: Hero }) {
  const { world } = useGame();
  const command = useCommand();
  const hero = props.hero;
  const wish = hero.wish!;
  const def = WISHES[wish.id];
  const t = wishText(world, hero, wish);
  const grave = wish.id === 'lapide' && wish.targetId !== null;
  const cost = commands.graveCost(world);
  return (
    <li class="wish">
      <div>
        <HeroLink id={hero.id} /> deseja: {def.text(t)}
        <small>
          {def.how(t)} {untilText(world, wish.untilDay)}.{wish.paired ? ' O prefeito já apresentou os dois.' : ''}
        </small>
      </div>
      {grave && (
        <button class="btn small" disabled={world.town.treasury < cost} onClick={() => command(commands.honorGrave, wish.targetId!)}>
          Pagar a lápide ({fmt(cost)} de ouro)
        </button>
      )}
    </li>
  );
}

export function AudiencesPanel() {
  const { world } = useGame();
  const petitions = world.town.petitions ?? [];
  const wishes = world.heroes.filter((h) => h.wish && (h.status === 'town' || h.status === 'expedition'));
  const log = world.town.petitionLog ?? [];
  const crows = world.parties.filter((p) => p.encounter && p.phase !== 'voltando');
  return (
    <PanelShell title="Audiências" subtitle={`Os pedidos da manhã e os desejos dos heróis. O jogo não para: quem não for ouvido em ${BALANCE.petitionDays} dias desiste.`}>
      {crows.length > 0 && (
        <>
          <h3>Corvos do abismo</h3>
          {crows.map((p) => (
            <CrowCard key={p.id} party={p} where />
          ))}
        </>
      )}
      <h3>Na mesa</h3>
      {petitions.length === 0 ? (
        <p class="sub">Ninguém esperando agora. Às 8h da manhã chega gente nova à mesa da praça.</p>
      ) : (
        petitions.map((p) => <PetitionCard key={p.id} petition={p} />)
      )}
      <h3>Desejos dos heróis</h3>
      {wishes.length === 0 ? (
        <p class="sub">Nenhum herói pediu nada por enquanto. Os desejos aparecem com a vida de cada um: um luto, um amigo, um filho que nasceu.</p>
      ) : (
        <ul class="wish-list">
          {wishes.map((h) => (
            <WishLine key={h.id} hero={h} />
          ))}
        </ul>
      )}
      {log.length > 0 && (
        <>
          <h3>Últimas audiências</h3>
          <ul class="petition-log">
            {log.map((l, i) => (
              <li key={i}>
                <small>{formatDate(l.day * TICKS_PER_DAY)}</small> {l.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelShell>
  );
}
