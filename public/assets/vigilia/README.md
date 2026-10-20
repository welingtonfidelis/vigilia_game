# Pack de arte Vigília

**Status:** esqueleto de handoff (2026-10-20). Nenhuma imagem deste pack foi criada ainda.

- `manifest.json` — contrato dos assets (IDs, tamanhos, âncoras, estados, status e licença).
- `palette/vigilia.gpl` — paleta inicial de trabalho.
- `export/` — destino dos PNGs/JSON finais (ainda não existe).
- `source/` — Aseprite/PSD (fica fora de `public`, em `art/source` ou no zip de entrega).

O guia completo está em [`docs/art/ART-BRIEF.md`](../../../docs/art/ART-BRIEF.md), a lista de necessidades em [`docs/art/ASSET-LIST.md`](../../../docs/art/ASSET-LIST.md) e o histórico em [`docs/art/CHANGELOG.md`](../../../docs/art/CHANGELOG.md).

## Regras rápidas

- PNG-32, transparente, sRGB, 1×; o motor amplia 2×.
- 16 px por tile; pivô embaixo-centro para personagens/prédios/props; canto superior esquerdo para tiles.
- Sem texto, sem sombra projetada, sem glow assado.
- Nomes kebab-case; IDs com os nomes do jogo em português.
- Não sobrescrever Tiny Town nem 0x72; este pack é adicional.
