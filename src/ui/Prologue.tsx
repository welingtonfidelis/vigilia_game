// Narração do prólogo animado (§9.7 do doc): o título que espera o toque no jogo novo, a frase
// de cada cena, os pontos do andamento e o botão Pular. A imagem é a cena do Phaser por baixo.

import { useEffect } from 'preact/hooks';
import { PROLOGUE } from '../data/prologue.ts';
import { useGame } from './components.tsx';

export function Prologue() {
  const { ui, session } = useGame();
  const p = ui.prologue;
  // O jogo pausa enquanto o prólogo passa e volta como estava.
  useEffect(() => {
    if (!p) return;
    const was = session.paused;
    session.setPaused(true);
    return () => session.setPaused(was);
  }, [p !== null]);
  if (!p) return null;
  if (p.shot < 0) {
    // Pelo Menu a cena já está abrindo: só o escuro até ela chegar.
    if (p.from === 'menu') return <div class="prologue title" />;
    return (
      <div class="prologue title" onClick={() => ui.launchPrologue()}>
        <h1>Vigília</h1>
        <p>Toque para começar</p>
        <button
          class="prologue-skip"
          onClick={(e) => {
            e.stopPropagation();
            ui.finishPrologue();
          }}
        >
          Pular
        </button>
      </div>
    );
  }
  return (
    <div class="prologue" onClick={() => ui.prologueControl?.next()}>
      <button
        class="prologue-skip"
        onClick={(e) => {
          e.stopPropagation();
          ui.prologueControl?.skip();
        }}
      >
        Pular
      </button>
      <p key={p.shot} class="prologue-caption">
        {PROLOGUE[p.shot]?.caption}
      </p>
      <ol class="prologue-dots" aria-hidden="true">
        {PROLOGUE.map((_, i) => (
          <li key={i} class={i === p.shot ? 'on' : i < p.shot ? 'seen' : ''} />
        ))}
      </ol>
    </div>
  );
}
