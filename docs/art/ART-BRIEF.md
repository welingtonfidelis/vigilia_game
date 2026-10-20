# Diretrizes de arte — Vigília

**Status:** esqueleto de handoff (2026-10-20). Ainda não há arquivos de arte externos neste pacote.
**Fonte da verdade dos assets:** [`public/assets/vigilia/manifest.json`](../../public/assets/vigilia/manifest.json)
**Lista completa:** [`ASSET-LIST.md`](ASSET-LIST.md)

Este documento é o contrato visual para uma pessoa ou IA criar/substituir a arte do jogo. Ele descreve o estado atual, as regras técnicas, como cada peça deve ser pedida e como o pacote deve ser entregue para entrar no projeto sem retrabalho.

## 1. Retrato do jogo hoje

| Item | Estado atual |
|---|---|
| Motor | Phaser 3.90 + Preact |
| Mundo | 50×32 tiles; 1600×1024 unidades |
| Tile | 16×16 px de arte; `ART_SCALE = 2` (32 unidades por tile) |
| Câmera | fixa em **1,5×**, acompanhando o prefeito; **sem zoom** por roda/pinça |
| Estilo | fantasia sombria, top-down 3/4, fachadas frontais |
| Pós-processamento | dessaturação −55%, brilho 0,8, contraste +0,08, vinheta |
| Chão | assado numa `RenderTexture`; UVs recuadas 0,5 texel contra vazamento do atlas |
| Prédios | 7 lotes, 3 níveis + ruína; hoje compostos com tiles do Tiny Town |
| Casinhas | 5 na borda sul, 4×3 tiles; hoje compostas com tiles |
| Portão + berrante | imagem única 80×96 px (5×6 tiles), hoje **gerada em código** |
| Fonte termal | bacia 80×64 px (5×4 tiles) + terreiro 7×6, hoje **gerada em código** |
| Heróis | 16×28 px; 4 idle, 4 run, 1 hit; sprites do 0x72 |
| Moradores | 16×21 px; 2 quadros (idle/caminhada); hoje **gerados em código** |
| Prefeito | 16×23 px (`doc` do 0x72) |
| Monstros/chefes | 0x72; não é prioridade substituir |
| Ícones de UI | 24×24; SVG de traço e alguns recortes do 0x72 |
| Texto | sempre renderizado pelo jogo; **não assar texto na imagem** |

## 2. Estilo

- **Perspectiva:** top-down 3/4, câmera alta; prédios com a fachada voltada para o sul (para a câmera). Nada de isométrico.
- **Escala:** 16 px por tile; personagens em escala chibi (cabeça grande, corpo curto). Heróis 16×28; moradores 16×21.
- **Contorno:** 1 px escuro em personagens, estruturas e props; evitar contorno duplo.
- **Sombreamento:** 2–3 tons por material; luz consistente vinda de cima/esquerda; dithering só se necessário.
- **Paleta:** 32–48 cores, escura e terrosa, com dourado/teal como acentos. Comece pela [`palette/vigilia.gpl`](../../public/assets/vigilia/palette/vigilia.gpl).
- **Clima:** vila à beira de um abismo; madeira velha, pedra, ferrugem, tecido desbotado. O abismo usa roxo/verde doentio.
- **Referência:** a imagem do Tristram enviada pelo autor serve como **clima e composição** (portão de madeira + berrante grande em cima). Não copiar silhueta, textura ou layout da referência.
- **Pós-processamento:** o jogo escurece e dessatura a cena. Entregue a arte um pouco **mais clara e saturada** que o resultado final; valide com uma captura no jogo, não só no editor.

## 3. Especificações técnicas obrigatórias

| Campo | Regra |
|---|---|
| Arquivo | PNG-32, sRGB, transparente, sem interlace, sem compressão com perda |
| Escala | entregar em **1×** (16 px = 16 px); o motor amplia 2× |
| Pivô | personagens, prédios e props: **embaixo-centro**; tiles: **canto superior esquerdo** |
| Footprint | prédios: 7×6 tiles (112×96 px), exceto campo 9×6 (144×96); casas: 4×3 (64×48); portão: 5×6 (80×96); termas: 5×4 (80×64) |
| Anti-alias | desligado; nada de bordas suaves, gradientes fotográficos ou subpixel |
| Sombra | **não assar** sombra projetada; o jogo já tem camada de sombra/vinheta |
| Glow | **não assar** brilho difuso; fogo, vapor e faíscas são FX separados |
| Texto | **nenhum** texto, número, runa legível ou placa escrita; os rótulos são do jogo |
| Animação | personagens em perfil, flip horizontal; heróis 4 idle + 4 run + 1 hit; moradores 2 quadros |
| Fonte | Aseprite ou PSD com layers nomeadas; exportar PNGs e JSON de frames |
| Licença | preferir CC0; se CC-BY, incluir crédito; IA: combinar direitos de uso e não copiar a referência |

### Escala na tela

