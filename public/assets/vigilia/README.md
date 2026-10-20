# Vigília Art Pack — 1.4.0

**Autor:** Equipe Vigília · **Licença:** CC0 1.0 (ver `licenses/`) · **Data:** 2026-10-20
**Status:** pronto para integração; assets em `review` até serem validados em screenshots do jogo real.

Pack de pixel art para o jogo Vigília (Phaser 3.90): terreno, 7 prédios × 4 estados com luzes separadas, casas, marcos, props, FX, personagens de frente e, desde a 1.2.0, a UI e os extras do P1. Substitui o pack anterior `vigilia-art-v01`; continua independente de Tiny Town e 0x72, que mantêm suas licenças.

## Pastas

```text
manifest.json          contrato: IDs, arquivos, tamanhos, pivôs, quadros, luzes, status
palette/vigilia.gpl    45 cores (32 originais + 13 extras nomeadas)
export/tiles/          town-terrain.png (8×8 tiles de 16 px) + .json com nomes e autotile
export/png/            building-*.png (+ -lights.png), prop-*, decal-*, char-* (+ .json), inclusive char-child-*
export/ui/             ícones SVG (atividade, recurso), ranks, armas/armadura e retratos em PNG
export/fx/             fx-steam, fx-fire, fx-spark (+ .json)
preview/               contact-sheet, tile-test, composição, simulações dia/noite e câmera
docs/                  ART-BRIEF, ASSET-LIST, CHANGE-REQUEST-v01, PROFILE-REQUEST
source/generator/      gerador Python (Pillow) que produz o pack inteiro
licenses/              LICENSE.md (CC0 1.0) e NOTICE.md (proveniência)
```

## Regras do pack

- PNG-32 RGBA, sRGB, **1×** (o motor amplia 2×); sem anti-alias na arte base; sem texto; sem sombra projetada.
- Pivô **0.5, 1** (embaixo-centro) para personagens, prédios e props; **0, 0** para tiles.
- Prédios: porta no **centro horizontal e na base** do canvas; 112×96 (campo 144×96), casas 64×48.
- Nomes kebab-case ASCII; IDs em português conforme o jogo; versão só no manifesto.

## Personagens (de frente, leve giro 3/4 para a direita)

Decisão do projeto na 1.3.0: os personagens voltaram a ser de frente. O motor continua só espelhando no X; como de frente o flip quase não muda a silhueta, a corrida ganhou passo mais aberto (pé sobe 2 px) e braços em contrafase para não parecer que desliza. As versões de perfil da 1.1.0 continuam no gerador (`*_profile`), caso o projeto queira voltar.

| Folha | Quadro | Folha inteira | Tags (fps) |
|---|---|---|---|
| `char-hero-<classe>-<m\|f>` | 16×28 | 144×28, 9 quadros | idle 0–3 (6), run 4–7 (10), hit 8 (1) |
| `char-villager-<ofício>-<m\|f>` | 16×21 | 32×21, 2 quadros | idle 0–1 (3), walk 0–1 (8) |
| `char-mayor`, `char-mayor-f` | 16×23 | 128×23, 8 quadros | idle 0–3 (6), run 4–7 (10) |

Heróis na direção "sombria" (1.4.0): proporção mais alta (cabeça/elmo de 8 px), silhueta própria por classe e cores fechadas. Armas de classe dentro dos 16 px: guardião espada + escudo de pipa (elmo fechado), selvagem machado de duas mãos (manto de pele), lanceiro lança + broquel (chapéu de ferro), arqueiro arco + aljava (capuz fundo), clérigo martelo de guerra + livro (capuz claro), piromante cajado com chama + chama na mão (capuz com olhos de brasa; a chama tremula nos quadros parados). Os pés ficam na base em todos os quadros; só o corpo sobe 1 px na respiração e no passo.

No manifesto, `size` é o **quadro**; `frameSize`, `sheetSize`, `columns`, `rows` e `frames` descrevem a folha. Cada `.json` segue o formato hash do Aseprite (`frames` + `meta.frameTags`, `meta.frameSize`, `pivot`).

## Prédios: dia e noite

- `building-<id>-<estado>.png` — **base de dia**, sem nenhuma janela acesa nem lanterna.
- `building-<id>-<estado>-lights.png` — **overlay**: mesmo canvas e pivô, transparente, só com as janelas acesas e um halo quente de 2 px (alfa 70/30) que não sai da silhueta. Na ruína ele é vazio.
- No manifesto, a entrada do prédio tem `file` (base) e `lights` (overlay). Posicione o overlay no mesmo x,y da base, na camada de luzes, e controle `alpha` de 0 a 1 no crepúsculo e no amanhecer.

As brasas da forja do ferreiro ficam na base, porque a forja trabalha de dia também.

## Como carregar (Phaser 3)

```js
// preload
const man = this.cache.json.get('vigilia-manifest'); // load.json('vigilia-manifest', 'assets/vigilia/manifest.json')
for (const a of man.assets) {
  const url = `assets/vigilia/${a.file}`;
  if (a.type === 'character' || a.type === 'fx')
    this.load.spritesheet(a.id, url, { frameWidth: a.frameSize[0], frameHeight: a.frameSize[1] });
  else if (a.type === 'tileset')
    this.load.image(a.id, url); // tilemap: tileWidth/Height = a.tileSize
  else this.load.image(a.id, url);
  if (a.lights) this.load.image(`${a.id}/lights`, `assets/vigilia/${a.lights}`);
}
// create: sprite.setOrigin(...a.anchor); animações a partir de a.animations
```

## UI (P1)

| Grupo | Arquivos | Formato |
|---|---|---|
| Atividades (10) | `ui-icon-activity-<id>.svg` | SVG 24×24, traço 2 px, `stroke="currentColor"` |
| Recursos (5) | `ui-icon-resource-<id>.svg` | idem |
| Ranks E–S | `ui-icon-rank-<r>.png` (+ `-glyph.png`) | PNG 16×16; sem letra por padrão, variante com letra |
| Armas (6) + armadura | `ui-icon-weapon-<classe>.png`, `ui-icon-armor.png` | PNG 24×24 |
| Retratos | `ui-portrait-hero-<classe>-<g>.png`, `ui-portrait-mayor(-f).png` (+ `-small.png`) | detalhado 48×84, meio corpo de frente; `small` = quadro 16×28 / 16×23 |

Os SVG herdam a cor do texto: no Preact, `<img>` não pinta `currentColor`; use o SVG inline ou `mask-image` com `background-color`.

## Status dos assets

`review` = pronto e conferido no pack, aguardando screenshot do jogo real (1370×1289 e 390×844, câmera 1,5×, postFX). Ao aprovar, troque para `done`. As imagens `preview/sim-*` são **simulações** do pós-processamento sobre a composição, não capturas do jogo.

## Pendências do projeto

- Screenshots do jogo real (só o projeto consegue gerar).
- Decisão de layout: re-skin do layout atual (recomendado no pedido) ou adotar `preview/town-composition.png`.
- P2 do pedido: monstros e chefes, variante de outono, props extras, retratos de monstros.
