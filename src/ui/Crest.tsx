// Brasão de uma casa (M6 F5): escudo na cor do campo, símbolo na cor da figura e uma estrela
// por feito da casa, no alto. Tudo em SVG, para servir em qualquer tamanho.

import { CREST_SYMBOLS, CREST_TINCTURES } from '../data/houses.ts';
import type { House } from '../sim/index.ts';

const SYMBOLS: Record<string, preact.JSX.Element> = {
  torre: <path d="M7.5 7h2v1.5h1.5V7h2v1.5h1.5V7h2v3.5h-9z M8.5 10.5h7V18h-7z" fill="currentColor" />,
  chave: (
    <g fill="none" stroke="currentColor" stroke-width="1.8">
      <circle cx="9" cy="9" r="2.6" />
      <path d="M10.9 10.9 17 17M14.5 14.5l1.6-1.6M16 16l1.6-1.6" />
    </g>
  ),
  lua: <path d="M14.5 6.5a6 6 0 1 0 0 11 5 5 0 0 1 0-11z" fill="currentColor" />,
  sol: (
    <g fill="currentColor" stroke="currentColor">
      <circle cx="12" cy="12" r="3" stroke="none" />
      <path d="M12 5.5v2M12 16.5v2M5.5 12h2M16.5 12h2M7.4 7.4l1.4 1.4M15.2 15.2l1.4 1.4M7.4 16.6l1.4-1.4M15.2 8.8l1.4-1.4" stroke-width="1.5" fill="none" />
    </g>
  ),
  estrela: <path d="M12 5.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5-4.1-2.4-4.1 2.4 1.1-4.5-3.5-3 4.6-.4z" fill="currentColor" />,
  espada: <path d="M12 5l1.2 2v8h-2.4V7z M8.5 15h7v1.4h-7z M11.3 16.4h1.4v2.6h-1.4z" fill="currentColor" />,
  martelo: <path d="M7.5 6.5h9v3.5h-9z M11.2 10h1.6v8.5h-1.6z" fill="currentColor" />,
  vela: <path d="M10 10h4v8.5h-4z M12 5.5c1.3 1.4 1.5 2.6 0 3.8-1.5-1.2-1.3-2.4 0-3.8z" fill="currentColor" />,
  olho: (
    <g>
      <path d="M5.5 12c2-3.2 4.2-4.6 6.5-4.6s4.5 1.4 6.5 4.6c-2 3.2-4.2 4.6-6.5 4.6S7.5 15.2 5.5 12z" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </g>
  ),
  árvore: <path d="M12 5.5l4.5 6h-2.5l3 4h-10l3-4H7.5z M11.2 15.5h1.6v3h-1.6z" fill="currentColor" />,
  coroa: <path d="M6.5 9l2.8 2.5L12 7l2.7 4.5L17.5 9l-1 7h-9z M7.5 16.8h9v1.6h-9z" fill="currentColor" />,
  corvo: (
    <path
      d="M6 13.5c2-.3 3.3-1.6 4.4-3.3.9-1.4 2.3-2.2 3.9-2l1.9-1-.6 1.6c.9.8 1.2 2 .8 3.2-.6 1.9-2.4 3.2-4.6 3.4l-1 2.6h-1.2l.7-2.6c-1.9 0-3.4-.7-4.3-1.9z"
      fill="currentColor"
    />
  ),
};

const SHIELD = 'M4 3h16v8.5c0 5.6-3.8 8.9-8 10.5-4.2-1.6-8-4.9-8-10.5z';

export function Crest(props: { house: House; size?: number }) {
  const { field, charge, symbol } = props.house.crest;
  const size = props.size ?? 28;
  const fieldColor = CREST_TINCTURES[field]?.color ?? '#333';
  const chargeColor = CREST_TINCTURES[charge]?.color ?? '#ddd';
  const deeds = props.house.deeds.length;
  return (
    <svg class="crest" viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={`Brasão da casa ${props.house.name}`}>
      <path d={SHIELD} fill={fieldColor} stroke="#0d0b09" stroke-width="1" />
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.6" transform="translate(12 12) scale(0.86) translate(-12 -12)" />
      <g style={{ color: chargeColor }} transform="translate(12 12.6) scale(0.82) translate(-12 -12)">
        {SYMBOLS[CREST_SYMBOLS[symbol] ?? 'estrela']}
      </g>
      {Array.from({ length: Math.min(3, deeds) }, (_, i) => (
        <circle key={i} cx={12 + (i - (Math.min(3, deeds) - 1) / 2) * 3.2} cy="4.9" r="0.95" fill="#e9c46a" />
      ))}
    </svg>
  );
}
