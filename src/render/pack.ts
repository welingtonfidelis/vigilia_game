// Gerado a partir do manifest do pack vigilia-art 1.9.0 (+ corredor dos 6 atos e caminhada de perfil dos 12 heróis + estilo novo 24×32: heróis, prefeito, moradores e crianças). Não editar à mão.

export interface PackAnim { frames: number[]; fps: number; }
export interface PackAsset {
  id: string;
  type: 'tileset' | 'building' | 'prop' | 'decal' | 'fx' | 'character' | 'ui-icon' | 'portrait' | 'arena-layer' | 'ui' | 'web-icon';
  file: string;
  lights?: string; small?: string; meta?: string;
  frameSize?: [number, number]; sheetSize?: [number, number]; frames?: number; fps?: number;
  animations?: Record<string, PackAnim>; anchor?: [number, number]; tileSize?: [number, number];
  columns?: number; rows?: number; size?: [number, number]; variant?: string; format?: string;
  layer?: string; act?: string; actName?: string; floor?: number; opaque?: boolean;
  stageY?: number; tileX?: boolean; parallax?: number; stagePos?: [number, number];
  tint?: boolean; panelScale?: number; name?: string; baseId?: string; floors?: number[];
  /** Caminhada de perfil: px que o personagem avança num ciclo inteiro. */
  stride?: number;
}

