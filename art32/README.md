# Arte 32-bit do Vigília

Geradores em Python 3 + Pillow da arte 32-bit (a opção **Arte: 32-bit** do menu). Cada
peça é o par de uma peça 16-bit do pack (`public/assets/vigilia/export/`), com o mesmo id.

## Convenção

- **Arquivo:** o mesmo nome, em `export32/` no lugar de `export/`. Exemplo:
  `export/png/building-taverna-level-3.png` vira `export32/png/building-taverna-level-3.png`.
  Use `lib32.save32(img, file)`, que confere o tamanho.
- **Tamanho:** exatamente o dobro em cada eixo. Em folhas de animação, cada quadro tem o
  dobro (24×32 vira 48×64), com a **mesma quantidade e ordem de quadros** e a mesma âncora
  (em geral o pé no meio de baixo).
- **Enquadramento:** a silhueta 32-bit cobre o mesmo lugar que a 16-bit ampliada, porque
  colisão, sombra projetada, janelas acesas e rótulos leem a peça 16-bit. Em prédios, as
  janelas ficam nos mesmos lugares (o overlay `-lights` também tem par 32-bit).
- **Estilo:**
  - 4 a 5 tons por material (rampas em `lib32.py`), luz de cima e da esquerda.
  - Contorno de 1 px: a cor `OL` só na silhueta de fora; por dentro, linhas na cor do
    material escurecida.
  - Detalhe que caiba no pixel novo: telha a telha, tijolo a tijolo, veio de madeira,
    reflexo no vidro, musgo, cravos, costuras, dobras de pano.
  - Sem anti-alias com transparência parcial: alfa 0 ou 255.
- **Referências:** `taverna32.py` (prédio desenhado do zero) e `herois32.py` (herói montado
  por peças, com todas as animações e a caminhada de perfil).
- **Proibido:** copiar ou derivar de arte de terceiros (Kenney, 0x72, Tristram, Diablo).
  Tudo sai destes geradores.

## Rodar

Um gerador por categoria (os arquivos `<categoria>32_*.py` são as partes dele):

| Gerador | O que grava |
|---|---|
| `vila32.py` | chão (tileset do terreno, grama de outono, cercas), árvores, pedras, enfeites, fonte termal, caverna, portão, berrante, lampião e os efeitos de fogo, faísca e vapor |
| `predios32.py` | os 7 prédios (ruína e níveis 1–3, menos a taverna 3) e as 5 casinhas, com o overlay `-lights` |
| `taverna32.py` | a taverna nível 3 (o piloto) |
| `gente32.py` | prefeito, moradores, crianças, cães, gatos e os retratos do prefeito |
| `herois32.py` | os 12 heróis (folha de frente, caminhada de perfil e retrato) |
| `monstros32_a.py` | monstros e chefes dos atos I–III, com variantes e retratos |
| `monstros32_b.py` | monstros e chefes dos atos IV–VI, com variantes e retratos |
| `abismo32.py` | corredor e arena dos 6 atos, objetos, efeitos de combate e molduras |
| `interface32.py` | ícones de equipamento e de rank; moeda, baú e flecha (estes também em 16-bit) |
| `dimensoes32.py` | os quatro biomas das dimensões fundas (M5 F6) **em 16 e 32-bit**: monstros e Senhores com variantes e retratos, corredor VII a X, objetos, efeitos e o índice `src/render/pack-dimensoes.ts` (`--dry` só gera prévias) |
| `historias32.py` | as peças do M6 (Histórias sem fim) **em 16 e 32-bit**: mesa de audiências, balão de desejo e flores da lápide nova (F1), e o índice `src/render/pack-historias.ts` (`--dry` só gera prévias) |
| `prologo32.py` | as peças do prólogo animado **em 16 e 32-bit**: a abadia da Ordem da Candeia (com o overlay `-lights`) e a mesma abadia em ruína, o penhasco que se repete de lado e a borda quebrada, o olho do abismo (4 quadros), o monge com a vela (2 quadros) e a lua, e o índice `src/render/pack-prologo.ts` (usa o `Piece` e os traços de `historias32.py`; `--dry` só gera prévias) |

```bash
python3 -I art32/vila32.py [pasta-de-prévias]
```

Precisa de Pillow. `predios32.py`, `herois32.py` e os de monstros leem a peça 16-bit para
conferir o enquadramento; `herois32.py` usa as peças em `pack16/`. Depois de gerar,
`npm run pack32` atualiza o índice `src/render/pack32.ts` que o jogo usa para saber o que
já tem versão 32-bit.
