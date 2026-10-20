# Vigília Art Pack — 1.9.0

**Autor:** Equipe Vigília · **Licença:** CC0 1.0 (ver `licenses/`) · **Data:** 2026-10-20
**Status:** pronto para integração; assets em `review` até serem validados em screenshots do jogo real.

Pack de pixel art para o jogo Vigília (Phaser 3.90): terreno, 7 prédios × 4 estados com luzes separadas, casas, marcos, props, FX, personagens de frente e, desde a 1.2.0, a UI e os extras do P1. Substitui o pack anterior `vigilia-art-v01`; continua independente de Tiny Town e 0x72, que mantêm suas licenças.

## Pastas

```text
manifest.json          contrato: IDs, arquivos, tamanhos, pivôs, quadros, luzes, status
palette/vigilia.gpl    45 cores (32 originais + 13 extras nomeadas)
palette/vigilia-ato-*.gpl  12 cores por bioma da dungeon (8 de rampa + 4 de ênfase)
export/tiles/          town-terrain.png (8×8 tiles de 16 px) + .json com nomes e autotile
export/png/            building-*.png (+ -lights.png), prop-*, decal-*, char-* (+ .json), inclusive char-child-*
export/ui/             ícones SVG (atividade, recurso), ranks, armas/armadura e retratos em PNG
export/fx/             fx-steam, fx-fire, fx-spark e os 7 FX de combate 64×64×5 (+ .json)
export/arena/          back/floor/fore por ato, depth/ (4 andares), props/ e o círculo ritual
export/web/            favicon.ico, favicon-16/32/48, apple-touch-icon, icon-192/512
preview/               contact-sheet, tile-test, composição, simulações dia/noite e câmera
docs/                  ART-BRIEF, ASSET-LIST, CHANGE-REQUEST-v01, PROFILE-REQUEST, BRIEF-MONSTROS-P2, BRIEF-DUNGEON, REFERENCIA-DUNGEON.gif
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

Elenco inteiro na direção "sombria" (heróis 1.4.0; prefeito, moradores e crianças 1.5.0). Alturas por papel: heróis ~27 px, prefeito ~23, moradores ~20, crianças ~16. Heróis: proporção mais alta (cabeça/elmo de 8 px), silhueta própria por classe e cores fechadas. Armas de classe dentro dos 16 px: guardião espada + escudo de pipa (elmo fechado), selvagem machado de duas mãos (manto de pele), lanceiro lança + broquel (chapéu de ferro), arqueiro arco + aljava (capuz fundo), clérigo martelo de guerra + livro (capuz claro), piromante cajado com chama + chama na mão (capuz com olhos de brasa; a chama tremula nos quadros parados). Os pés ficam na base em todos os quadros; só o corpo sobe 1 px na respiração e no passo.

No manifesto, `size` é o **quadro**; `frameSize`, `sheetSize`, `columns`, `rows` e `frames` descrevem a folha. Cada `.json` segue o formato hash do Aseprite (`frames` + `meta.frameTags`, `meta.frameSize`, `pivot`).

## Monstros do Abismo (P2)

Para o painel de combate do Abismo: **idle 0–3 a 6 fps** (o que o jogo usa hoje) e **run 4–7 a 10 fps** (opcional, pronto para o futuro). De frente, sem flip, sem ataque/morte. Cada um tem paleta própria; **remova o tint do 0x72 no jogo**.

| Tipo | Quadro | Folha | Escala no painel |
|---|---|---|---|
| Normal pequeno (esqueleto, rato, enguia, esporento, brotado, sereia, caoBrasa) | 16×16 | 128×16 | 2× |
| Normal humanoide (acolito, mineiro, golem, aranha, sacerdote, cavaleiroSalobro, ferreiroCinzento, escravoForja, sombra, lamento, arauto) | 16×23 | 128×23 | 2× |
| Chefe (guardiaoUrnas, couraca, maeBolor, arcebispo, martelo, aquiloQueVigia) | 32×36 | 256×36 | 1× |

IDs exatamente como no jogo: `char/monster/<id>` e `char/boss/<id>`; arquivos em kebab-case (`char-monster-cavaleiro-salobro.png`). Mineiro, Golem, Lamento e Arauto agora são normais 16×23. Cada entrada traz `act`, `name`, `frameSize`, `sheetSize`, `columns`, `rows`, `frames`, `animations.idle`, `animations.run` e `panelScale`. Prévia: `preview/abyss-panel.png`.

## Dungeon: arenas por ato e andar (BRIEF-DUNGEON, lotes A, B e C)

### Escala (mudou na 1.9.0)

A referência mostra os pixels do cenário e dos personagens no mesmo tamanho, com os personagens ocupando cerca de 1/5 da altura. Por isso o palco agora é **320×192 na mesma escala de pixel dos personagens** (herói 16×28 em 1×). No jogo, escale palco e personagens pelo **mesmo fator**: em 4×, palco 1280×768 e herói 64×112, como hoje. A área 16:9 segura é y 6..186. Para "cover" em telas mais altas há 6 px de sobra em cima e embaixo, e as laterais escurecem nas bordas.

```text
camada                     tamanho            posição no palco
arena/<ato>/back           320×192 opaco      0,0
  ou arena/<ato>/back-<n>  320×192 opaco      0,0   (fundo pronto do andar n: back + depth já tingido)