export const PACK_ASSETS: PackAsset[] = [
  {
    "id": "tile/town/terrain",
    "type": "tileset",
    "file": "export/tiles/town-terrain.png",
    "meta": "export/tiles/town-terrain.json",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      128,
      128
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 8
  },
  {
    "id": "building/templo/level-1",
    "type": "building",
    "file": "export/png/building-templo-level-1.png",
    "lights": "export/png/building-templo-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/templo/level-2",
    "type": "building",
    "file": "export/png/building-templo-level-2.png",
    "lights": "export/png/building-templo-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/templo/level-3",
    "type": "building",
    "file": "export/png/building-templo-level-3.png",
    "lights": "export/png/building-templo-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/templo/ruin",
    "type": "building",
    "file": "export/png/building-templo-ruin.png",
    "lights": "export/png/building-templo-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/taverna/level-1",
    "type": "building",
    "file": "export/png/building-taverna-level-1.png",
    "lights": "export/png/building-taverna-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/taverna/level-2",
    "type": "building",
    "file": "export/png/building-taverna-level-2.png",
    "lights": "export/png/building-taverna-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/taverna/level-3",
    "type": "building",
    "file": "export/png/building-taverna-level-3.png",
    "lights": "export/png/building-taverna-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/taverna/ruin",
    "type": "building",
    "file": "export/png/building-taverna-ruin.png",
    "lights": "export/png/building-taverna-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/guilda/level-1",
    "type": "building",
    "file": "export/png/building-guilda-level-1.png",
    "lights": "export/png/building-guilda-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/guilda/level-2",
    "type": "building",
    "file": "export/png/building-guilda-level-2.png",
    "lights": "export/png/building-guilda-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/guilda/level-3",
    "type": "building",
    "file": "export/png/building-guilda-level-3.png",
    "lights": "export/png/building-guilda-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/guilda/ruin",
    "type": "building",
    "file": "export/png/building-guilda-ruin.png",
    "lights": "export/png/building-guilda-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/estalagem/level-1",
    "type": "building",
    "file": "export/png/building-estalagem-level-1.png",
    "lights": "export/png/building-estalagem-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/estalagem/level-2",
    "type": "building",
    "file": "export/png/building-estalagem-level-2.png",
    "lights": "export/png/building-estalagem-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/estalagem/level-3",
    "type": "building",
    "file": "export/png/building-estalagem-level-3.png",
    "lights": "export/png/building-estalagem-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/estalagem/ruin",
    "type": "building",
    "file": "export/png/building-estalagem-ruin.png",
    "lights": "export/png/building-estalagem-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/casa/level-1",
    "type": "building",
    "file": "export/png/building-casa-level-1.png",
    "lights": "export/png/building-casa-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/casa/level-2",
    "type": "building",
    "file": "export/png/building-casa-level-2.png",
    "lights": "export/png/building-casa-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/casa/level-3",
    "type": "building",
    "file": "export/png/building-casa-level-3.png",
    "lights": "export/png/building-casa-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/casa/ruin",
    "type": "building",
    "file": "export/png/building-casa-ruin.png",
    "lights": "export/png/building-casa-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/campo/level-1",
    "type": "building",
    "file": "export/png/building-campo-level-1.png",
    "lights": "export/png/building-campo-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      144,
      96
    ]
  },
  {
    "id": "building/campo/level-2",
    "type": "building",
    "file": "export/png/building-campo-level-2.png",
    "lights": "export/png/building-campo-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      144,
      96
    ]
  },
  {
    "id": "building/campo/level-3",
    "type": "building",
    "file": "export/png/building-campo-level-3.png",
    "lights": "export/png/building-campo-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      144,
      96
    ]
  },
  {
    "id": "building/campo/ruin",
    "type": "building",
    "file": "export/png/building-campo-ruin.png",
    "lights": "export/png/building-campo-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      144,
      96
    ]
  },
  {
    "id": "building/ferreiro/level-1",
    "type": "building",
    "file": "export/png/building-ferreiro-level-1.png",
    "lights": "export/png/building-ferreiro-level-1-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/ferreiro/level-2",
    "type": "building",
    "file": "export/png/building-ferreiro-level-2.png",
    "lights": "export/png/building-ferreiro-level-2-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/ferreiro/level-3",
    "type": "building",
    "file": "export/png/building-ferreiro-level-3.png",
    "lights": "export/png/building-ferreiro-level-3-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/ferreiro/ruin",
    "type": "building",
    "file": "export/png/building-ferreiro-ruin.png",
    "lights": "export/png/building-ferreiro-ruin-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      112,
      96
    ]
  },
  {
    "id": "building/house/01",
    "type": "building",
    "file": "export/png/building-house-01.png",
    "lights": "export/png/building-house-01-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      48
    ]
  },
  {
    "id": "building/house/02",
    "type": "building",
    "file": "export/png/building-house-02.png",
    "lights": "export/png/building-house-02-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      48
    ]
  },
  {
    "id": "building/house/03",
    "type": "building",
    "file": "export/png/building-house-03.png",
    "lights": "export/png/building-house-03-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      48
    ]
  },
  {
    "id": "building/house/04",
    "type": "building",
    "file": "export/png/building-house-04.png",
    "lights": "export/png/building-house-04-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      48
    ]
  },
  {
    "id": "building/house/05",
    "type": "building",
    "file": "export/png/building-house-05.png",
    "lights": "export/png/building-house-05-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      48
    ]
  },
  {
    "id": "prop/gate-horn/open",
    "type": "prop",
    "file": "export/png/prop-gate-horn-open.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      96
    ]
  },
  {
    "id": "prop/gate-horn/closed",
    "type": "prop",
    "file": "export/png/prop-gate-horn-closed.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      96
    ]
  },
  {
    "id": "prop/thermal/basin",
    "type": "prop",
    "file": "export/png/prop-thermal-basin.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      64
    ]
  },
  {
    "id": "prop/thermal/basin-empty",
    "type": "prop",
    "file": "export/png/prop-thermal-basin-empty.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      64
    ]
  },
  {
    "id": "prop/thermal/water",
    "type": "prop",
    "file": "export/png/prop-thermal-water.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      64
    ]
  },
  {
    "id": "prop/thermal/bench",
    "type": "prop",
    "file": "export/png/prop-thermal-bench.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "prop/coffer",
    "type": "prop",
    "file": "export/png/prop-coffer.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/board",
    "type": "prop",
    "file": "export/png/prop-board.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/campfire/off",
    "type": "prop",
    "file": "export/png/prop-campfire-off.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/campfire/on",
    "type": "prop",
    "file": "export/png/prop-campfire-on.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/tree/01",
    "type": "prop",
    "file": "export/png/prop-tree-01.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/tree/dead",
    "type": "prop",
    "file": "export/png/prop-tree-dead.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/abyss/cave",
    "type": "prop",
    "file": "export/png/prop-abyss-cave.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      80,
      64
    ]
  },
  {
    "id": "prop/tree/pine",
    "type": "prop",
    "file": "export/png/prop-tree-pine.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      48
    ]
  },
  {
    "id": "prop/boulder/01",
    "type": "prop",
    "file": "export/png/prop-boulder-01.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/boulder/02",
    "type": "prop",
    "file": "export/png/prop-boulder-02.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "decal/grave",
    "type": "decal",
    "file": "export/png/decal-grave.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      10,
      12
    ]
  },
  {
    "id": "decal/sign",
    "type": "decal",
    "file": "export/png/decal-sign.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "decal/banner",
    "type": "decal",
    "file": "export/png/decal-banner.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      32
    ]
  },
  {
    "id": "decal/rubble",
    "type": "decal",
    "file": "export/png/decal-rubble.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "fx/steam",
    "type": "fx",
    "file": "export/fx/fx-steam.png",
    "meta": "export/fx/fx-steam.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "frameSize": [
      32,
      32
    ],
    "sheetSize": [
      256,
      32
    ],
    "frames": 8,
    "fps": 8,
    "columns": 8,
    "rows": 1
  },
  {
    "id": "fx/fire",
    "type": "fx",
    "file": "export/fx/fx-fire.png",
    "meta": "export/fx/fx-fire.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ],
    "frameSize": [
      16,
      16
    ],
    "sheetSize": [
      96,
      16
    ],
    "frames": 6,
    "fps": 10,
    "columns": 6,
    "rows": 1
  },
  {
    "id": "fx/spark",
    "type": "fx",
    "file": "export/fx/fx-spark.png",
    "meta": "export/fx/fx-spark.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      8,
      8
    ],
    "frameSize": [
      8,
      8
    ],
    "sheetSize": [
      32,
      8
    ],
    "frames": 4,
    "fps": 12,
    "columns": 4,
    "rows": 1
  },
  {
    "id": "char/villager/lavrador/m",
    "type": "character",
    "file": "export/png/char-villager-lavrador-m.png",
    "meta": "export/png/char-villager-lavrador-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/lavrador/f",
    "type": "character",
    "file": "export/png/char-villager-lavrador-f.png",
    "meta": "export/png/char-villager-lavrador-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/artesa/m",
    "type": "character",
    "file": "export/png/char-villager-artesa-m.png",
    "meta": "export/png/char-villager-artesa-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/artesa/f",
    "type": "character",
    "file": "export/png/char-villager-artesa-f.png",
    "meta": "export/png/char-villager-artesa-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/acolito/m",
    "type": "character",
    "file": "export/png/char-villager-acolito-m.png",
    "meta": "export/png/char-villager-acolito-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/acolito/f",
    "type": "character",
    "file": "export/png/char-villager-acolito-f.png",
    "meta": "export/png/char-villager-acolito-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/guarda/m",
    "type": "character",
    "file": "export/png/char-villager-guarda-m.png",
    "meta": "export/png/char-villager-guarda-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/villager/guarda/f",
    "type": "character",
    "file": "export/png/char-villager-guarda-f.png",
    "meta": "export/png/char-villager-guarda-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      72,
      32
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/hero/guardiao/m",
    "type": "character",
    "file": "export/png/char-hero-guardiao-m.png",
    "meta": "export/png/char-hero-guardiao-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/guardiao/f",
    "type": "character",
    "file": "export/png/char-hero-guardiao-f.png",
    "meta": "export/png/char-hero-guardiao-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/selvagem/m",
    "type": "character",
    "file": "export/png/char-hero-selvagem-m.png",
    "meta": "export/png/char-hero-selvagem-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/selvagem/f",
    "type": "character",
    "file": "export/png/char-hero-selvagem-f.png",
    "meta": "export/png/char-hero-selvagem-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/lanceiro/m",
    "type": "character",
    "file": "export/png/char-hero-lanceiro-m.png",
    "meta": "export/png/char-hero-lanceiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/lanceiro/f",
    "type": "character",
    "file": "export/png/char-hero-lanceiro-f.png",
    "meta": "export/png/char-hero-lanceiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/arqueiro/m",
    "type": "character",
    "file": "export/png/char-hero-arqueiro-m.png",
    "meta": "export/png/char-hero-arqueiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/arqueiro/f",
    "type": "character",
    "file": "export/png/char-hero-arqueiro-f.png",
    "meta": "export/png/char-hero-arqueiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/clerigo/m",
    "type": "character",
    "file": "export/png/char-hero-clerigo-m.png",
    "meta": "export/png/char-hero-clerigo-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/clerigo/f",
    "type": "character",
    "file": "export/png/char-hero-clerigo-f.png",
    "meta": "export/png/char-hero-clerigo-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/piromante/m",
    "type": "character",
    "file": "export/png/char-hero-piromante-m.png",
    "meta": "export/png/char-hero-piromante-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/hero/piromante/f",
    "type": "character",
    "file": "export/png/char-hero-piromante-f.png",
    "meta": "export/png/char-hero-piromante-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      288,
      28
    ],
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    },
    "columns": 18,
    "rows": 1
  },
  {
    "id": "char/mayor",
    "type": "character",
    "file": "export/png/char-mayor.png",
    "meta": "export/png/char-mayor.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "frames": 8,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      }
    },
    "columns": 8,
    "rows": 1
  },
  {
    "id": "char/mayor/f",
    "type": "character",
    "file": "export/png/char-mayor-f.png",
    "meta": "export/png/char-mayor-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "frames": 8,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      }
    },
    "columns": 8,
    "rows": 1
  },
  {
    "id": "ui/icon/activity/descansar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-descansar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/beber",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-beber.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/rezar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-rezar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/comprar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-comprar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/treinar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-treinar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/tumulo",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-tumulo.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/socializar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-socializar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/aguardar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-aguardar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/tratar",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-tratar.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/activity/termas",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-activity-termas.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/resource/gold",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-resource-gold.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/resource/materials",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-resource-materials.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/resource/population",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-resource-population.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/resource/heroes",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-resource-heroes.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/resource/energy",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-resource-energy.svg",
    "anchor": [
      0,
      0
    ],
    "size": [
      24,
      24
    ],
    "format": "svg"
  },
  {
    "id": "ui/icon/rank/E",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-e.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-e-glyph.png"
  },
  {
    "id": "ui/icon/rank/D",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-d.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-d-glyph.png"
  },
  {
    "id": "ui/icon/rank/C",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-c.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-c-glyph.png"
  },
  {
    "id": "ui/icon/rank/B",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-b.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-b-glyph.png"
  },
  {
    "id": "ui/icon/rank/A",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-a.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-a-glyph.png"
  },
  {
    "id": "ui/icon/rank/S",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-rank-s.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      16,
      16
    ],
    "variant": "export/ui/ui-icon-rank-s-glyph.png"
  },
  {
    "id": "ui/icon/weapon/guardiao",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-guardiao.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/weapon/selvagem",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-selvagem.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/weapon/lanceiro",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-lanceiro.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/weapon/arqueiro",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-arqueiro.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/weapon/clerigo",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-clerigo.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/weapon/piromante",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-weapon-piromante.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/icon/armor",
    "type": "ui-icon",
    "file": "export/ui/ui-icon-armor.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      24,
      24
    ]
  },
  {
    "id": "ui/portrait/hero/guardiao/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-guardiao-m.png",
    "small": "export/ui/ui-portrait-hero-guardiao-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/guardiao/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-guardiao-f.png",
    "small": "export/ui/ui-portrait-hero-guardiao-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/selvagem/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-selvagem-m.png",
    "small": "export/ui/ui-portrait-hero-selvagem-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/selvagem/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-selvagem-f.png",
    "small": "export/ui/ui-portrait-hero-selvagem-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/lanceiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-lanceiro-m.png",
    "small": "export/ui/ui-portrait-hero-lanceiro-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/lanceiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-lanceiro-f.png",
    "small": "export/ui/ui-portrait-hero-lanceiro-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/arqueiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-arqueiro-m.png",
    "small": "export/ui/ui-portrait-hero-arqueiro-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/arqueiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-arqueiro-f.png",
    "small": "export/ui/ui-portrait-hero-arqueiro-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/clerigo/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-clerigo-m.png",
    "small": "export/ui/ui-portrait-hero-clerigo-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/clerigo/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-clerigo-f.png",
    "small": "export/ui/ui-portrait-hero-clerigo-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/piromante/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-piromante-m.png",
    "small": "export/ui/ui-portrait-hero-piromante-m-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/hero/piromante/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-piromante-f.png",
    "small": "export/ui/ui-portrait-hero-piromante-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/mayor",
    "type": "portrait",
    "file": "export/ui/ui-portrait-mayor.png",
    "small": "export/ui/ui-portrait-mayor-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "ui/portrait/mayor/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-mayor-f.png",
    "small": "export/ui/ui-portrait-mayor-f-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ]
  },
  {
    "id": "char/child/m",
    "type": "character",
    "file": "export/png/char-child-m.png",
    "meta": "export/png/char-child-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      22
    ],
    "frameSize": [
      16,
      22
    ],
    "sheetSize": [
      48,
      22
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/child/f",
    "type": "character",
    "file": "export/png/char-child-f.png",
    "meta": "export/png/char-child-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      22
    ],
    "frameSize": [
      16,
      22
    ],
    "sheetSize": [
      48,
      22
    ],
    "frames": 3,
    "animations": {
      "idle": {
        "frames": [
          0
        ],
        "fps": 1
      },
      "walk": {
        "frames": [
          1,
          0,
          2,
          0
        ],
        "fps": 8
      }
    },
    "columns": 3,
    "rows": 1
  },
  {
    "id": "tile/town/cemetery-fence",
    "type": "tileset",
    "file": "export/tiles/cemetery-fence.png",
    "meta": "export/tiles/cemetery-fence.json",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      128,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 1
  },
  {
    "id": "tile/town/wood-fence",
    "type": "tileset",
    "file": "export/tiles/wood-fence.png",
    "meta": "export/tiles/wood-fence.json",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      128,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 1
  },
  {
    "id": "prop/well",
    "type": "prop",
    "file": "export/png/prop-well.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ]
  },
  {
    "id": "prop/hay",
    "type": "prop",
    "file": "export/png/prop-hay.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "prop/sacks",
    "type": "prop",
    "file": "export/png/prop-sacks.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "prop/bucket",
    "type": "prop",
    "file": "export/png/prop-bucket.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "prop/logs",
    "type": "prop",
    "file": "export/png/prop-logs.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      16
    ]
  },
  {
    "id": "prop/barrel",
    "type": "prop",
    "file": "export/png/prop-barrel.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "prop/crate",
    "type": "prop",
    "file": "export/png/prop-crate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "char/monster/esqueleto",
    "type": "character",
    "file": "export/png/char-monster-esqueleto.png",
    "meta": "export/png/char-monster-esqueleto.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "I",
    "panelScale": 2,
    "name": "Esqueleto Rangente"
  },
  {
    "id": "char/monster/rato",
    "type": "character",
    "file": "export/png/char-monster-rato.png",
    "meta": "export/png/char-monster-rato.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      16
    ],
    "frameSize": [
      24,
      16
    ],
    "sheetSize": [
      456,
      16
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "I",
    "panelScale": 2,
    "name": "Rato-de-ossuário"
  },
  {
    "id": "char/monster/acolito",
    "type": "character",
    "file": "export/png/char-monster-acolito.png",
    "meta": "export/png/char-monster-acolito.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "I",
    "panelScale": 2,
    "name": "Acólito Caído"
  },
  {
    "id": "char/monster/mineiro",
    "type": "character",
    "file": "export/png/char-monster-mineiro.png",
    "meta": "export/png/char-monster-mineiro.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "II",
    "panelScale": 2,
    "name": "Mineiro Afogado"
  },
  {
    "id": "char/monster/enguia",
    "type": "character",
    "file": "export/png/char-monster-enguia.png",
    "meta": "export/png/char-monster-enguia.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "II",
    "panelScale": 2,
    "name": "Enguia de Breu"
  },
  {
    "id": "char/monster/golem",
    "type": "character",
    "file": "export/png/char-monster-golem.png",
    "meta": "export/png/char-monster-golem.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "II",
    "panelScale": 2,
    "name": "Golem de Ferro-negro"
  },
  {
    "id": "char/monster/esporento",
    "type": "character",
    "file": "export/png/char-monster-esporento.png",
    "meta": "export/png/char-monster-esporento.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "III",
    "panelScale": 2,
    "name": "Esporento"
  },
  {
    "id": "char/monster/aranha",
    "type": "character",
    "file": "export/png/char-monster-aranha.png",
    "meta": "export/png/char-monster-aranha.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      24
    ],
    "frameSize": [
      32,
      24
    ],
    "sheetSize": [
      608,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "III",
    "panelScale": 2,
    "name": "Aranha-de-micélio"
  },
  {
    "id": "char/monster/brotado",
    "type": "character",
    "file": "export/png/char-monster-brotado.png",
    "meta": "export/png/char-monster-brotado.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "III",
    "panelScale": 2,
    "name": "Brotado"
  },
  {
    "id": "char/monster/sacerdote",
    "type": "character",
    "file": "export/png/char-monster-sacerdote.png",
    "meta": "export/png/char-monster-sacerdote.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "IV",
    "panelScale": 2,
    "name": "Sacerdote Afogado"
  },
  {
    "id": "char/monster/sereia",
    "type": "character",
    "file": "export/png/char-monster-sereia.png",
    "meta": "export/png/char-monster-sereia.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      28
    ],
    "frameSize": [
      24,
      28
    ],
    "sheetSize": [
      456,
      28
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "IV",
    "panelScale": 2,
    "name": "Sereia de Lodo"
  },
  {
    "id": "char/monster/cavaleiroSalobro",
    "type": "character",
    "file": "export/png/char-monster-cavaleiro-salobro.png",
    "meta": "export/png/char-monster-cavaleiro-salobro.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "IV",
    "panelScale": 2,
    "name": "Cavaleiro Salobro"
  },
  {
    "id": "char/monster/ferreiroCinzento",
    "type": "character",
    "file": "export/png/char-monster-ferreiro-cinzento.png",
    "meta": "export/png/char-monster-ferreiro-cinzento.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "V",
    "panelScale": 2,
    "name": "Ferreiro Cinzento"
  },
  {
    "id": "char/monster/caoBrasa",
    "type": "character",
    "file": "export/png/char-monster-cao-brasa.png",
    "meta": "export/png/char-monster-cao-brasa.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      18
    ],
    "frameSize": [
      24,
      18
    ],
    "sheetSize": [
      456,
      18
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "V",
    "panelScale": 2,
    "name": "Cão de Brasa"
  },
  {
    "id": "char/monster/escravoForja",
    "type": "character",
    "file": "export/png/char-monster-escravo-forja.png",
    "meta": "export/png/char-monster-escravo-forja.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "V",
    "panelScale": 2,
    "name": "Escravo da Forja"
  },
  {
    "id": "char/monster/sombra",
    "type": "character",
    "file": "export/png/char-monster-sombra.png",
    "meta": "export/png/char-monster-sombra.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "VI",
    "panelScale": 2,
    "name": "Sombra Faminta"
  },
  {
    "id": "char/monster/lamento",
    "type": "character",
    "file": "export/png/char-monster-lamento.png",
    "meta": "export/png/char-monster-lamento.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "VI",
    "panelScale": 2,
    "name": "Lamento"
  },
  {
    "id": "char/monster/arauto",
    "type": "character",
    "file": "export/png/char-monster-arauto.png",
    "meta": "export/png/char-monster-arauto.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "VI",
    "panelScale": 2,
    "name": "Arauto do Fundo"
  },
  {
    "id": "char/boss/guardiaoUrnas",
    "type": "character",
    "file": "export/png/char-boss-guardiao-urnas.png",
    "meta": "export/png/char-boss-guardiao-urnas.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "I",
    "panelScale": 1,
    "name": "O Guardião das Urnas"
  },
  {
    "id": "char/boss/couraca",
    "type": "character",
    "file": "export/png/char-boss-couraca.png",
    "meta": "export/png/char-boss-couraca.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      56,
      48
    ],
    "frameSize": [
      56,
      48
    ],
    "sheetSize": [
      1064,
      48
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "II",
    "panelScale": 1,
    "name": "A Couraça Submersa"
  },
  {
    "id": "char/boss/maeBolor",
    "type": "character",
    "file": "export/png/char-boss-mae-bolor.png",
    "meta": "export/png/char-boss-mae-bolor.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "III",
    "panelScale": 1,
    "name": "A Mãe-Bolor"
  },
  {
    "id": "char/boss/arcebispo",
    "type": "character",
    "file": "export/png/char-boss-arcebispo.png",
    "meta": "export/png/char-boss-arcebispo.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      60
    ],
    "frameSize": [
      48,
      60
    ],
    "sheetSize": [
      912,
      60
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "IV",
    "panelScale": 1,
    "name": "O Arcebispo Sem Fôlego"
  },
  {
    "id": "char/boss/martelo",
    "type": "character",
    "file": "export/png/char-boss-martelo.png",
    "meta": "export/png/char-boss-martelo.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "V",
    "panelScale": 1,
    "name": "O Martelo Que Não Dorme"
  },
  {
    "id": "char/boss/aquiloQueVigia",
    "type": "character",
    "file": "export/png/char-boss-aquilo-que-vigia.png",
    "meta": "export/png/char-boss-aquilo-que-vigia.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      1216,
      64
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "act": "VI",
    "panelScale": 1,
    "name": "Aquilo que Vigia"
  },
  {
    "id": "tile/town/autumn-grass-0",
    "type": "tileset",
    "file": "export/tiles/autumn-grass-0.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      16,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 1,
    "rows": 1
  },
  {
    "id": "tile/town/autumn-grass-1",
    "type": "tileset",
    "file": "export/tiles/autumn-grass-1.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      16,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 1,
    "rows": 1
  },
  {
    "id": "tile/town/autumn-grass-2",
    "type": "tileset",
    "file": "export/tiles/autumn-grass-2.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      16,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 1,
    "rows": 1
  },
  {
    "id": "tile/town/autumn-grass-3",
    "type": "tileset",
    "file": "export/tiles/autumn-grass-3.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "sheetSize": [
      16,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 1,
    "rows": 1
  },
  {
    "id": "prop/tree/autumn",
    "type": "prop",
    "file": "export/png/prop-tree-autumn.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      48
    ]
  },
  {
    "id": "prop/tree/autumn-small",
    "type": "prop",
    "file": "export/png/prop-tree-autumn-small.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/bench",
    "type": "prop",
    "file": "export/png/prop-bench.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      16
    ]
  },
  {
    "id": "prop/cart",
    "type": "prop",
    "file": "export/png/prop-cart.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      32
    ]
  },
  {
    "id": "prop/lamp",
    "type": "prop",
    "file": "export/png/prop-lamp.png",
    "lights": "export/png/prop-lamp-lights.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      32
    ]
  },
  {
    "id": "arena/I/back",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "I",
    "actName": "Catacumbas",
    "opaque": true
  },
  {
    "id": "arena/I/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "I",
    "actName": "Catacumbas",
    "parallax": 0.5
  },
  {
    "id": "arena/I/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "I",
    "actName": "Catacumbas",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/I/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "I",
    "actName": "Catacumbas",
    "stageY": 128
  },
  {
    "id": "arena/I/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "I",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/I/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "I",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/I/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "I",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/I/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-i-catacumbas-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "I",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/I/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-i-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "I"
  },
  {
    "id": "arena/II/back",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "II",
    "actName": "Minas Inundadas",
    "opaque": true
  },
  {
    "id": "arena/II/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "II",
    "actName": "Minas Inundadas",
    "parallax": 0.5
  },
  {
    "id": "arena/II/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "II",
    "actName": "Minas Inundadas",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/II/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "II",
    "actName": "Minas Inundadas",
    "stageY": 128
  },
  {
    "id": "arena/II/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "II",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/II/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "II",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/II/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "II",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/II/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-ii-minas-inundadas-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "II",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/II/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-ii-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "II"
  },
  {
    "id": "arena/III/back",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "III",
    "actName": "Jardim de Fungos",
    "opaque": true
  },
  {
    "id": "arena/III/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "III",
    "actName": "Jardim de Fungos",
    "parallax": 0.5
  },
  {
    "id": "arena/III/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "III",
    "actName": "Jardim de Fungos",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/III/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "III",
    "actName": "Jardim de Fungos",
    "stageY": 128
  },
  {
    "id": "arena/III/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "III",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/III/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "III",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/III/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "III",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/III/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-iii-jardim-fungos-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "III",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/III/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iii-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "III"
  },
  {
    "id": "arena/IV/back",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "IV",
    "actName": "Cidade Afogada",
    "opaque": true
  },
  {
    "id": "arena/IV/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "IV",
    "actName": "Cidade Afogada",
    "parallax": 0.5
  },
  {
    "id": "arena/IV/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "IV",
    "actName": "Cidade Afogada",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/IV/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "IV",
    "actName": "Cidade Afogada",
    "stageY": 128
  },
  {
    "id": "arena/IV/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "IV",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/IV/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "IV",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/IV/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "IV",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/IV/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-iv-cidade-afogada-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "IV",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/IV/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iv-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "IV"
  },
  {
    "id": "arena/V/back",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "V",
    "actName": "Forja Abissal",
    "opaque": true
  },
  {
    "id": "arena/V/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "V",
    "actName": "Forja Abissal",
    "parallax": 0.5
  },
  {
    "id": "arena/V/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "V",
    "actName": "Forja Abissal",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/V/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "V",
    "actName": "Forja Abissal",
    "stageY": 128
  },
  {
    "id": "arena/V/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "V",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/V/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "V",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/V/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "V",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/V/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-v-forja-abissal-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "V",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/V/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-v-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "V"
  },
  {
    "id": "arena/VI/back",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-back.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "VI",
    "actName": "Coração do Abismo",
    "opaque": true
  },
  {
    "id": "arena/VI/mid",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-mid.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "mid",
    "act": "VI",
    "actName": "Coração do Abismo",
    "parallax": 0.5
  },
  {
    "id": "arena/VI/floor",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "VI",
    "actName": "Coração do Abismo",
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "arena/VI/fore",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "fore",
    "act": "VI",
    "actName": "Coração do Abismo",
    "stageY": 128
  },
  {
    "id": "arena/VI/back-1",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-back-1-entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "VI",
    "floor": 1,
    "opaque": true
  },
  {
    "id": "arena/VI/back-2",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-back-2-descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "VI",
    "floor": 2,
    "opaque": true
  },
  {
    "id": "arena/VI/back-3",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-back-3-core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "VI",
    "floor": 3,
    "opaque": true
  },
  {
    "id": "arena/VI/back-4",
    "type": "arena-layer",
    "file": "export/arena/arena-vi-coracao-abismo-back-4-boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "back",
    "act": "VI",
    "floor": 4,
    "opaque": true
  },
  {
    "id": "prop/arena/VI/boss-gate",
    "type": "prop",
    "file": "export/arena/props/prop-arena-vi-boss-gate.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      96,
      96
    ],
    "act": "VI"
  },
  {
    "id": "arena/depth/entrance",
    "type": "arena-layer",
    "file": "export/arena/depth/entrance.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "depth",
    "floor": 1,
    "tint": true
  },
  {
    "id": "arena/depth/descent",
    "type": "arena-layer",
    "file": "export/arena/depth/descent.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "depth",
    "floor": 2,
    "tint": true
  },
  {
    "id": "arena/depth/core",
    "type": "arena-layer",
    "file": "export/arena/depth/core.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "depth",
    "floor": 3,
    "tint": true
  },
  {
    "id": "arena/depth/boss",
    "type": "arena-layer",
    "file": "export/arena/depth/boss.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "depth",
    "floor": 4,
    "tint": true
  },
  {
    "id": "decal/arena/ritual-circle",
    "type": "decal",
    "file": "export/arena/ritual-circle.png",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      160,
      16
    ],
    "stagePos": [
      160,
      158
    ],
    "tint": true
  },
  {
    "id": "prop/arena/torch",
    "type": "prop",
    "file": "export/arena/props/prop-arena-torch.png",
    "meta": "export/arena/props/prop-arena-torch.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      32
    ],
    "frameSize": [
      16,
      32
    ],
    "sheetSize": [
      64,
      32
    ],
    "frames": 4,
    "animations": {
      "loop": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 8
      }
    },
    "columns": 4,
    "rows": 1
  },
  {
    "id": "prop/arena/brazier",
    "type": "prop",
    "file": "export/arena/props/prop-arena-brazier.png",
    "meta": "export/arena/props/prop-arena-brazier.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "frameSize": [
      32,
      32
    ],
    "sheetSize": [
      128,
      32
    ],
    "frames": 4,
    "animations": {
      "loop": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 8
      }
    },
    "columns": 4,
    "rows": 1
  },
  {
    "id": "prop/arena/chain",
    "type": "prop",
    "file": "export/arena/props/prop-arena-chain.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/arena/bones",
    "type": "prop",
    "file": "export/arena/props/prop-arena-bones.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      16
    ]
  },
  {
    "id": "prop/arena/rubble",
    "type": "prop",
    "file": "export/arena/props/prop-arena-rubble.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      16
    ]
  },
  {
    "id": "prop/arena/stalagmite",
    "type": "prop",
    "file": "export/arena/props/prop-arena-stalagmite.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      32
    ]
  },
  {
    "id": "prop/arena/column-broken",
    "type": "prop",
    "file": "export/arena/props/prop-arena-column-broken.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ]
  },
  {
    "id": "prop/arena/roots",
    "type": "prop",
    "file": "export/arena/props/prop-arena-roots.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      32
    ]
  },
  {
    "id": "prop/arena/mushroom",
    "type": "prop",
    "file": "export/arena/props/prop-arena-mushroom.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "prop/arena/altar",
    "type": "prop",
    "file": "export/arena/props/prop-arena-altar.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      32
    ]
  },
  {
    "id": "prop/arena/I/urn",
    "type": "prop",
    "file": "export/arena/props/prop-arena-i-urn.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "I"
  },
  {
    "id": "prop/arena/I/candle",
    "type": "prop",
    "file": "export/arena/props/prop-arena-i-candle.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ],
    "act": "I"
  },
  {
    "id": "prop/arena/I/skull-pile",
    "type": "prop",
    "file": "export/arena/props/prop-arena-i-skull-pile.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "I"
  },
  {
    "id": "prop/arena/I/web",
    "type": "prop",
    "file": "export/arena/props/prop-arena-i-web.png",
    "anchor": [
      0.5,
      0
    ],
    "size": [
      32,
      32
    ],
    "act": "I"
  },
  {
    "id": "prop/arena/II/beam",
    "type": "prop",
    "file": "export/arena/props/prop-arena-ii-beam.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "II"
  },
  {
    "id": "prop/arena/II/rail",
    "type": "prop",
    "file": "export/arena/props/prop-arena-ii-rail.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      32
    ],
    "act": "II"
  },
  {
    "id": "prop/arena/II/drowned-lantern",
    "type": "prop",
    "file": "export/arena/props/prop-arena-ii-drowned-lantern.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "II"
  },
  {
    "id": "prop/arena/II/pipe",
    "type": "prop",
    "file": "export/arena/props/prop-arena-ii-pipe.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      32
    ],
    "act": "II"
  },
  {
    "id": "prop/arena/III/spore-pod",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iii-spore-pod.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "III"
  },
  {
    "id": "prop/arena/III/giant-mushroom",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iii-giant-mushroom.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "III"
  },
  {
    "id": "prop/arena/III/glowing-pool",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iii-glowing-pool.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      32
    ],
    "act": "III"
  },
  {
    "id": "prop/arena/III/root",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iii-root.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "III"
  },
  {
    "id": "prop/arena/IV/coral",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iv-coral.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "IV"
  },
  {
    "id": "prop/arena/IV/pearl",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iv-pearl.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "IV"
  },
  {
    "id": "prop/arena/IV/statue",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iv-statue.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "IV"
  },
  {
    "id": "prop/arena/IV/broken-window",
    "type": "prop",
    "file": "export/arena/props/prop-arena-iv-broken-window.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "IV"
  },
  {
    "id": "prop/arena/V/anvil",
    "type": "prop",
    "file": "export/arena/props/prop-arena-v-anvil.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "V"
  },
  {
    "id": "prop/arena/V/lava-crack",
    "type": "prop",
    "file": "export/arena/props/prop-arena-v-lava-crack.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      32
    ],
    "act": "V"
  },
  {
    "id": "prop/arena/V/heavy-chain",
    "type": "prop",
    "file": "export/arena/props/prop-arena-v-heavy-chain.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "V"
  },
  {
    "id": "prop/arena/V/slag",
    "type": "prop",
    "file": "export/arena/props/prop-arena-v-slag.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "V"
  },
  {
    "id": "prop/arena/VI/vein",
    "type": "prop",
    "file": "export/arena/props/prop-arena-vi-vein.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      64
    ],
    "act": "VI"
  },
  {
    "id": "prop/arena/VI/eye",
    "type": "prop",
    "file": "export/arena/props/prop-arena-vi-eye.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "VI"
  },
  {
    "id": "prop/arena/VI/floating-shard",
    "type": "prop",
    "file": "export/arena/props/prop-arena-vi-floating-shard.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "VI"
  },
  {
    "id": "prop/arena/VI/bone-pedestal",
    "type": "prop",
    "file": "export/arena/props/prop-arena-vi-bone-pedestal.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "act": "VI"
  },
  {
    "id": "fx/slash",
    "type": "fx",
    "file": "export/fx/fx-slash.png",
    "meta": "export/fx/fx-slash.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/impact",
    "type": "fx",
    "file": "export/fx/fx-impact.png",
    "meta": "export/fx/fx-impact.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/poison",
    "type": "fx",
    "file": "export/fx/fx-poison.png",
    "meta": "export/fx/fx-poison.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 10
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/heal",
    "type": "fx",
    "file": "export/fx/fx-heal.png",
    "meta": "export/fx/fx-heal.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 10
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/ember",
    "type": "fx",
    "file": "export/fx/fx-ember.png",
    "meta": "export/fx/fx-ember.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 12
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/void",
    "type": "fx",
    "file": "export/fx/fx-void.png",
    "meta": "export/fx/fx-void.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 12
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/water",
    "type": "fx",
    "file": "export/fx/fx-water.png",
    "meta": "export/fx/fx-water.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1
  },
  {
    "id": "fx/I/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-i.png",
    "meta": "export/fx/fx-slash-i.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "I"
  },
  {
    "id": "fx/I/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-i.png",
    "meta": "export/fx/fx-impact-i.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "I"
  },
  {
    "id": "fx/II/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-ii.png",
    "meta": "export/fx/fx-slash-ii.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "II"
  },
  {
    "id": "fx/II/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-ii.png",
    "meta": "export/fx/fx-impact-ii.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "II"
  },
  {
    "id": "fx/III/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-iii.png",
    "meta": "export/fx/fx-slash-iii.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "III"
  },
  {
    "id": "fx/III/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-iii.png",
    "meta": "export/fx/fx-impact-iii.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "III"
  },
  {
    "id": "fx/IV/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-iv.png",
    "meta": "export/fx/fx-slash-iv.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "IV"
  },
  {
    "id": "fx/IV/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-iv.png",
    "meta": "export/fx/fx-impact-iv.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "IV"
  },
  {
    "id": "fx/V/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-v.png",
    "meta": "export/fx/fx-slash-v.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "V"
  },
  {
    "id": "fx/V/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-v.png",
    "meta": "export/fx/fx-impact-v.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "V"
  },
  {
    "id": "fx/VI/slash",
    "type": "fx",
    "file": "export/fx/fx-slash-vi.png",
    "meta": "export/fx/fx-slash-vi.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 18
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "VI"
  },
  {
    "id": "fx/VI/impact",
    "type": "fx",
    "file": "export/fx/fx-impact-vi.png",
    "meta": "export/fx/fx-impact-vi.json",
    "anchor": [
      0.5,
      0.5
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      320,
      64
    ],
    "frames": 5,
    "animations": {
      "play": {
        "frames": [
          0,
          1,
          2,
          3,
          4
        ],
        "fps": 14
      }
    },
    "columns": 5,
    "rows": 1,
    "act": "VI"
  },
  {
    "id": "ui/dungeon-frame",
    "type": "ui",
    "file": "export/ui/ui-dungeon-frame.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      64,
      64
    ]
  },
  {
    "id": "ui/hp-frame",
    "type": "ui",
    "file": "export/ui/ui-hp-frame.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      64,
      16
    ]
  },
  {
    "id": "ui/boss-banner",
    "type": "ui",
    "file": "export/ui/ui-boss-banner.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      48
    ]
  },
  {
    "id": "ui/room-node",
    "type": "ui",
    "file": "export/ui/ui-room-node.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "frameSize": [
      16,
      16
    ],
    "sheetSize": [
      48,
      16
    ],
    "frames": 3,
    "columns": 3,
    "rows": 1
  },
  {
    "id": "char/monster/esqueleto-deep",
    "type": "character",
    "file": "export/png/char-monster-esqueleto-deep.png",
    "meta": "export/png/char-monster-esqueleto-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "I",
    "panelScale": 2,
    "name": "Esqueleto Rangente",
    "baseId": "char/monster/esqueleto",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/esqueleto-core",
    "type": "character",
    "file": "export/png/char-monster-esqueleto-core.png",
    "meta": "export/png/char-monster-esqueleto-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "I",
    "panelScale": 2,
    "name": "Esqueleto Rangente",
    "baseId": "char/monster/esqueleto",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/esqueleto",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-esqueleto.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "I"
  },
  {
    "id": "char/monster/rato-deep",
    "type": "character",
    "file": "export/png/char-monster-rato-deep.png",
    "meta": "export/png/char-monster-rato-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      16
    ],
    "frameSize": [
      24,
      16
    ],
    "sheetSize": [
      456,
      16
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "I",
    "panelScale": 2,
    "name": "Rato-de-ossuário",
    "baseId": "char/monster/rato",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/rato-core",
    "type": "character",
    "file": "export/png/char-monster-rato-core.png",
    "meta": "export/png/char-monster-rato-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      16
    ],
    "frameSize": [
      24,
      16
    ],
    "sheetSize": [
      456,
      16
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "I",
    "panelScale": 2,
    "name": "Rato-de-ossuário",
    "baseId": "char/monster/rato",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/rato",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-rato.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "I"
  },
  {
    "id": "char/monster/acolito-deep",
    "type": "character",
    "file": "export/png/char-monster-acolito-deep.png",
    "meta": "export/png/char-monster-acolito-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "I",
    "panelScale": 2,
    "name": "Acólito Caído",
    "baseId": "char/monster/acolito",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/acolito-core",
    "type": "character",
    "file": "export/png/char-monster-acolito-core.png",
    "meta": "export/png/char-monster-acolito-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "I",
    "panelScale": 2,
    "name": "Acólito Caído",
    "baseId": "char/monster/acolito",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/acolito",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-acolito.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "I"
  },
  {
    "id": "char/monster/mineiro-deep",
    "type": "character",
    "file": "export/png/char-monster-mineiro-deep.png",
    "meta": "export/png/char-monster-mineiro-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "II",
    "panelScale": 2,
    "name": "Mineiro Afogado",
    "baseId": "char/monster/mineiro",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/mineiro-core",
    "type": "character",
    "file": "export/png/char-monster-mineiro-core.png",
    "meta": "export/png/char-monster-mineiro-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "II",
    "panelScale": 2,
    "name": "Mineiro Afogado",
    "baseId": "char/monster/mineiro",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/mineiro",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-mineiro.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "II"
  },
  {
    "id": "char/monster/enguia-deep",
    "type": "character",
    "file": "export/png/char-monster-enguia-deep.png",
    "meta": "export/png/char-monster-enguia-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "II",
    "panelScale": 2,
    "name": "Enguia de Breu",
    "baseId": "char/monster/enguia",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/enguia-core",
    "type": "character",
    "file": "export/png/char-monster-enguia-core.png",
    "meta": "export/png/char-monster-enguia-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "II",
    "panelScale": 2,
    "name": "Enguia de Breu",
    "baseId": "char/monster/enguia",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/enguia",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-enguia.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "II"
  },
  {
    "id": "char/monster/golem-deep",
    "type": "character",
    "file": "export/png/char-monster-golem-deep.png",
    "meta": "export/png/char-monster-golem-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "II",
    "panelScale": 2,
    "name": "Golem de Ferro-negro",
    "baseId": "char/monster/golem",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/golem-core",
    "type": "character",
    "file": "export/png/char-monster-golem-core.png",
    "meta": "export/png/char-monster-golem-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "II",
    "panelScale": 2,
    "name": "Golem de Ferro-negro",
    "baseId": "char/monster/golem",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/golem",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-golem.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "II"
  },
  {
    "id": "char/monster/esporento-deep",
    "type": "character",
    "file": "export/png/char-monster-esporento-deep.png",
    "meta": "export/png/char-monster-esporento-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "III",
    "panelScale": 2,
    "name": "Esporento",
    "baseId": "char/monster/esporento",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/esporento-core",
    "type": "character",
    "file": "export/png/char-monster-esporento-core.png",
    "meta": "export/png/char-monster-esporento-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      24
    ],
    "frameSize": [
      24,
      24
    ],
    "sheetSize": [
      456,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "III",
    "panelScale": 2,
    "name": "Esporento",
    "baseId": "char/monster/esporento",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/esporento",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-esporento.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "III"
  },
  {
    "id": "char/monster/aranha-deep",
    "type": "character",
    "file": "export/png/char-monster-aranha-deep.png",
    "meta": "export/png/char-monster-aranha-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      24
    ],
    "frameSize": [
      32,
      24
    ],
    "sheetSize": [
      608,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "III",
    "panelScale": 2,
    "name": "Aranha-de-micélio",
    "baseId": "char/monster/aranha",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/aranha-core",
    "type": "character",
    "file": "export/png/char-monster-aranha-core.png",
    "meta": "export/png/char-monster-aranha-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      24
    ],
    "frameSize": [
      32,
      24
    ],
    "sheetSize": [
      608,
      24
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "III",
    "panelScale": 2,
    "name": "Aranha-de-micélio",
    "baseId": "char/monster/aranha",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/aranha",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-aranha.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "III"
  },
  {
    "id": "char/monster/brotado-deep",
    "type": "character",
    "file": "export/png/char-monster-brotado-deep.png",
    "meta": "export/png/char-monster-brotado-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "III",
    "panelScale": 2,
    "name": "Brotado",
    "baseId": "char/monster/brotado",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/brotado-core",
    "type": "character",
    "file": "export/png/char-monster-brotado-core.png",
    "meta": "export/png/char-monster-brotado-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "III",
    "panelScale": 2,
    "name": "Brotado",
    "baseId": "char/monster/brotado",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/brotado",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-brotado.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "III"
  },
  {
    "id": "char/monster/sacerdote-deep",
    "type": "character",
    "file": "export/png/char-monster-sacerdote-deep.png",
    "meta": "export/png/char-monster-sacerdote-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "IV",
    "panelScale": 2,
    "name": "Sacerdote Afogado",
    "baseId": "char/monster/sacerdote",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/sacerdote-core",
    "type": "character",
    "file": "export/png/char-monster-sacerdote-core.png",
    "meta": "export/png/char-monster-sacerdote-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "IV",
    "panelScale": 2,
    "name": "Sacerdote Afogado",
    "baseId": "char/monster/sacerdote",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/sacerdote",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-sacerdote.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "IV"
  },
  {
    "id": "char/monster/sereia-deep",
    "type": "character",
    "file": "export/png/char-monster-sereia-deep.png",
    "meta": "export/png/char-monster-sereia-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      28
    ],
    "frameSize": [
      24,
      28
    ],
    "sheetSize": [
      456,
      28
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "IV",
    "panelScale": 2,
    "name": "Sereia de Lodo",
    "baseId": "char/monster/sereia",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/sereia-core",
    "type": "character",
    "file": "export/png/char-monster-sereia-core.png",
    "meta": "export/png/char-monster-sereia-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      28
    ],
    "frameSize": [
      24,
      28
    ],
    "sheetSize": [
      456,
      28
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "IV",
    "panelScale": 2,
    "name": "Sereia de Lodo",
    "baseId": "char/monster/sereia",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/sereia",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-sereia.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "IV"
  },
  {
    "id": "char/monster/cavaleiroSalobro-deep",
    "type": "character",
    "file": "export/png/char-monster-cavaleiro-salobro-deep.png",
    "meta": "export/png/char-monster-cavaleiro-salobro-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "IV",
    "panelScale": 2,
    "name": "Cavaleiro Salobro",
    "baseId": "char/monster/cavaleiroSalobro",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/cavaleiroSalobro-core",
    "type": "character",
    "file": "export/png/char-monster-cavaleiro-salobro-core.png",
    "meta": "export/png/char-monster-cavaleiro-salobro-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "IV",
    "panelScale": 2,
    "name": "Cavaleiro Salobro",
    "baseId": "char/monster/cavaleiroSalobro",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/cavaleiroSalobro",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-cavaleiro-salobro.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "IV"
  },
  {
    "id": "char/monster/ferreiroCinzento-deep",
    "type": "character",
    "file": "export/png/char-monster-ferreiro-cinzento-deep.png",
    "meta": "export/png/char-monster-ferreiro-cinzento-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "V",
    "panelScale": 2,
    "name": "Ferreiro Cinzento",
    "baseId": "char/monster/ferreiroCinzento",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/ferreiroCinzento-core",
    "type": "character",
    "file": "export/png/char-monster-ferreiro-cinzento-core.png",
    "meta": "export/png/char-monster-ferreiro-cinzento-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "V",
    "panelScale": 2,
    "name": "Ferreiro Cinzento",
    "baseId": "char/monster/ferreiroCinzento",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/ferreiroCinzento",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-ferreiro-cinzento.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "V"
  },
  {
    "id": "char/monster/caoBrasa-deep",
    "type": "character",
    "file": "export/png/char-monster-cao-brasa-deep.png",
    "meta": "export/png/char-monster-cao-brasa-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      18
    ],
    "frameSize": [
      24,
      18
    ],
    "sheetSize": [
      456,
      18
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "V",
    "panelScale": 2,
    "name": "Cão de Brasa",
    "baseId": "char/monster/caoBrasa",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/caoBrasa-core",
    "type": "character",
    "file": "export/png/char-monster-cao-brasa-core.png",
    "meta": "export/png/char-monster-cao-brasa-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      18
    ],
    "frameSize": [
      24,
      18
    ],
    "sheetSize": [
      456,
      18
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "V",
    "panelScale": 2,
    "name": "Cão de Brasa",
    "baseId": "char/monster/caoBrasa",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/caoBrasa",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-cao-brasa.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "V"
  },
  {
    "id": "char/monster/escravoForja-deep",
    "type": "character",
    "file": "export/png/char-monster-escravo-forja-deep.png",
    "meta": "export/png/char-monster-escravo-forja-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "V",
    "panelScale": 2,
    "name": "Escravo da Forja",
    "baseId": "char/monster/escravoForja",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/escravoForja-core",
    "type": "character",
    "file": "export/png/char-monster-escravo-forja-core.png",
    "meta": "export/png/char-monster-escravo-forja-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "V",
    "panelScale": 2,
    "name": "Escravo da Forja",
    "baseId": "char/monster/escravoForja",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/escravoForja",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-escravo-forja.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "V"
  },
  {
    "id": "char/monster/sombra-deep",
    "type": "character",
    "file": "export/png/char-monster-sombra-deep.png",
    "meta": "export/png/char-monster-sombra-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "VI",
    "panelScale": 2,
    "name": "Sombra Faminta",
    "baseId": "char/monster/sombra",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/sombra-core",
    "type": "character",
    "file": "export/png/char-monster-sombra-core.png",
    "meta": "export/png/char-monster-sombra-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "VI",
    "panelScale": 2,
    "name": "Sombra Faminta",
    "baseId": "char/monster/sombra",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/sombra",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-sombra.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "VI"
  },
  {
    "id": "char/monster/lamento-deep",
    "type": "character",
    "file": "export/png/char-monster-lamento-deep.png",
    "meta": "export/png/char-monster-lamento-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "VI",
    "panelScale": 2,
    "name": "Lamento",
    "baseId": "char/monster/lamento",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/lamento-core",
    "type": "character",
    "file": "export/png/char-monster-lamento-core.png",
    "meta": "export/png/char-monster-lamento-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      456,
      32
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "VI",
    "panelScale": 2,
    "name": "Lamento",
    "baseId": "char/monster/lamento",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/lamento",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-lamento.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "VI"
  },
  {
    "id": "char/monster/arauto-deep",
    "type": "character",
    "file": "export/png/char-monster-arauto-deep.png",
    "meta": "export/png/char-monster-arauto-deep.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "deep",
    "act": "VI",
    "panelScale": 2,
    "name": "Arauto do Fundo",
    "baseId": "char/monster/arauto",
    "floors": [
      2,
      3
    ]
  },
  {
    "id": "char/monster/arauto-core",
    "type": "character",
    "file": "export/png/char-monster-arauto-core.png",
    "meta": "export/png/char-monster-arauto-core.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      40
    ],
    "frameSize": [
      32,
      40
    ],
    "sheetSize": [
      608,
      40
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "core",
    "act": "VI",
    "panelScale": 2,
    "name": "Arauto do Fundo",
    "baseId": "char/monster/arauto",
    "floors": [
      3
    ]
  },
  {
    "id": "ui/portrait/monster/arauto",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-monster-arauto.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "VI"
  },
  {
    "id": "char/boss/guardiaoUrnas-phase2",
    "type": "character",
    "file": "export/png/char-boss-guardiao-urnas-phase2.png",
    "meta": "export/png/char-boss-guardiao-urnas-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "I",
    "panelScale": 1,
    "name": "O Guardião das Urnas",
    "baseId": "char/boss/guardiaoUrnas",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/guardiaoUrnas",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-guardiao-urnas.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "I"
  },
  {
    "id": "char/boss/couraca-phase2",
    "type": "character",
    "file": "export/png/char-boss-couraca-phase2.png",
    "meta": "export/png/char-boss-couraca-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      56,
      48
    ],
    "frameSize": [
      56,
      48
    ],
    "sheetSize": [
      1064,
      48
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "II",
    "panelScale": 1,
    "name": "A Couraça Submersa",
    "baseId": "char/boss/couraca",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/couraca",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-couraca.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "II"
  },
  {
    "id": "char/boss/maeBolor-phase2",
    "type": "character",
    "file": "export/png/char-boss-mae-bolor-phase2.png",
    "meta": "export/png/char-boss-mae-bolor-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "III",
    "panelScale": 1,
    "name": "A Mãe-Bolor",
    "baseId": "char/boss/maeBolor",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/maeBolor",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-mae-bolor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "III"
  },
  {
    "id": "char/boss/arcebispo-phase2",
    "type": "character",
    "file": "export/png/char-boss-arcebispo-phase2.png",
    "meta": "export/png/char-boss-arcebispo-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      60
    ],
    "frameSize": [
      48,
      60
    ],
    "sheetSize": [
      912,
      60
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "IV",
    "panelScale": 1,
    "name": "O Arcebispo Sem Fôlego",
    "baseId": "char/boss/arcebispo",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/arcebispo",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-arcebispo.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "IV"
  },
  {
    "id": "char/boss/martelo-phase2",
    "type": "character",
    "file": "export/png/char-boss-martelo-phase2.png",
    "meta": "export/png/char-boss-martelo-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      56
    ],
    "frameSize": [
      48,
      56
    ],
    "sheetSize": [
      912,
      56
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "V",
    "panelScale": 1,
    "name": "O Martelo Que Não Dorme",
    "baseId": "char/boss/martelo",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/martelo",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-martelo.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "V"
  },
  {
    "id": "char/boss/aquiloQueVigia-phase2",
    "type": "character",
    "file": "export/png/char-boss-aquilo-que-vigia-phase2.png",
    "meta": "export/png/char-boss-aquilo-que-vigia-phase2.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      64,
      64
    ],
    "frameSize": [
      64,
      64
    ],
    "sheetSize": [
      1216,
      64
    ],
    "frames": 19,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "attack": {
        "frames": [
          8,
          9,
          10,
          11
        ],
        "fps": 12
      },
      "hit": {
        "frames": [
          12,
          13
        ],
        "fps": 10
      },
      "death": {
        "frames": [
          14,
          15,
          16,
          17,
          18
        ],
        "fps": 8
      }
    },
    "columns": 19,
    "rows": 1,
    "variant": "phase2",
    "act": "VI",
    "panelScale": 1,
    "name": "Aquilo que Vigia",
    "baseId": "char/boss/aquiloQueVigia",
    "floors": [
      4
    ]
  },
  {
    "id": "ui/portrait/boss/aquiloQueVigia",
    "type": "portrait",
    "file": "export/ui/portrait-monster/ui-portrait-boss-aquilo-que-vigia.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      36
    ],
    "act": "VI"
  },
  {
    "id": "web/favicon",
    "type": "web-icon",
    "file": "export/web/favicon.ico",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      48
    ]
  },
  {
    "id": "web/favicon-16",
    "type": "web-icon",
    "file": "export/web/favicon-16.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ]
  },
  {
    "id": "web/favicon-32",
    "type": "web-icon",
    "file": "export/web/favicon-32.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      32,
      32
    ]
  },
  {
    "id": "web/favicon-48",
    "type": "web-icon",
    "file": "export/web/favicon-48.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      48
    ]
  },
  {
    "id": "web/apple-touch-icon",
    "type": "web-icon",
    "file": "export/web/apple-touch-icon.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      180,
      180
    ]
  },
  {
    "id": "web/icon-192",
    "type": "web-icon",
    "file": "export/web/icon-192.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      192,
      192
    ]
  },
  {
    "id": "web/icon-512",
    "type": "web-icon",
    "file": "export/web/icon-512.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      512,
      512
    ]
  },
  {
    "id": "corridor/I/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "I",
    "actName": "Catacumbas",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/I/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "I",
    "actName": "Catacumbas",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/I/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "I",
    "actName": "Catacumbas",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/I/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "I",
    "actName": "Catacumbas",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/I/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "I",
    "actName": "Catacumbas"
  },
  {
    "id": "corridor/I/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-i-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "I",
    "actName": "Catacumbas",
    "opaque": true
  },
  {
    "id": "char/hero/guardiao/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-guardiao-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/arqueiro/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-arqueiro-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/guardiao/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-guardiao-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/selvagem/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-selvagem-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/selvagem/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-selvagem-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/lanceiro/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-lanceiro-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/lanceiro/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-lanceiro-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/arqueiro/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-arqueiro-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/clerigo/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-clerigo-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/clerigo/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-clerigo-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/piromante/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-piromante-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "char/hero/piromante/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero-piromante-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      128,
      28
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 16
      }
    },
    "stride": 48,
    "variant": "profile"
  },
  {
    "id": "corridor/II/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "II",
    "actName": "Minas Inundadas",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/II/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "II",
    "actName": "Minas Inundadas",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/II/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "II",
    "actName": "Minas Inundadas",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/II/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "II",
    "actName": "Minas Inundadas",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/II/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "II",
    "actName": "Minas Inundadas"
  },
  {
    "id": "corridor/II/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-ii-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "II",
    "actName": "Minas Inundadas",
    "opaque": true
  },
  {
    "id": "corridor/III/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "III",
    "actName": "Jardim de Fungos",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/III/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "III",
    "actName": "Jardim de Fungos",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/III/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "III",
    "actName": "Jardim de Fungos",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/III/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "III",
    "actName": "Jardim de Fungos",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/III/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "III",
    "actName": "Jardim de Fungos"
  },
  {
    "id": "corridor/III/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iii-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "III",
    "actName": "Jardim de Fungos",
    "opaque": true
  },
  {
    "id": "corridor/IV/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "IV",
    "actName": "Cidade Afogada",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/IV/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "IV",
    "actName": "Cidade Afogada",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/IV/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "IV",
    "actName": "Cidade Afogada",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/IV/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "IV",
    "actName": "Cidade Afogada",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/IV/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "IV",
    "actName": "Cidade Afogada"
  },
  {
    "id": "corridor/IV/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-iv-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "IV",
    "actName": "Cidade Afogada",
    "opaque": true
  },
  {
    "id": "corridor/V/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "V",
    "actName": "Forja Abissal",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/V/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "V",
    "actName": "Forja Abissal",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/V/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "V",
    "actName": "Forja Abissal",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/V/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "V",
    "actName": "Forja Abissal",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/V/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "V",
    "actName": "Forja Abissal"
  },
  {
    "id": "corridor/V/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-v-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "V",
    "actName": "Forja Abissal",
    "opaque": true
  },
  {
    "id": "corridor/VI/wall-a",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-wall-a.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-a",
    "act": "VI",
    "actName": "Coração do Abismo",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/VI/wall-b",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-wall-b.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      192
    ],
    "layer": "wall-b",
    "act": "VI",
    "actName": "Coração do Abismo",
    "opaque": true,
    "tileX": true
  },
  {
    "id": "corridor/VI/floor",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-floor.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      64
    ],
    "layer": "floor",
    "act": "VI",
    "actName": "Coração do Abismo",
    "opaque": true,
    "stageY": 128,
    "tileX": true
  },
  {
    "id": "corridor/VI/fore",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-fore.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      320,
      32
    ],
    "layer": "fore",
    "act": "VI",
    "actName": "Coração do Abismo",
    "stageY": 160,
    "tileX": true,
    "parallax": 1.25
  },
  {
    "id": "corridor/VI/door",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-door.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      48,
      192
    ],
    "layer": "door",
    "act": "VI",
    "actName": "Coração do Abismo"
  },
  {
    "id": "corridor/VI/entry",
    "type": "arena-layer",
    "file": "export/corridor/corridor-vi-entry.png",
    "anchor": [
      0,
      0
    ],
    "size": [
      72,
      192
    ],
    "layer": "entry",
    "act": "VI",
    "actName": "Coração do Abismo",
    "opaque": true
  },
  {
    "id": "char/hero/guerreiro/m",
    "type": "character",
    "file": "export/png/char-hero-guerreiro-m.png",
    "meta": "export/png/char-hero-guerreiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero/guerreiro/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero-guerreiro-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero/guerreiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero-guerreiro-m.png",
    "meta": "export/ui/ui-portrait-hd-hero-guerreiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/guardiao/f",
    "type": "character",
    "file": "export/png/char-hero2-guardiao-f.png",
    "meta": "export/png/char-hero2-guardiao-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/guardiao/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-guardiao-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/guardiao/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-guardiao-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-guardiao-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/selvagem/m",
    "type": "character",
    "file": "export/png/char-hero2-selvagem-m.png",
    "meta": "export/png/char-hero2-selvagem-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/selvagem/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-selvagem-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/selvagem/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-selvagem-m.png",
    "meta": "export/ui/ui-portrait-hd-hero2-selvagem-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/selvagem/f",
    "type": "character",
    "file": "export/png/char-hero2-selvagem-f.png",
    "meta": "export/png/char-hero2-selvagem-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/selvagem/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-selvagem-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/selvagem/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-selvagem-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-selvagem-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/lanceiro/m",
    "type": "character",
    "file": "export/png/char-hero2-lanceiro-m.png",
    "meta": "export/png/char-hero2-lanceiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/lanceiro/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-lanceiro-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/lanceiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-lanceiro-m.png",
    "meta": "export/ui/ui-portrait-hd-hero2-lanceiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/lanceiro/f",
    "type": "character",
    "file": "export/png/char-hero2-lanceiro-f.png",
    "meta": "export/png/char-hero2-lanceiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/lanceiro/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-lanceiro-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/lanceiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-lanceiro-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-lanceiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/arqueiro/m",
    "type": "character",
    "file": "export/png/char-hero2-arqueiro-m.png",
    "meta": "export/png/char-hero2-arqueiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/arqueiro/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-arqueiro-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/arqueiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-arqueiro-m.png",
    "meta": "export/ui/ui-portrait-hd-hero2-arqueiro-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/arqueiro/f",
    "type": "character",
    "file": "export/png/char-hero2-arqueiro-f.png",
    "meta": "export/png/char-hero2-arqueiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/arqueiro/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-arqueiro-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/arqueiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-arqueiro-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-arqueiro-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/clerigo/m",
    "type": "character",
    "file": "export/png/char-hero2-clerigo-m.png",
    "meta": "export/png/char-hero2-clerigo-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/clerigo/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-clerigo-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/clerigo/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-clerigo-m.png",
    "meta": "export/ui/ui-portrait-hd-hero2-clerigo-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/clerigo/f",
    "type": "character",
    "file": "export/png/char-hero2-clerigo-f.png",
    "meta": "export/png/char-hero2-clerigo-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/clerigo/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-clerigo-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/clerigo/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-clerigo-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-clerigo-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/piromante/m",
    "type": "character",
    "file": "export/png/char-hero2-piromante-m.png",
    "meta": "export/png/char-hero2-piromante-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/piromante/m/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-piromante-m-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/piromante/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-piromante-m.png",
    "meta": "export/ui/ui-portrait-hd-hero2-piromante-m.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  },
  {
    "id": "char/hero2/piromante/f",
    "type": "character",
    "file": "export/png/char-hero2-piromante-f.png",
    "meta": "export/png/char-hero2-piromante-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      432,
      32
    ],
    "columns": 18,
    "rows": 1,
    "frames": 18,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 6
      },
      "run": {
        "frames": [
          4,
          5,
          6,
          7
        ],
        "fps": 10
      },
      "hit": {
        "frames": [
          8
        ],
        "fps": 1
      },
      "attack": {
        "frames": [
          9,
          10,
          11,
          12
        ],
        "fps": 12
      },
      "death": {
        "frames": [
          13,
          14,
          15,
          16,
          17
        ],
        "fps": 8
      }
    }
  },
  {
    "id": "char/hero2/piromante/f/walk",
    "type": "character",
    "file": "export/corridor/char-hero2-piromante-f-walk.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      24,
      32
    ],
    "frameSize": [
      24,
      32
    ],
    "sheetSize": [
      192,
      32
    ],
    "columns": 8,
    "rows": 1,
    "frames": 8,
    "animations": {
      "walk": {
        "frames": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "fps": 14
      }
    },
    "stride": 56,
    "variant": "profile"
  },
  {
    "id": "ui/portrait-hd/hero2/piromante/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hd-hero2-piromante-f.png",
    "meta": "export/ui/ui-portrait-hd-hero2-piromante-f.json",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      64
    ],
    "frameSize": [
      48,
      64
    ],
    "sheetSize": [
      192,
      64
    ],
    "columns": 4,
    "rows": 1,
    "frames": 4,
    "animations": {
      "idle": {
        "frames": [
          0,
          1,
          2,
          3
        ],
        "fps": 4
      }
    }
  }
];

