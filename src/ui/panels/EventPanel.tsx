import { commands, SEASONAL_EVENTS, SEASONS } from '../../sim/index.ts';
import { fmt } from '../format.ts';
import { PanelShell, useCommand, useGame } from '../components.tsx';

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
  return (
    <PanelShell title={def.title} subtitle={`${SEASONS[pending.season]} do ano ${pending.year}`} closeable={false}>
      <p class="event-intro">{def.intro}</p>
      <div class="event-choices">
        {def.choices.map((c) => {
          const blocked = c.cost > world.town.treasury;
          return (
            <button key={c.id} class="event-choice" disabled={blocked} onClick={() => choose(c.id)}>
              <strong>{c.label}</strong>
              <span>{c.detail}</span>
              <em>{c.cost > 0 ? `Custa ${fmt(c.cost)} de ouro` : 'Sem custo'}</em>
            </button>
          );
        })}
      </div>
      <p class="sub">Tesouro atual: {fmt(world.town.treasury)} de ouro. O jogo fica pausado até a escolha.</p>
    </PanelShell>
  );
}
