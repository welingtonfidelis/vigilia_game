// O corvo de um encontro (M6 F3): o que o grupo achou e os conselhos que o prefeito pode
// mandar. Aparece no corredor do grupo e no painel Audiências.

import { BALANCE, commands, encounterOf, floorLabel, TICKS_PER_HOUR } from '../../sim/index.ts';
import type { Party } from '../../sim/index.ts';
import { useCommand, useGame } from '../components.tsx';
import { heroById } from '../format.ts';

export function CrowCard(props: { party: Party; where?: boolean }) {
  const { world } = useGame();
  const command = useCommand();
  const { party } = props;
  const def = encounterOf(party);
  const e = party.encounter;
  if (!def || !e) return null;
  const hours = Math.max(0, Math.ceil((e.untilTick - world.tick) / TICKS_PER_HOUR));
  const advice = e.advice ? def.options.find((o) => o.id === e.advice) : undefined;
  const leader = heroById(world, party.memberIds[0] ?? -1);
  return (
    <div class="crow-card" role="status">
      <strong>{def.title}</strong>
      {props.where && (
        <small>
          {leader ? `Grupo de ${leader.name}` : 'Um grupo'} · {floorLabel(party)}
        </small>
      )}
      <p>{def.text}</p>
      {advice ? (
        <p class="crow-sent">O corvo levou o conselho: {advice.label.toLowerCase()}.</p>
      ) : (
        <>
          <div class="crow-options">
            {def.options.map((o) => (
              <button
                key={o.id}
                class="btn small"
                disabled={world.town.mayorEnergy < BALANCE.encounterAdviceEnergy}
                title={world.town.mayorEnergy < BALANCE.encounterAdviceEnergy ? 'O prefeito está sem energia hoje' : `Mandar este conselho (${BALANCE.encounterAdviceEnergy} de energia)`}
                onClick={() => command(commands.adviseEncounter, party.id, o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <small>
            O grupo decide em {hours} {hours === 1 ? 'hora' : 'horas'}. O conselho custa {BALANCE.encounterAdviceEnergy} de energia; sem ele, decidem pelos traços.
          </small>
        </>
      )}
    </div>
  );
}