export const PACK_TILES: Record<string, [number, number]> = {
  "grass-0": [
    0,
    0
  ],
  "grass-1": [
    1,
    0
  ],
  "grass-2": [
    2,
    0
  ],
  "grass-3": [
    3,
    0
  ],
  "dirt": [
    4,
    0
  ],
  "trail": [
    5,
    0
  ],
  "water": [
    6,
    0
  ],
  "abyss": [
    7,
    0
  ],
  "dirt-nw": [
    0,
    1
  ],
  "trail-nw": [
    5,
    1
  ],
  "dirt-n": [
    1,
    1
  ],
  "trail-n": [
    6,
    1
  ],
  "dirt-ne": [
    2,
    1
  ],
  "trail-ne": [
    7,
    1
  ],
  "dirt-w": [
    0,
    2
  ],
  "trail-w": [
    5,
    2
  ],
  "dirt-c": [
    1,
    2
  ],
  "trail-c": [
    6,
    2
  ],
  "dirt-e": [
    2,
    2
  ],
  "trail-e": [
    7,
    2
  ],
  "dirt-sw": [
    0,
    3
  ],
  "trail-sw": [
    5,
    3
  ],
  "dirt-s": [
    1,
    3
  ],
  "trail-s": [
    6,
    3
  ],
  "dirt-se": [
    2,
    3
  ],
  "trail-se": [
    7,
    3
  ],
  "dirt-inner-nw": [
    3,
    1
  ],
  "dirt-inner-ne": [
    4,
    1
  ],
  "dirt-inner-sw": [
    3,
    2
  ],
  "dirt-inner-se": [
    4,
    2
  ],
  "trail-on-dirt-n": [
    3,
    3
  ],
  "grass-stones": [
    4,
    3
  ],
  "water-nw": [
    0,
    4
  ],
  "water-n": [
    1,
    4
  ],
  "water-ne": [
    2,
    4
  ],
  "water-w": [
    0,
    5
  ],
  "water-c": [
    1,
    5
  ],
  "water-e": [
    2,
    5
  ],
  "water-sw": [
    0,
    6
  ],
  "water-s": [
    1,
    6
  ],
  "water-se": [
    2,
    6
  ],
  "cliff-top-0": [
    3,
    4
  ],
  "cliff-face-0": [
    3,
    5
  ],
  "cliff-base-0": [
    3,
    6
  ],
  "cliff-top-1": [
    4,
    4
  ],
  "cliff-face-1": [
    4,
    5
  ],
  "cliff-base-1": [
    4,
    6
  ],
  "cliff-top-2": [
    5,
    4
  ],
  "cliff-face-2": [
    5,
    5
  ],
  "cliff-base-2": [
    5,
    6
  ],
  "abyss-2": [
    6,
    4
  ],
  "abyss-mist": [
    7,
    4
  ],
  "abyss-glint": [
    6,
    5
  ],
  "abyss-3": [
    7,
    5
  ],
  "rock-ground": [
    5,
    7
  ],
  "rock-top": [
    6,
    7
  ],
  "rock-face": [
    7,
    7
  ],
  "yard": [
    0,
    7
  ],
  "mud": [
    1,
    7
  ],
  "trail-v": [
    2,
    7
  ],
  "grass-flowers": [
    3,
    7
  ],
  "flagstone": [
    4,
    7
  ]
};