Com `ART_SCALE = 2` e câmera `1,5×`, **1 pixel de arte = 3 pixels de tela**. Detalhes de 1 px são visíveis, mas não dependa deles para leitura. Teste em:

- desktop: 1370×1289;
- celular: 390×844 (a câmera fica mais fechada).

## 4. Como pedir cada peça (ficha)

Use uma ficha por asset — tabela, YAML ou o bloco abaixo. Não peça “a cidade inteira” de uma vez.

```text
ID:
Onde entra:
Tipo: tile | prédio | personagem | prop | UI | efeito | decalque
Tamanho: [largura, altura] px
Footprint: [colunas, linhas] tiles
Pivô: [0.5, 1] | [0, 0]
Vista: top-down 3/4 | perfil | frontal
Estados/animação:
Paleta/luz/contorno:
Referências (clima, não copiar):
Restrições:
Arquivos:
Critérios de aceite:
```

### Exemplo preenchido — portão + berrante

```text
ID: prop/gate-horn/open
Onde entra: entrada da cidade, centro-esquerdo, sobre a estrada de cima
Tipo: prop/estrutura
Tamanho: 80×96 px
Footprint: 5×6 tiles
Pivô: [0.5, 1]
Vista: frontal, top-down 3/4
Estados: open (o jogo usa aberto); opcional closed/ruin
Paleta: madeira escura, ferro velho, chifre cinza, braçadeira de latão
Referências: portão de madeira com berrante grande na viga (clima do Tristram)
Restrições: passagem central transparente; sem texto; sem sombra/glow assados;
  o berrante fica acima da viga, não atrás do portão
Arquivos: export/png/prop-gate-horn-open.png
Aceite: cabe no footprint, lê a 1,5×, passagem alinhada ao ponto do portão,
  berrante legível a 3 px/art px, transparente
```

### Exemplo — taverna

```text
ID: building/taverna/level-2
Tamanho: 112×96 px
Footprint: 7×6 tiles
Pivô: [0.5, 1]
Estados do conjunto: level-1, level-2, level-3, ruin
Vista: fachada frontal; porta no centro; telhado vermelho; placa sem texto
Restrições: sem pessoas, sem fumaça, sem rótulo; porta alinhada ao centro do lote
Arquivos: building-taverna-level-2.png
```

### Exemplo — terreno

```text
ID: tile/town/terrain
Tamanho: 16×16 px por tile
Formato: tileset PNG + JSON de autotile
Cobertura mínima: grama, terra, estrada, pedra, água, penhasco, abismo
Estados: 9 partes de terra (cantos, bordas, centro), 4 direções de estrada
Restrições: tiles sem costura em 1,5×; sem props/personagens embutidos
Arquivos: export/tiles/town-terrain.png + town-terrain.json
```

### Exemplo — morador

```text
ID: char/villager/lavrador/f
Tamanho: 16×21 px por quadro
Vista: perfil, flip horizontal
Animações: idle [0,1] a 3 fps; walk [0,1] a 8 fps
Pivô: [0.5, 1] nos pés
Paleta: túnica verde, calça escura, chapéu de palha
Restrições: sem arma, sem rótulo, sem sombra; silhueta distinta dos heróis
Arquivos: char-villager-lavrador-f.png + JSON
```

## 5. Prompt para IA

```text
Você está criando pixel art para Vigília, um jogo de gestão de vila em
fantasia sombria. Siga as regras abaixo sem exceção.

REGRAS GLOBAIS
- Grade de 16×16 px; entregar em 1×, PNG-32 transparente, sRGB.
- Top-down 3/4; personagens em perfil com flip horizontal; prédios frontais.
- Contorno de 1 px, 2–3 tons por material, sem anti-alias, sem subpixel.
- Sem texto, sem sombra projetada, sem glow; efeitos são arquivos separados.
- Paleta escura e terrosa; entregue um pouco mais claro/saturado que o
  resultado final (o motor dessatura −55% e escurece para 0,8).
- Pivô embaixo-centro para personagens/prédios/props; canto superior
  esquerdo para tiles.
- Não copie a imagem de referência; use só o clima/composição.

ASSET
ID: ...
Onde entra: ...
Tamanho/footprint: ...
Pivô: ...
Estados/animação: ...
Paleta/luz: ...
Restrições: ...
Arquivos: ...

ENTREGA
PNG(s) + JSON de frames + source Aseprite/PSD + contact sheet + licença.
Mostre primeiro um teste de estilo (1 tile + 1 prédio + 1 personagem)
antes de produzir o lote.
```

## 6. Nomes, pastas e manifesto

### Nomes de arquivo

- **kebab-case**, ASCII, minúsculo, sem espaços ou acentos.
- Prefixo por categoria: `tile-`, `building-`, `char-`, `prop-`, `fx-`, `ui-`, `decal-`.
- Quadros com zero à esquerda: `idle-00`, `walk-01`.
- Estados: `level-1`, `level-2`, `level-3`, `ruin`, `open`, `closed`.
- Versão do pacote no `manifest.json`, **nunca no nome do arquivo**.

