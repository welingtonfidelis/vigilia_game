// Gerado a partir do manifest do pack vigilia-art 1.4.0. Não editar à mão.

export interface PackAnim { frames: number[]; fps: number; }
export interface PackAsset {
  id: string;
  type: 'tileset' | 'building' | 'prop' | 'decal' | 'fx' | 'character' | 'ui-icon' | 'portrait';
  file: string;
  lights?: string; frameSize?: [number, number]; sheetSize?: [number, number]; frames?: number; fps?: number;
  animations?: Record<string, PackAnim>; anchor?: [number, number]; tileSize?: [number, number];
  columns?: number; rows?: number; size?: [number, number]; small?: string; variant?: string; format?: string; meta?: string;
}

export const PACK_ASSETS: PackAsset[] = [
  {
    "id": "tile/town/terrain",
    "type": "tileset",
    "file": "export/tiles/town-terrain.png",
    "sheetSize": [
      128,
      128
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 8,
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "meta": "export/tiles/town-terrain.json"
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
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      32,
      32
    ],
    "meta": "export/fx/fx-steam.json"
  },
  {
    "id": "fx/fire",
    "type": "fx",
    "file": "export/fx/fx-fire.png",
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
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      16
    ],
    "meta": "export/fx/fx-fire.json"
  },
  {
    "id": "fx/spark",
    "type": "fx",
    "file": "export/fx/fx-spark.png",
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
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      8,
      8
    ],
    "meta": "export/fx/fx-spark.json"
  },
  {
    "id": "char/villager/lavrador/m",
    "type": "character",
    "file": "export/png/char-villager-lavrador-m.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-lavrador-m.json"
  },
  {
    "id": "char/villager/lavrador/f",
    "type": "character",
    "file": "export/png/char-villager-lavrador-f.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-lavrador-f.json"
  },
  {
    "id": "char/villager/artesa/m",
    "type": "character",
    "file": "export/png/char-villager-artesa-m.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-artesa-m.json"
  },
  {
    "id": "char/villager/artesa/f",
    "type": "character",
    "file": "export/png/char-villager-artesa-f.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-artesa-f.json"
  },
  {
    "id": "char/villager/acolito/m",
    "type": "character",
    "file": "export/png/char-villager-acolito-m.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-acolito-m.json"
  },
  {
    "id": "char/villager/acolito/f",
    "type": "character",
    "file": "export/png/char-villager-acolito-f.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-acolito-f.json"
  },
  {
    "id": "char/villager/guarda/m",
    "type": "character",
    "file": "export/png/char-villager-guarda-m.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-guarda-m.json"
  },
  {
    "id": "char/villager/guarda/f",
    "type": "character",
    "file": "export/png/char-villager-guarda-f.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-villager-guarda-f.json"
  },
  {
    "id": "char/hero/guardiao/m",
    "type": "character",
    "file": "export/png/char-hero-guardiao-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-guardiao-m.json"
  },
  {
    "id": "char/hero/guardiao/f",
    "type": "character",
    "file": "export/png/char-hero-guardiao-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-guardiao-f.json"
  },
  {
    "id": "char/hero/selvagem/m",
    "type": "character",
    "file": "export/png/char-hero-selvagem-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-selvagem-m.json"
  },
  {
    "id": "char/hero/selvagem/f",
    "type": "character",
    "file": "export/png/char-hero-selvagem-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-selvagem-f.json"
  },
  {
    "id": "char/hero/lanceiro/m",
    "type": "character",
    "file": "export/png/char-hero-lanceiro-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-lanceiro-m.json"
  },
  {
    "id": "char/hero/lanceiro/f",
    "type": "character",
    "file": "export/png/char-hero-lanceiro-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-lanceiro-f.json"
  },
  {
    "id": "char/hero/arqueiro/m",
    "type": "character",
    "file": "export/png/char-hero-arqueiro-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-arqueiro-m.json"
  },
  {
    "id": "char/hero/arqueiro/f",
    "type": "character",
    "file": "export/png/char-hero-arqueiro-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-arqueiro-f.json"
  },
  {
    "id": "char/hero/clerigo/m",
    "type": "character",
    "file": "export/png/char-hero-clerigo-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-clerigo-m.json"
  },
  {
    "id": "char/hero/clerigo/f",
    "type": "character",
    "file": "export/png/char-hero-clerigo-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-clerigo-f.json"
  },
  {
    "id": "char/hero/piromante/m",
    "type": "character",
    "file": "export/png/char-hero-piromante-m.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-piromante-m.json"
  },
  {
    "id": "char/hero/piromante/f",
    "type": "character",
    "file": "export/png/char-hero-piromante-f.png",
    "frameSize": [
      16,
      28
    ],
    "sheetSize": [
      144,
      28
    ],
    "frames": 9,
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
      }
    },
    "columns": 9,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      28
    ],
    "meta": "export/png/char-hero-piromante-f.json"
  },
  {
    "id": "char/mayor",
    "type": "character",
    "file": "export/png/char-mayor.png",
    "frameSize": [
      16,
      23
    ],
    "sheetSize": [
      128,
      23
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
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      23
    ],
    "meta": "export/png/char-mayor.json"
  },
  {
    "id": "char/mayor/f",
    "type": "character",
    "file": "export/png/char-mayor-f.png",
    "frameSize": [
      16,
      23
    ],
    "sheetSize": [
      128,
      23
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
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      23
    ],
    "meta": "export/png/char-mayor-f.json"
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
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-guardiao-m-small.png"
  },
  {
    "id": "ui/portrait/hero/guardiao/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-guardiao-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-guardiao-f-small.png"
  },
  {
    "id": "ui/portrait/hero/selvagem/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-selvagem-m.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-selvagem-m-small.png"
  },
  {
    "id": "ui/portrait/hero/selvagem/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-selvagem-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-selvagem-f-small.png"
  },
  {
    "id": "ui/portrait/hero/lanceiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-lanceiro-m.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-lanceiro-m-small.png"
  },
  {
    "id": "ui/portrait/hero/lanceiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-lanceiro-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-lanceiro-f-small.png"
  },
  {
    "id": "ui/portrait/hero/arqueiro/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-arqueiro-m.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-arqueiro-m-small.png"
  },
  {
    "id": "ui/portrait/hero/arqueiro/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-arqueiro-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-arqueiro-f-small.png"
  },
  {
    "id": "ui/portrait/hero/clerigo/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-clerigo-m.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-clerigo-m-small.png"
  },
  {
    "id": "ui/portrait/hero/clerigo/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-clerigo-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-clerigo-f-small.png"
  },
  {
    "id": "ui/portrait/hero/piromante/m",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-piromante-m.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-piromante-m-small.png"
  },
  {
    "id": "ui/portrait/hero/piromante/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-hero-piromante-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-hero-piromante-f-small.png"
  },
  {
    "id": "ui/portrait/mayor",
    "type": "portrait",
    "file": "export/ui/ui-portrait-mayor.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-mayor-small.png"
  },
  {
    "id": "ui/portrait/mayor/f",
    "type": "portrait",
    "file": "export/ui/ui-portrait-mayor-f.png",
    "anchor": [
      0.5,
      1
    ],
    "size": [
      48,
      84
    ],
    "small": "export/ui/ui-portrait-mayor-f-small.png"
  },
  {
    "id": "char/child/m",
    "type": "character",
    "file": "export/png/char-child-m.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-child-m.json"
  },
  {
    "id": "char/child/f",
    "type": "character",
    "file": "export/png/char-child-f.png",
    "frameSize": [
      16,
      21
    ],
    "sheetSize": [
      32,
      21
    ],
    "frames": 2,
    "animations": {
      "idle": {
        "frames": [
          0,
          1
        ],
        "fps": 3
      },
      "walk": {
        "frames": [
          0,
          1
        ],
        "fps": 8
      }
    },
    "columns": 2,
    "rows": 1,
    "anchor": [
      0.5,
      1
    ],
    "size": [
      16,
      21
    ],
    "meta": "export/png/char-child-f.json"
  },
  {
    "id": "tile/town/cemetery-fence",
    "type": "tileset",
    "file": "export/tiles/cemetery-fence.png",
    "sheetSize": [
      128,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 1,
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "meta": "export/tiles/cemetery-fence.json"
  },
  {
    "id": "tile/town/wood-fence",
    "type": "tileset",
    "file": "export/tiles/wood-fence.png",
    "sheetSize": [
      128,
      16
    ],
    "tileSize": [
      16,
      16
    ],
    "columns": 8,
    "rows": 1,
    "anchor": [
      0,
      0
    ],
    "size": [
      16,
      16
    ],
    "meta": "export/tiles/wood-fence.json"
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

export const buildingTexture = (id: string, level: number): string =>
  `building/${id}/${level <= 0 ? 'ruin' : `level-${level}`}`;

export const lightsTexture = (texture: string): string => `${texture}-lights`;

export const heroPortraitUrl = (classId: string, gender: string, small = false): string =>
  `${PACK_BASE}export/ui/ui-portrait-hero-${classId}-${gender}${small ? '-small' : ''}.png`;

export const mayorPortraitUrl = (female = false, small = false): string =>
  `${PACK_BASE}export/ui/ui-portrait-mayor${female ? '-f' : ''}${small ? '-small' : ''}.png`;

export const weaponIconUrl = (classId: string): string => `${PACK_BASE}export/ui/ui-icon-weapon-${classId}.png`;

export const armorIconUrl = (): string => `${PACK_BASE}export/ui/ui-icon-armor.png`;
