import { commands, eventChoiceCost, SEASONAL_EVENTS, SEASONS } from '../../sim/index.ts';
import { fmt } from '../format.ts';
import { useCommand, useGame } from '../components.tsx';

/** Evento sazonal: uma escolha obrigatória, com o jogo pausado até resolver. */
export function EventPanel() {
  const { world, session, ui } = useGame();
  const command = useCommand();
  const pending = world.town.event;
  if (!pending) return null;
  const def = SEASONAL_EVENTS[pending.id];
  const choose = (choiceId: string): void => {
    if (!command(commands.resolveSeasonalEvent, choiceId)) return;
    ui.close();
    session.setPaused(false);
  };
  // Decisão: diálogo no meio da tela, sobre tudo, que só sai com uma escolha.
  return (
    <div class="dialog-backdrop">
      <section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="event-title">
        <header class="dialog-head">
          <p class="dialog-kicker">{`${SEASONS[pending.season]} do ano ${pending.year}`}</p>
          <h2 id="event-title">{def.title}</h2>
        </header>
        <p class="event-intro">{def.intro}</p>
        <div class="event-choices">
          {def.choices.map((c) => {
            const cost = eventChoiceCost(world, c);
            const blocked = cost > world.town.treasury;
            return (
              <button key={c.id} class="event-choice" disabled={blocked} onClick={() => choose(c.id)}>
                <strong>{c.label}</strong>
                <span>{c.detail}</span>
                <em>{cost > 0 ? `Custa ${fmt(cost)} de ouro` : 'Sem custo'}</em>
              </button>
            );
          })}
        </div>
        <p class="sub">Tesouro atual: {fmt(world.town.treasury)} de ouro. O jogo fica pausado até a escolha.</p>
      </section>
    </div>
  );
}
