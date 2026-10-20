# Feedback e pedido de mudanças — `vigilia-art-v01`

**Pacote analisado:** `vigilia-art-v01` (manifesto 0.7.0-draft, 79 assets)
**Decisões do projeto nesta rodada:**

1. Personagens passam para **perfil/3-4 voltado para a direita** (o motor espelha no X); ver [`PROFILE-REQUEST.md`](PROFILE-REQUEST.md).
2. As **armas de classe foram aceitas** e devem continuar no passe de perfil.
3. Prédios terão **luzes de janela separadas** para dia/noite.
4. O pacote precisa de **licença, README e metadados** antes de entrar no jogo.

---

## A. Ajustes nos assets existentes

### A1. Personagens em perfil

Pedido completo em [`PROFILE-REQUEST.md`](PROFILE-REQUEST.md). Resumo:

- heróis 16×28 (9 quadros), moradores 16×21 (2), prefeito 16×23 (8);
- perfil/3-4 para a direita; esquerda via flip; sem 4 direções;
- **manter as armas** de classe, carregadas e dentro do quadro;
- mesmos nomes, IDs, pivôs e JSON.

### A2. Prédios com luz acesa/apagada

Os PNGs atuais têm **janelas amarelas assadas** em todos os níveis. Para o dia/noite, o ideal é separar:

**Opção recomendada — base + overlay**

- `building-<id>-<estado>.png`: base **sem** janelas acesas/brilho;
- `building-<id>-<estado>-lights.png`: mesmo canvas e pivô, transparente, contendo **apenas** janelas acesas e o halo quente.

O motor já tem uma camada de luzes; o overlay entra nela e pode acender no crepúsculo e apagar no amanhecer. São 28 bases + 28 overlays para os prédios, mais 5 casas se elas também tiverem janela.

**Alternativa — duas variantes completas**

- `...-day.png` (sem luz) e `...-night.png` (com luz), mesmo canvas/pivô.
- Mais simples para o artista, porém dobra o número de imagens e exige troca de textura.

**Aceite:** overlay alinhado em `0,0`; sem silhueta do prédio; sem sombra; sem texto; o dia não pode ter janela acesa; o cruzamento crepúsculo/amanhecer não pode “piscar” desalinhado. Se as casas não tiverem janela acesa, podem ficar só na base.

### A3. Prédios: porta, escala e rótulo

- A porta deve continuar **no centro horizontal** e **na base** do canvas (o motor ancora embaixo-centro).
- O desenho deve caber no footprint: 112×96 (7×6) e campo 144×96 (9×6). Alguns níveis 3 chegam à borda; está ok, mas não pode ultrapassar.
- Placas continuam **sem texto**; o jogo desenha `Templo`, `Taverna`, etc.
- Validar no jogo: os prédios novos parecem maiores que os atuais porque preenchem mais o lote; se ficarem desproporcionais aos personagens, reduzir a silhueta sem mudar o canvas.

### A4. Tileset: validação de costura e cobertura

- O tileset 8×8 está bom como base, mas precisa de uma **folha de contato/validação** com as 9 partes de terra, trilha, água, penhasco e abismo montadas em um mapa de teste.
- **Falta cerca de cemitério** (o jogo atual usa uma cerca de ferro do Tiny Town) — ver lista B.
- **Falta variante de outono** (o mapa atual tem floresta de outono; o pack só tem grama/pinheiros). Se não for escopo, o mapa pode ficar só com pinheiros, mas é uma decisão de direção.
- O pack tem `trail`, `dirt`, `water`, `cliff`, `abyss`, `rock`, `yard`, `mud`, `flagstone`; confirmar que as transições usadas no mapa atual existem.

### A5. Pacote, README, manifesto e licença

- `README.md` está **vazio**; criar um README curto com versão, autor, licença, mapa de pastas, formato dos frames e como carregar.
- `licenses/LICENSE.md` está **TBD**; ver seção D.
- `manifest.json` aponta para `docs/art/...`, mas os arquivos estão na raiz do pack; corrigir os caminhos.
- `preview/contact-sheet.png` é referenciado, mas **não existe**; entregar a folha de contato.
- No manifesto, `size` é o **tamanho do quadro**, não da spritesheet. Adicionar `sheetSize` (ex.: 144×28), `frameSize` (16×28), `columns` e `frames` para personagens/FX; para tileset, `columns/rows` e `tileSize`.
- Remover `.DS_Store` do pacote.
- Status `review` em todos os assets: atualizar para `wip`/`review`/`done` conforme o caso.
- Previews atuais são composições/crops; faltam **screenshots do jogo real** em 1370×1289 e 390×844, com o postFX e a câmera 1,5×.

### A6. Layout

A composição `town-composition-ingame.png` propõe um layout diferente do jogo atual (portão à esquerda, caverna à direita, taverna no sul etc.). O projeto pode:

- **re-skin do layout atual** (recomendado para não misturar arte e gameplay);
- ou adotar a composição como novo layout.

Isso não é uma mudança do pack; é uma decisão do projeto. A arte será aplicada sobre o layout escolhido.

---

## B. O que falta no pacote

### P0 — antes de integrar

| ID / item | Especificação | Por quê |
|---|---|---|
| **Personagens em perfil** | ver [`PROFILE-REQUEST.md`](PROFILE-REQUEST.md) | o frente/flip atual parece deslizar |
| **Overlays de luz dos prédios** | base sem luz + `-lights` (A2) | dia/noite sem janela acesa no dia |
| **README, LICENSE, contact sheet** | versão, autor, licença, folha de contato | handoff e uso no repositório |
| **Manifesto corrigido** | caminhos, `sheetSize`/`frameSize`, previews | loader e validação |
| **Preview no jogo** | 1370×1289 e 390×844 | escala, escuridão e pós-processamento |