arena/<ato>/mid            320×192            0,0   (parallax opcional, colunas e silhuetas nas laterais)
arena/depth/<andar>        320×192            0,0   (neutro, tingir no jogo; não usar com back-<n>)
arena/<ato>/floor          320×64, tileável   0,128
props / prop/arena/<ato>/boss-gate
personagens                1×                 pés na fileira de trás y=150 ou da frente y=166
arena/<ato>/fore           320×64             0,128
fx · HUD
```

O chão é largo, com duas fileiras, como na referência: heróis à esquerda (x 60..110), monstros à direita (x 210..280) e o chefe por volta de x=236 na fileira de trás, com o portão atrás dele.

| Ato | ID | Material | Silhueta |
|---|---|---|---|
| I | `arena/I/*` | ossos | parede de pedra, arcos com nichos de ossos, estandartes, gaiolas, velas |
| II | `arena/II/*` | ferro-negro | rocha, escoras, túnel, lanternas, passarela sobre água com trilhos |
| III | `arena/III/*` | esporos | três camadas de cogumelos gigantes, raízes, névoa violeta |
| IV | `arena/IV/*` | pérolas | arcada gótica, rosácea, feixes de luz, corais, lajes de mármore |
| V | `arena/V/*` | brasas | fileiras de picos de rocha com borda em brasa, fornalhas, correntes, chão com lava |
| VI | `arena/VI/*` | almas | coração petrificado, costelas, veias, olhos, luz vinda de baixo |

**Profundidade** (`arena/depth/entrance|descent|core|boss`, andares 1–4): `entrance` = escada, arco, tochas apagadas e névoa baixa. `descent` = correntes, raízes, vigas, escombros e poças. `core` = rachaduras e olhos (cor DL, tingir com a ênfase do ato) e cantos pesados. `boss` = portão em arco, estátuas e bases de braseiro (centro x 46 e 274). Círculo ritual: `decal/arena/ritual-circle` (160×16), depois do floor, centro em (160, 158).

**Props compartilhados** (`prop/arena/<nome>`, já na escala dos personagens): torch 16×32 e brazier 32×32 (4 quadros, 8 fps), chain 32×32, bones 32×16, rubble 32×16, stalagmite 16×32, column-broken 32×64, roots 48×32, mushroom 32×32, altar 64×32.

**Props por ato** (`prop/arena/<ato>/<nome>`):

| Ato | Props (tamanho) |
|---|---|
| I | urn 32×32 · candle 16×16 · skull-pile 32×32 · web 32×32 (âncora em cima) · boss-gate 96×96 |
| II | beam 32×64 · rail 64×32 · drowned-lantern 32×32 · pipe 64×32 · boss-gate 96×96 |
| III | spore-pod 32×32 · giant-mushroom 32×64 · glowing-pool 64×32 · root 32×32 · boss-gate 96×96 |
| IV | coral 32×32 · pearl 32×32 · statue 32×64 · broken-window 32×64 · boss-gate 96×96 |
| V | anvil 32×32 · lava-crack 64×32 · heavy-chain 32×64 · slag 32×32 · boss-gate 96×96 |
| VI | vein 32×64 · eye 32×32 · floating-shard 32×32 · bone-pedestal 32×32 · boss-gate 96×96 |

**FX** (`fx/<nome>`, 64×64, 5 quadros, sem loop, âncora no centro): slash, impact, poison, heal, ember, void, water. Por ato (Lote C): `fx/<ato>/slash` e `fx/<ato>/impact` na cor de ênfase.

**UI**: `ui/dungeon-frame` 64×64 (9-slice 16), `ui/hp-frame` 64×16 (9-slice 4; a barra entra em `fillRect` 4,5,56,6), `ui/boss-banner` 320×48, `ui/room-node` 48×16 (normal, atual, limpo). Retratos de monstro (Lote C): `ui/portrait/monster/<id>` e `ui/portrait/boss/<id>`, 32×36. Os normais são um busto em 2×, a mesma escala do painel; os chefes vêm de corpo inteiro em 1×.

### Monstros por andar e quadros de combate

| Variante | ID | Arquivo | Andar |
|---|---|---|---|
| base | `char/monster/<id>` | `char-monster-<id>.png` | 1 |
| deep | `char/monster/<id>-deep` | `char-monster-<id>-deep.png` | 2 (e 3, sem core) |
| core | `char/monster/<id>-core` | `char-monster-<id>-core.png` | 3 |
| chefe | `char/boss/<id>` | `char-boss-<id>.png` | 4, fase 1 |
| phase2 | `char/boss/<id>-phase2` | `char-boss-<id>-phase2.png` | 4, fase 2 |

Todas as folhas de monstro (base e variantes) têm **19 quadros**: idle 0–3 (6 fps), run 4–7 (10), ataque 8–11 (12), dano 12–13 (10) e morte 14–18 (8). Os heróis passam a **18 quadros**: os 0–8 continuam iguais (idle, run, hit), mais ataque 9–12 (12 fps) e morte 13–17 (8 fps). Os índices antigos não mudaram. No ataque, o corpo inclina e avança 1 px e solta um rastro curto; o avanço longo continua sendo o lunge do jogo. Na morte, o corpo desaba e se desfaz em cinzas dentro do mesmo canvas. Prévia: `preview/combat-frames.png`.

Prévias em escala de jogo: `preview/arena/arena-<ato>-<andar>-<fase>.png` (4×, 1280×768), `preview/arena-contact.png` (6 atos × 4 andares em 1×) e `preview/monster-variants.png`. A referência usada está em `docs/REFERENCIA-DUNGEON.gif`.

## Ícone da aba (favicon)

O ícone é o olho da vigília: âmbar, pupila em fenda, sobre um quadrado violeta escuro. O 16×16 foi desenhado à mão para a aba; o 32×32 é a base dos tamanhos maiores. Copie `export/web/*` para a pasta pública do jogo e use:

```html
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

Para PWA, use `icon-192.png` e `icon-512.png` no `manifest.webmanifest`.

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
- Retratos de monstro (opcionais pelo brief): 32×36 se o painel ganhar slot próprio.
