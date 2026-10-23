// Vento nas árvores (Fase 4 do visual 2.5D): um pipeline WebGL igual ao padrão do Phaser,
// só com o vértice mexido. O topo da imagem balança para os lados e o pé fica parado
// (curva quadrática), numa onda que corre pela floresta com rajadas lentas. Custo zero
// na CPU: centenas de árvores balançam sem um tween sequer.

import Phaser from 'phaser';

export const WIND_PIPELINE = 'VigiliaWind';

/** Quanto o topo da árvore anda para o lado, em px do mundo. */
const AMPLITUDE = 1.6;

const VERT = `
#define SHADER_NAME VIGILIA_WIND_VS
precision mediump float;
uniform mat4 uProjectionMatrix;
uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform vec2 uView;
uniform float uAmp;
attribute vec2 inPosition;
attribute vec2 inTexCoord;
attribute float inTexId;
attribute float inTintEffect;
attribute vec4 inTint;
varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;
void main () {
    // Posição no mundo (câmera sem rotação): a onda é do mundo, não da tela.
    vec2 world = inPosition / uZoom + uView;
    float lift = 1.0 - inTexCoord.y;
    float bend = lift * lift;
    float gust = 0.55 + 0.45 * sin(uTime * 0.37 + world.x * 0.0015);
    float sway = sin(uTime * 1.3 + world.x * 0.004 + world.y * 0.002) * gust;
    vec2 pos = inPosition + vec2(sway * uAmp * bend * uZoom, 0.0);
    gl_Position = uProjectionMatrix * vec4(pos, 1.0, 1.0);
    outTexCoord = inTexCoord;
    outTexId = inTexId;
    outTint = inTint;
    outTintEffect = inTintEffect;
}
`;

class WindPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: WIND_PIPELINE, vertShader: VERT });
  }

  override onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uAmp', AMPLITUDE);
  }

  override onRender(_scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void {
    // tela = (mundo − rolagem − origem)·zoom + origem  ⇒  mundo = tela/zoom + rolagem + origem·(1 − 1/zoom)
    const zoom = camera.zoom;
    const ox = camera.width * camera.originX;
    const oy = camera.height * camera.originY;
    this.set1f('uZoom', zoom);
    this.set2f('uView', camera.scrollX + ox * (1 - 1 / zoom), camera.scrollY + oy * (1 - 1 / zoom));
  }
}

/** Registra o pipeline (uma vez por jogo); no Canvas não há vento e tudo segue igual. */
export function registerWind(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  if (!renderer.pipelines.has(WIND_PIPELINE)) renderer.pipelines.add(WIND_PIPELINE, new WindPipeline(game));
  return true;
}

/** Árvores que balançam, com a arte de origem (M6 F6: a estação troca a textura delas). */
export const TREES = new Map<Phaser.GameObjects.Image, string>();

/** Faz a imagem balançar com o vento (se o pipeline existe). */
export function sway<T extends Phaser.GameObjects.Image>(image: T): T {
  const renderer = image.scene.game.renderer;
  if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer && renderer.pipelines.has(WIND_PIPELINE)) image.setPipeline(WIND_PIPELINE);
  TREES.set(image, image.texture.key.replace(/^p32\//, ''));
  image.once(Phaser.GameObjects.Events.DESTROY, () => TREES.delete(image));
  return image;
}
