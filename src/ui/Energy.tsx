import { BALANCE } from '../sim/index.ts';

/** Energia do prefeito: velas acesas e apagadas (recarrega todo dia). */
export function EnergyCandles(props: { energy: number; label?: boolean }) {
  const max = BALANCE.mayorEnergy;
  const lit = Math.max(0, Math.min(max, Math.floor(props.energy)));
  return (
    <span class="candles" aria-label={`Energia do prefeito: ${lit} de ${max}`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} class={`candle${i < lit ? ' lit' : ''}`} />
      ))}
      {props.label && <span class="candles-label">{lit}</span>}
    </span>
  );
}
