// Ícones em SVG simples (traço em currentColor), para não depender de emoji nem de fonte.

import type { RoomKind } from '../sim/index.ts';
import { PACK_BASE } from '../render/pack.ts';

const Svg = (props: { children: preact.ComponentChildren; label?: string }) => (
  <svg class="ico" viewBox="0 0 24 24" aria-hidden={props.label ? undefined : 'true'} aria-label={props.label} role={props.label ? 'img' : undefined}>
    {props.children}
  </svg>
);


/** Ícone de traço do pack como máscara: herda currentColor e não precisa de SVG inline. */
export const PackIcon = (props: { name: string; label?: string }) => {
  const url = `${PACK_BASE}export/ui/ui-icon-${props.name}.svg`;
  return (
    <span
      class="pack-mask-icon"
      aria-hidden={props.label ? undefined : 'true'}
      aria-label={props.label}
      role={props.label ? 'img' : undefined}
      style={{ maskImage: `url(${url})`, WebkitMaskImage: `url(${url})` }}
    />
  );
};

export const IconCoin = () => (
  <Svg>
    <ellipse cx="12" cy="8" rx="7" ry="3" />
    <path d="M5 8v4c0 1.7 3.1 3 7 3s7-1.3 7-3V8" />
    <path d="M5 12v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
  </Svg>
);

export const IconPeople = () => (
  <Svg>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 13.3c2.9.2 5.5 2.5 5.5 5.7" />
  </Svg>
);

export const IconHouse = () => (
  <Svg>
    <path d="M3.5 11.5L12 5l8.5 6.5" />
    <path d="M6 10.5V20h12v-9.5" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);

export const IconShield = () => (
  <Svg>
    <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z" />
  </Svg>
);

export const IconBone = () => (
  <Svg>
    <path d="M8 8l8 8" />
    <circle cx="6.5" cy="5.5" r="2" />
    <circle cx="5.5" cy="7.5" r="2" />
    <circle cx="18.5" cy="16.5" r="2" />
    <circle cx="17.5" cy="18.5" r="2" />
  </Svg>
);

export const IconSun = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </Svg>
);

export const IconMoon = () => (
  <Svg>
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
  </Svg>
);

export const IconAbyss = () => (
  <Svg>
    <path d="M3 7h18M5 11h14M8 15h8M10.5 19h3" />
  </Svg>
);

export const IconBook = () => (
  <Svg>
    <path d="M4 5c3-1.5 5.5-1.5 8 0v15c-2.5-1.5-5-1.5-8 0z" />
    <path d="M12 5c2.5-1.5 5-1.5 8 0v15c-3-1.5-5.5-1.5-8 0" />
  </Svg>
);

export const IconMenu = () => (
  <Svg>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconPause = () => (
  <Svg>
    <path d="M9 6v12M15 6v12" />
  </Svg>
);

export const IconSound = () => (
  <Svg label="Som ligado">
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
  </Svg>
);

export const IconMute = () => (
  <Svg label="Som desligado">
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
  </Svg>
);

export const IconSkull = () => (
  <Svg>
    <path d="M12 3c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4 2.5 5v3h10v-3c1.4-1 2.5-2.6 2.5-5 0-4-3.1-7-7.5-7z" />
    <circle cx="9" cy="11" r="1.6" />
    <circle cx="15" cy="11" r="1.6" />
    <path d="M10 18v3M14 18v3" />
  </Svg>
);

const ROOM_PATHS: Record<RoomKind, preact.ComponentChildren> = {
  matilha: <path d="M5 5l14 14M19 5L5 19M4 8l4-4M16 4l4 4M4 16l4 4M16 20l4-4" />,
  elite: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  bau: (
    <>
      <rect x="4" y="9" width="16" height="10" rx="1" />
      <path d="M4 9c0-3 3.6-4 8-4s8 1 8 4M12 12v3" />
    </>
  ),
  santuario: <path d="M12 3v18M6 9h12M8 21h8" />,
  vazia: <circle cx="12" cy="12" r="1.5" />,
  prisioneiro: (
    <>
      <rect x="6" y="10" width="12" height="10" rx="1.5" />
      <path d="M8.5 10V7a3.5 3.5 0 017 0v3" />
    </>
  ),
  restos: <path d="M7 21V9a5 5 0 0110 0v12M4 21h16M12 10v6M9.5 12.5h5" />,
  guardiao: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 11l2 2 4-4" />
    </>
  ),
  chefe: (
    <>
      <path d="M12 3c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4 2.5 5v3h10v-3c1.4-1 2.5-2.6 2.5-5 0-4-3.1-7-7.5-7z" />
      <circle cx="9" cy="11" r="1.6" />
      <circle cx="15" cy="11" r="1.6" />
    </>
  ),
  mercador: (
    <>
      <path d="M6 8h12l-1 12H7z" />
      <path d="M9 8a3 3 0 016 0M10 13h4" />
    </>
  ),
  armadilha: <path d="M3 20h18M5 20l2-7 2 7M10 20l2-9 2 9M15 20l2-7 2 7" />,
};

export const RoomIcon = (props: { kind: RoomKind | null }) => (
  <Svg>{props.kind ? ROOM_PATHS[props.kind] : <path d="M9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17v.5" />}</Svg>
);
