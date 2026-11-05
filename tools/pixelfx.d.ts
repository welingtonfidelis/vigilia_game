// Tipos do pixelfx (github.com/patch-gg/pixelfx, MIT), só o que o tools/pfx.ts usa.

declare module 'pixelfx' {
  export interface Frame {
    w: number;
    h: number;
    color: Uint32Array;
    light: Uint32Array;
  }
  export interface FxMeta {
    name: string;
    size: [number, number];
    origin: [number, number];
    duration: number;
    loop: boolean;
    fps: number;
  }
  export interface FxModule {
    meta: FxMeta;
    /** Tempos do golpe (o acerto em `hits[0].t`, segundos desde o primeiro quadro). */
    act?: { hits?: { t: number }[] };
  }
  export interface FxInstance {
    update(dt: number): void;
    draw(frame: Frame, layer?: 'back' | 'front'): void;
  }
  export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
  export function clearFrame(f: Frame): Frame;
  export function createFx(mod: FxModule, o?: Record<string, unknown>): FxInstance;
  export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | null, lightK?: number): Uint8ClampedArray;
}
