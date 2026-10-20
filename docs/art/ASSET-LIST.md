# Lista de assets — Vigília

**Versão:** 0.1.0-skeleton (2026-10-20)
**Contrato visual:** [`ART-BRIEF.md`](ART-BRIEF.md)
**Manifesto:** [`../../public/assets/vigilia/manifest.json`](../../public/assets/vigilia/manifest.json)

Esta lista organiza o que existe, o que é prioridade e o que precisa ser criado/substituído. Os IDs usam os nomes do jogo em português; os padrões entre `{ }` são expandidos no manifesto.

## Legenda

**Prioridade**

- **P0** — identidade visual e teste de estilo; sem isso o novo pack não começa.
- **P1** — necessário para a vila ficar coerente.
- **P2** — polimento, UI, efeitos e substituições opcionais.

**Hoje**

- `third-party` — Tiny Town ou 0x72; funciona, substituição é opcional.
- `procedural` — gerado por código (`src/render/art.ts` / `src/render/town.ts`); é o alvo natural de arte externa.
- `svg` — ícone vetorial em `src/ui/icons.tsx`.
- `todo` — ainda não existe.

**Ação**

- `criar` — não existe como arte externa.
- `substituir` — existe, mas o pack novo pode assumir.
- `manter` — não é prioridade.

## Terreno, cidade e decalques

| P | ID | Tipo | Tamanho | Footprint | Estados | Hoje | Ação |
|---|---|---|---|---|---|---|---|
| P0 | `tile/town/terrain` | tileset | 16×16/tile | 50×32 tiles | grama, terra, estrada, pedra, água, penhasco, abismo; autotile | third-party | substituir opcional |
| P1 | `tile/town/props` | props | 16×16 / 32×32 | livre | árvores, cercas, poço, feno, sacos, placas, troncos | third-party | substituir opcional |
| P1 | `tile/town/abyss` | tileset/props | 16×16 | livre | ruínas, escada, colunas, chão, crânios | third-party | substituir opcional |
| P2 | `tile/town/cemetery` | tileset/props | 16×16 | 10×7 | cerca de ferro, covas, terra | third-party | manter/substituir |
| P2 | `decal/grave` | decalque | 10×12 | 1×1 | lápide | procedural | criar |
| P2 | `decal/sign` | decalque | 16×16 | 1×1 | placa em branco | third-party | criar |
| P2 | `decal/banner` | decalque | 16×32 | 1×2 | estandarte | — | criar |
| P2 | `decal/rubble` | decalque | 16×16 | livre | entulho/pedra | — | criar |

> O terreno é o item mais sensível a **costura**: entregue as 9 partes de terra, as bordas de estrada e os cantos internos. Teste em 1,5×; um pixel de folga aparece como linha preta.

## Prédios e moradias

Os 7 prédios têm 3 níveis + ruína. Entregar **uma imagem por estado**, no footprint, com a porta no centro e a placa **sem texto**. O campo é maior (9×6) porque é um pátio cercado.

| P | ID | Tamanho | Footprint | Estados | Hoje | Ação |
|---|---|---|---|---|---|---|
| P0 | `building/taverna/level-{1,2,3}` + `building/taverna/ruin` | 112×96 | 7×6 | 4 | third-party | substituir (teste de estilo P0) |
| P1 | `building/templo/...` | 112×96 | 7×6 | 4 | third-party | substituir opcional |
| P1 | `building/guilda/...` | 112×96 | 7×6 | 4 | third-party | substituir opcional |
| P1 | `building/estalagem/...` | 112×96 | 7×6 | 4 | third-party | substituir opcional |
| P1 | `building/casa/...` | 112×96 | 7×6 | 4 | third-party | substituir opcional |
| P1 | `building/ferreiro/...` | 112×96 | 7×6 | 4 | third-party | substituir opcional |
| P2 | `building/campo/...` | 144×96 | 9×6 | 4 | third-party | substituir opcional |
| P1 | `building/house/{01..05}` | 64×48 | 4×3 | 1 (5 variantes) | procedural | criar |

Observações:

- **Taverna** é o teste de estilo dos prédios: telhado vermelho, madeira, placa sem texto, porta central.
- **Estalagem** pode ter telhado cinza e mais janelas.
- **Ferreiro** precisa de forja/chaminé; a fumaça é FX separado.
- **Campo** é um pátio com cerca, alvos de treino e chão de terra; não é uma casa.
- **Casas** são as 5 da borda sul; variar madeira/pedra e telhado vermelho/cinza.

## Entrada, fonte termal e marcos

| P | ID | Tipo | Tamanho | Footprint | Estados | Hoje | Ação |
|---|---|---|---|---|---|---|---|
| P0 | `prop/gate-horn/open` | estrutura | 80×96 | 5×6 | open (opcional closed/ruin) | procedural | criar (teste de estilo) |
| P0 | `prop/thermal/basin` | estrutura | 80×64 | 5×4 | cheia | procedural | criar |
| P1 | `prop/thermal/yard` | terreiro | 112×96 | 7×6 | — | procedural | criar (opcional, pode ser tiles) |
| P2 | `prop/thermal/bench` | prop | 16×16 | 1×1 | — | procedural | criar |
| P2 | `prop/coffer` | prop | 32×32 | 1×1 | — | procedural | criar |
| P2 | `prop/board` | prop | 32×32 | 1×1 | — | procedural | criar |
| P2 | `prop/campfire` | prop | 32×32 | 1×1 | apagada/acesa | procedural | criar |