### P1 — para a vila ficar completa

| ID / item | Especificação | Por quê |
|---|---|---|
| **Ícones de atividade** | 24×24, SVG com `currentColor` ou PNG: `descansar`, `beber`, `rezar`, `comprar`, `treinar`, `tumulo`, `socializar`, `aguardar`, `tratar`, `termas` | HUD/painéis |
| **Ícones de recurso** | 24×24: `gold`, `materials`, `population`, `heroes`, `energy` | HUD |
| **Ranks** | 16×16: E, D, C, B, A, S | medalha no mapa/ficha |
| **Retratos de herói** | 12 (6 classes × 2 gêneros) + prefeito; 48×84 ou frame 16×28 | ficha/elenco; os atuais são 0x72 e vão destoar |
| **Crianças** | `char/child/{m,f}` 16×21, 2 quadros | praça/famílias |
| **Cerca do cemitério** | peças 16×16 (horizontal/vertical/canto) ou um conjunto fechado | o jogo atual usa cerca do Tiny Town |
| **Props de praça** | poço, feno, sacos, balde, troncos, cerca, placa (a placa já existe) | `buildProps`/`buildCampfire`/`buildThermal` |
| **Ícones de arma/armadura** | 24×24: 6 armas + armadura | ficha do herói |

### P2 — polimento/consistência

| ID / item | Especificação | Por quê |
|---|---|---|
| **Monstros e chefes** | 18 inimigos + 6 chefes (16×16/16×28, animações) | se o pacote for a arte definitiva, o 0x72 no painel da masmorra destoa |
| **Variante de outono** | tiles de grama/árvore de outono | o mapa atual tem floresta de outono |
| **Props extras** | poço, bancos, lamparinas, carroça, barris | variedade da vila |
| **Portraits de monstros** | para o painel do abismo | consistência com os novos heróis |

> **Itens que já existem e não precisam ser pedidos:** portão+berrante aberto/fechado, bacia termal cheia/vazia + água + banco, caverna, cofre, quadro, fogueira acesa/apagada, árvores, pedras, lápide, placa, estandarte, entulho, FX de fogo/vapor/faísca.

---

## C. Prioridade de entrega

1. **P0:** personagens em perfil + overlays de luz + README/licença/contact sheet + manifesto + screenshots no jogo.
2. **P1:** ícones, retratos, crianças, cerca do cemitério, props de praça.
3. **P2:** monstros/chefes, outono, props extras.

Não é necessário entregar P1/P2 para começar a integração; P0 já permite um teste vertical.

---

## D. Licença

O material foi gerado por outra IA a pedido do projeto. Em princípio, o comitente pode definir a licença do **output**, desde que os termos da ferramenta permitam. Como arte de IA pode ter proteção autoral limitada em algumas jurisdições, a opção mais simples é:

**Recomendado: CC0 1.0**

- vale para os PNGs e para `source/generator/` (ou MIT para o código);
- não exige atribuição, mas um `NOTICE` é bem-vindo;
- combina com Tiny Town/0x72, que já são CC0.

**Alternativa: CC BY 4.0**

- se quiser crédito obrigatório; incluir autor/equipe e link.

**Documentar no pack:**

```text
Vigília Art Pack — © 2026 [autor/equipe]
Licença: CC0 1.0 (ou CC BY 4.0)
Gerado com [ferramenta] a pedido de [autor], a partir dos prompts e do
gerador em source/generator/.
Não contém arte do Tiny Town nem do 0x72; esses packs mantêm suas licenças.
```

Não é aconselhamento jurídico; para uso comercial, vale uma revisão. Não relicenciar Tiny Town/0x72.

---

## E. Critérios de aceite

- [ ] Personagens em perfil/3-4 para a direita; flip esquerda; armas aceitas e contidas.
- [ ] Prédios com base sem luz + overlay alinhado (ou day/night completos).
- [ ] Portas no centro/base; footprints 112×96, 144×96, 64×48.
- [ ] Sem texto, sombra, glow assado ou anti-alias.
- [ ] README, licença, contact sheet e manifesto válidos.
- [ ] Screenshots no jogo real (desktop e celular) com câmera 1,5×.
- [ ] Tileset validado em mapa de teste, sem costura.
- [ ] Nomes/IDs/pivôs/frames iguais aos do manifesto.

---

## F. Mensagem curta para enviar

```text
Segue o feedback do pacote vigilia-art-v01.

Prioridade:
1. Refazer os personagens em perfil/3-4 para a direita, mantendo as armas
   de classe e todos os tamanhos/frames/pivôs (ver PROFILE-REQUEST.md).
2. Separar as luzes dos prédios: base sem janelas acesas + overlay "-lights"
   no mesmo canvas/pivô (ou variantes day/night completas).
3. Corrigir README, LICENSE, caminhos do manifesto, contact sheet e adicionar
   sheetSize/frameSize; remover .DS_Store.
4. Entregar screenshots no jogo real (1370×1289 e 390×844).

Depois, na ordem P1/P2: ícones de UI, retratos, crianças, cerca do cemitério,
props de praça e, se o pacote for a arte definitiva, monstros/chefes.

Licença sugerida: CC0 1.0 para os PNGs e o gerador, com NOTICE de proveniência.
```