```text
building-taverna-level-1.png
building-taverna-ruin.png
building-house-03.png
prop-gate-horn-open.png
char-villager-lavrador-f.png
char-hero-guardiao-m.png
tile-town-terrain.png
ui-icon-activity-termas.svg
fx-steam.png
```

### IDs (no manifesto/atlas)

Use **os IDs do jogo em português**, com barras:

```text
building/taverna/level-1
building/taverna/ruin
building/house/03
prop/gate-horn/open
char/villager/lavrador/f
char/hero/guardiao/m
tile/town/terrain
ui/icon/activity/termas
fx/steam
```

IDs existentes que **não devem ser traduzidos**: `templo`, `taverna`, `guilda`, `estalagem`, `casa`, `campo`, `ferreiro`; `guardiao`, `selvagem`, `lanceiro`, `arqueiro`, `clerigo`, `piromante`; `portao`, `berrante`, `termas`, `cofre`, `quadro`, `fogueira`, `cemiterio`.

### Estrutura de entrega

```text
vigilia-art-v01/
  README.md
  manifest.json
  CHANGELOG.md
  palette/vigilia.gpl
  source/                    # .aseprite/.psd (não vai para o build)
  export/png/
  export/tiles/
  export/fx/
  export/ui/
  preview/contact-sheet.png
  licenses/
```

No projeto, o pacote entra em:

```text
public/assets/vigilia/
  manifest.json
  palette/vigilia.gpl
  export/...
```

Os pacotes atuais (`public/assets/kenney-tiny-town` e `0x72-dungeontileset-ii`) **não devem ser sobrescritos**: eles têm licença/atribuição próprias. O pack `vigilia` é adicional, com fallback para os antigos.

### Formato do manifesto

O manifesto é a fonte da verdade. Campos mínimos por asset:

```json
{
  "id": "prop/gate-horn/open",
  "type": "prop",
  "file": "export/png/prop-gate-horn-open.png",
  "size": [80, 96],
  "footprint": [5, 6],
  "anchor": [0.5, 1],
  "states": ["open"],
  "priority": "P0",
  "status": "todo",
  "current": "procedural",
  "license": "TBD"
}
```

Status aceitos: `third-party`, `procedural`, `todo`, `wip`, `review`, `done`.

## 7. Critérios de aceite

- [ ] Cabe exatamente no footprint e no pivô combinados.
- [ ] PNG transparente; nenhum fundo ou halo indesejado.
- [ ] Sem texto, sem sombra projetada, sem glow assado.
- [ ] Paleta coerente com `vigilia.gpl` (ou desvio justificado).
- [ ] Lê bem a 1,5× e a 3 px por pixel de arte.
- [ ] Frames completos, na ordem e com os nomes do manifesto.
- [ ] Sem costura visível em tiles e emendas de prédio.
- [ ] Contact sheet + screenshot no jogo (desktop e celular).
- [ ] `manifest.json` válido, IDs e nomes de arquivo conferindo.
- [ ] Licença e autoria documentadas em `licenses/`.

## 8. Ordem de aprovação

1. **Teste de estilo:** 1 tile de terreno + a taverna nível 1 + o portão/berrante.
2. **Bloco jogável:** os 7 prédios (4 estados) + 5 casas + terreno.
3. **Pessoas:** heróis e moradores.
4. **Polimento:** UI, FX, decalques, monstros.

Não aprove um lote inteiro antes do teste de estilo; o custo de correção é muito maior.

## 9. Integração atual (para quem for programar)

- O jogo lê `town` (Tiny Town) e `dungeon` (0x72) no carregamento; texturas pequenas são geradas em `src/render/art.ts` e `src/render/town.ts`.
- O portão/berrante atual é uma textura `gate-horn` gerada em `src/render/town.ts`; a fonte termal e as casinhas também são geradas/compostas em código.
- O novo pack deve ser carregado por um loader próprio e mapeado pelos IDs do manifesto; **não** trocar os IDs de jogo.
- Prédios podem virar **uma imagem por nível/ruína** (recomendado para arte externa) ou um kit de tiles; a primeira opção exige adaptar `buildings.ts`.
- Os rótulos (`Berrante`, `Portão da vila`, `Fonte termal`, nomes de heróis) continuam no motor, em pt-BR.
- A câmera fixa de 1,5× não deve ser contrariada por arte com perspectiva, escala ou luz diferente.

## 10. O que não pedir

- “Uma cidade inteira em uma imagem” — o jogo é em tiles e a câmera rola.
- Texto/rótulos assados na arte.
- Sombra/glow pintados na imagem.
- Anti-alias, 2×/4× no arquivo, JPG ou fundo branco.
- Cópia de Tiny Town, 0x72 ou da referência do Tristram.
- 4 direções de personagem se o motor usa perfil + flip (a não ser que o escopo inclua a adaptação).
- Arquivos com acento, espaço, maiúscula ou versão no nome.
