// Um corredor por grupo no abismo, rodando o tempo todo em segundo plano. A tela de
// acompanhar só pendura o canvas no corredor do grupo; assim, abrir no meio da
// expedição mostra o grupo onde ele está, e não uma cena montada às pressas.

import type { World } from '../../sim/index.ts';
import { LaneRenderer, type LaneHost } from './renderer.ts';

export class LaneDirector {
  private readonly lanes = new Map<number, LaneRenderer>();
  private host: LaneHost | null = null;
  private world: World | null = null;

  /** Liga ao jogo e passa a andar a cada quadro. */
  start(host: LaneHost): void {
    this.host = host;
    const loop = (now: number): void => {
      this.tick(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  tick(now: number): void {
    const host = this.host;
    if (!host) return;
    const world = host.world();
    // Jogo carregado ou novo: os números dos grupos recomeçam.
    if (world !== this.world) {
      this.lanes.clear();
      this.world = world;
    }
    for (const p of world.parties) if (!this.lanes.has(p.id)) this.lanes.set(p.id, new LaneRenderer(host, p.id));
    for (const id of [...this.lanes.keys()]) if (!world.parties.some((p) => p.id === id)) this.lanes.delete(id);
    for (const lane of this.lanes.values()) lane.frame(now);
  }

  /** O corredor do grupo (cria na hora se o grupo acabou de sair). */
  lane(partyId: number): LaneRenderer | null {
    if (!this.host) return null;
    let lane = this.lanes.get(partyId);
    if (!lane) {
      lane = new LaneRenderer(this.host, partyId);
      this.lanes.set(partyId, lane);
    }
    return lane;
  }
}

export const lanes = new LaneDirector();
