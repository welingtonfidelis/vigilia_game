// A história da vila (src/data/story.ts), para ler a qualquer hora pelo Menu ou na boas-vindas.

import { STORY, STORY_TITLE } from '../../data/story.ts';
import { PanelShell, useGame } from '../components.tsx';

export function StoryPanel() {
  const { ui } = useGame();
  return (
    <PanelShell title={STORY_TITLE} subtitle="O que os velhos contam a quem chega.">
      <article class="story">
        {STORY.map((p, i) => (
          <p key={i} class={i === STORY.length - 1 ? 'story-end' : undefined}>
            {p}
          </p>
        ))}
      </article>
      <button class="btn" onClick={() => (ui.back ? ui.goBack() : ui.close())}>
        {ui.back ? 'Voltar' : 'Fechar'}
      </button>
    </PanelShell>
  );
}