O portão + berrante é **uma imagem só**: passagem central transparente, viga em cima e berrante grande montado sobre ela. O jogo usa a versão aberta; a variante fechada é opcional.

## Personagens

### Heróis

| P | ID | Tamanho | Estados | Hoje | Ação |
|---|---|---|---|---|---|
| P1 | `char/hero/{guardiao,selvagem,lanceiro,arqueiro,clerigo,piromante}/{m,f}` | 16×28 | idle 4, run 4, hit 1 | third-party | substituir opcional |

Se o pack novo vier, manter **perfil + flip horizontal** (sem 4 direções) para não exigir mudança no motor. Entregar spritesheet + JSON com frames e pivô.

### Moradores

| P | ID | Tamanho | Estados | Hoje | Ação |
|---|---|---|---|---|---|
| P0 | `char/villager/lavrador/{m,f}` | 16×21 | idle 2, walk 2 | procedural | criar (teste de estilo) |
| P1 | `char/villager/artesa/{m,f}` | 16×21 | idle 2, walk 2 | procedural | criar |
| P1 | `char/villager/acolito/{m,f}` | 16×21 | idle 2, walk 2 | procedural | criar |
| P1 | `char/villager/guarda/{m,f}` | 16×21 | idle 2, walk 2 | procedural | criar |
| P2 | `char/mayor` | 16×23 | idle 4, run 4 | third-party (`doc`) | substituir opcional |
| P2 | `char/child/{m,f}` | 16×21 | idle 2, walk 2 | procedural | criar |
| P2 | `char/monster/{...}` + `char/boss/{...}` | 16×16/16×28 | conforme 0x72 | third-party | manter |

Os ofícios usam quatro corpos: lavrador (lavrador/pedreiro), artesã (copeiro/ferreiro), acólito e guarda. Se quiser um quinto corpo para o pedreiro, é um adicional opcional.

## UI e ícones

| P | ID | Tipo | Tamanho | Hoje | Ação |
|---|---|---|---|---|---|
| P1 | `ui/icon/activity/{descansar,beber,rezar,comprar,treinar,tumulo,socializar,aguardar,tratar,termas}` | ícone | 24×24 | procedural | criar/consolidar |
| P1 | `ui/icon/resource/{gold,materials,population,heroes,energy}` | ícone | 24×24 | svg | criar/consolidar |
| P2 | `ui/icon/weapon/{guardiao,selvagem,lanceiro,arqueiro,clerigo,piromante}` | ícone | 24×24 | recorte/SVG | substituir opcional |
| P2 | `ui/icon/armor` | ícone | 24×24 | SVG/gerado | substituir opcional |
| P2 | `ui/portrait/hero/{class}/{m,f}` | retrato | 16×28 source | third-party | substituir opcional |
| P2 | `ui/icon/rank/{E,D,C,B,A,S}` | ícone | 16×16 | procedural | criar |

Ícones de linha podem ser **SVG** com `currentColor`; ícones de pixel podem ser PNG. Não assar texto dentro do ícone.

## Efeitos e animações

| P | ID | Tipo | Tamanho | Estados | Hoje | Ação |
|---|---|---|---|---|---|---|
| P1 | `fx/steam` | sequência | 32×32 | loop 6–8 frames | procedural | criar |
| P1 | `fx/fire` | sequência | 16×16 | loop 4–6 frames | procedural | criar |
| P2 | `fx/spark` | sequência | 8×8 | loop 3–4 frames | procedural | criar |
| P2 | `fx/raid-shade` | sprite | 16×28 | 1–2 frames | third-party | manter |
| P2 | `fx/raid-flash` | overlay | tela | 1 frame | procedural | criar |
| P2 | `fx/blood`/`fx/dust` | decalque | 8×8 | 1–2 frames | — | criar |

Efeitos devem ter alpha limpo, sem fundo; o motor usa blend aditivo em alguns casos. Não pinte glow difuso dentro do sprite.

## Contagem aproximada

- **28** imagens de prédios (7 × 4 estados) + **5** casas;
- **1** portão/berrante + **1** bacia termal;
- **12** bases de herói + **8** bases de morador;
- **~30** ícones de UI;
- **~6** efeitos;
- **~5** decalques.

## Ordem de produção sugerida

1. **P0:** `tile/town/terrain` (amostra), `building/taverna` nível 1, `prop/gate-horn/open`, `char/villager/lavrador/f`.
2. **P0/P1:** demais prédios (4 estados), 5 casas, bacia termal, demais moradores.
3. **P1:** heróis, UI principal, efeitos de fogo/vapor.
4. **P2:** monstros, retratos, decalques, variantes extras.

## Critérios de aceite

Os mesmos do [`ART-BRIEF.md`](ART-BRIEF.md#7-critérios-de-aceite): footprint/pivô, transparência, sem texto/sombra/glow assados, leitura em 1,5×, frames completos, manifesto válido, licença e screenshot no jogo.