export const PACK_TERRAIN_COLUMNS = 8;

export const PACK_BASE = `${import.meta.env?.BASE_URL ?? '/'}assets/vigilia/`;

export const packUrl = (file: string): string => `${PACK_BASE}${file}`;

export const packAsset = (id: string): PackAsset | undefined => PACK_ASSETS.find((a) => a.id === id);

export const buildingTexture = (id: string, level: number): string =>
  `building/${id}/${level <= 0 ? 'ruin' : `level-${level}`}`;

export const lightsTexture = (texture: string): string => `${texture}-lights`;

/**
 * Estilo novo dos heróis (sprite 24×32 e modelo detalhado 48×64). O Guardião é o Sentinela
 * entregue no piloto (hero/guerreiro); os outros 11 saíram do mesmo gerador (hero2/<classe>).
 * A arte antiga de 16×28 segue no pack: voltar é trocar este mapa.
 */
const HERO_ART: Record<string, string> = { 'guardiao/m': 'hero/guerreiro/m' };

/** Pasta da arte do herói: "hero2/arqueiro/f", ou "hero/guerreiro/m" no Guardião. */
export const heroArt = (classId: string, gender: string): string => HERO_ART[`${classId}/${gender}`] ?? `hero2/${classId}/${gender}`;

export const heroSpriteId = (classId: string, gender: string): string => `char/${heroArt(classId, gender)}`;

/** Modelo detalhado animado (48×64) para a ficha e o relatório. */
export const heroPortraitHd = (classId: string, gender: string): PackAsset | undefined =>
  packAsset(`ui/portrait-hd/${heroArt(classId, gender)}`);

export const heroPortraitUrl = (classId: string, gender: string, small = false): string =>
  `${PACK_BASE}export/ui/ui-portrait-${heroArt(classId, gender).replaceAll('/', '-')}${small ? '-small' : ''}.png`;

export const mayorPortraitUrl = (female = false, small = false): string =>
  `${PACK_BASE}export/ui/ui-portrait-mayor${female ? '-f' : ''}${small ? '-small' : ''}.png`;

export const weaponIconUrl = (classId: string): string => `${PACK_BASE}export/ui/ui-icon-weapon-${classId}.png`;

export const armorIconUrl = (): string => `${PACK_BASE}export/ui/ui-icon-armor.png`;
