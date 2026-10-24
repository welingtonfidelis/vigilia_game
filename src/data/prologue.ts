// Prólogo animado (§9.7 do doc): as seis cenas, com a frase de cada uma, quanto duram e o clima
// da música. A cena (src/render/PrologueScene.ts) desenha; a narração e o som leem daqui.

export type PrologueMusic = 'noite' | 'tensao' | 'masmorra' | 'alvorada';

export interface PrologueShot {
  caption: string;
  seconds: number;
  music: PrologueMusic;
}

export const PROLOGUE: PrologueShot[] = [
  { caption: 'Antes da vila, havia a abadia.', seconds: 8, music: 'noite' },
  { caption: 'Uma noite, ela caiu no escuro.', seconds: 10, music: 'tensao' },
  { caption: 'Os velhos dizem que o abismo é uma pálpebra.', seconds: 10, music: 'masmorra' },
  { caption: 'Quem sobreviveu ficou, e acendeu uma fogueira.', seconds: 8, music: 'noite' },
  { caption: 'Os heróis vêm quando o berrante toca. Alguns não voltam.', seconds: 10, music: 'noite' },
  { caption: 'Você é o prefeito. Seu trabalho é manter a luz acesa.', seconds: 9, music: 'alvorada' },
];
