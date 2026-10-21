// Copas em primeiro plano (Fase 4 do visual 2.5D): silhuetas escuras de árvores "perto da
// câmera" nas bordas da vila. Correm mais rápido que o mundo quando a câmera anda (1,15×),
// então só aparecem quando ela chega na beira do mapa, emoldurando a vila; no meio da
// vila elas já saíram da tela. Não recebem clique e não ocupam chão.

import Phaser from 'phaser';

export type Edge = 'top' | 'bottom' | 'left' | 'right';

interface Item {
  image: Phaser.GameObjects.Image;
  /** Onde a copa fica quando a câmera está encostada na borda dela. */
  x: number;
  y: number;
  edge: Edge;
}

export class ParallaxLayer {
  private readonly items: Item[] = [];
  private readonly factor: number;
  private readonly worldW: number;
  private readonly worldH: number;

  constructor(worldW: number, worldH: number, factor = 1.15) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.factor = factor;
  }

  add(image: Phaser.GameObjects.Image, edge: Edge): void {
    this.items.push({ image, x: image.x, y: image.y, edge });
  }

  /**
   * Posição de cada copa neste quadro. Com a câmera encostada na borda da copa, ela fica
   * no lugar desenhado; a cada px que a câmera anda, a copa anda (fator − 1) px a mais
   * para o lado contrário (na tela, 1,15× o movimento do mundo).
   */
  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = camera.worldView;
    const mid = camera.midPoint;
    const k = this.factor - 1;
    for (const it of this.items) {
      const refX = it.edge === 'left' ? view.width / 2 : it.edge === 'right' ? this.worldW - view.width / 2 : it.x;
      const refY = it.edge === 'top' ? view.height / 2 : it.edge === 'bottom' ? this.worldH - view.height / 2 : it.y;
      it.image.setPosition(it.x - k * (mid.x - refX), it.y - k * (mid.y - refY));
    }
  }
}
