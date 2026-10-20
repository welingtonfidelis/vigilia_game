# Pedido — personagens em perfil/3-4

**Pacote:** `vigilia-art-v01` (0.7.0-draft)
**Decisão do projeto:** os personagens atuais estão de frente; o motor move em 8 direções e **só espelha no eixo X**. Precisamos de um passe de **perfil/3-4 voltado para a direita**.
**Armas:** o projeto **aceitou** as armas de classe nesta versão. Elas devem continuar existindo no passe de perfil.

Este arquivo é o briefing que pode ser enviado direto para quem for refazer os personagens. O resto do pacote permanece como está.

## Regras que não mudam

- Tamanhos e canvas **iguais aos atuais**:
  - herói: **16×28**; folha 144×28 (9 quadros);
  - morador: **16×21**; folha 32×21 (2 quadros);
  - prefeito: **16×23**; folha 128×23 (8 quadros).
- Pivô **0.5, 1** (pés na base), sem deslocamento entre quadros.
- Mesmos nomes de arquivo, IDs e JSON; os `frameTags` continuam `idle`, `run` e `hit` (heróis).
- Mesma paleta, contorno de 1 px, sombreamento em 2–3 tons; sem anti-alias; sem texto; sem sombra projetada; sem glow assado.
- **Perfil/3-4 para a direita**. O motor espelha para a esquerda; **não desenhar uma segunda direção**.
- Não aumentar o canvas. Arma e escudo precisam caber nos 16 px de largura; se houver conflito, avise antes de entregar.
- O pack atual será substituído; não é um pack adicional.

## Quadros e animações

| Personagem | Folha | Idle | Run | Hit |
|---|---|---|---|---|
| Herói (6 classes × 2 gêneros) | 144×28 | 0–3, 6 fps | 4–7, 10 fps | 8, 1 fps |
| Morador (4 ofícios × 2 gêneros) | 32×21 | 0–1, 3 fps | 0–1, 8 fps | — |
| Prefeito / prefeita | 128×23 | 0–3, 6 fps | 4–7, 10 fps | — |

## Armas aceitas

| Classe | Arma |
|---|---|
| `guardiao` | espada + escudo |
| `selvagem` | machado |
| `lanceiro` | lança |
| `arqueiro` | arco |
| `clerigo` | cajado/martelo |
| `piromante` | cajado |

As armas devem parecer **carregadas** (na mão direita, costas ou cinto), não flutuando. No idle ficam em descanso; no run acompanham o corpo com um balanço discreto; no hit recuam com o personagem. A silhueta da arma não pode cortar a cabeça, os pés ou o quadro.

## Prompt para enviar

```text
Refaça os personagens do pacote vigilia-art-v01 em perfil/3-4 voltado para a
direita, mantendo o restante do estilo, tamanhos e nomes.

Contexto: o jogo move os personagens em 8 direções, mas só espelha no eixo X.
Os sprites atuais são de frente e parecem deslizar quando andam.

Regras:
- Perfil/3-4 para a direita; a esquerda é o flip do motor. Não criar 4 direções.
- Heróis 16×28 (144×28, 9 quadros): idle 0–3 (6 fps), run 4–7 (10 fps), hit 8.
- Moradores 16×21 (32×21, 2 quadros): idle/walk 0–1.
- Prefeito 16×23 (128×23, 8 quadros): idle 0–3, run 4–7.
- Pivô 0.5,1 nos pés; sem deslocamento entre quadros.
- MANTER as armas de classe (foram aceitas): espada+escudo, machado, lança,
  arco, cajado/martelo, cajado. Carregadas na mão/costas; dentro do quadro.
- Mesma paleta, contorno de 1 px, sombreamento em 2–3 tons; sem anti-alias,
  sem texto, sem sombra, sem glow.
- Idle: respiração sutil; run: passo legível; hit: recuo.
- Entregar PNG 1x + JSON + contact sheet. Incluir uma imagem espelhada para
  mostrar o lado esquerdo.
- Aprovar primeiro 1 herói + 1 morador + o prefeito; depois o lote.

Aceite: pés no pivô; arma não corta; o passo lê em 1,5×; o flip vira para a
esquerda; nenhum texto/sombra; JSON e tamanhos inalterados.
```

## Entrega

- Substituir os arquivos existentes em `export/png/char-*.png` e os `.json` correspondentes.
- Atualizar `preview/` com uma folha de contato nova, incluindo o **lado espelhado**.
- Atualizar `CHANGELOG.md` para `0.8.0-draft` (ou a versão seguinte).
- Não alterar os nomes/IDs do manifesto.

## Critérios de aceite

- [ ] Perfil/3-4 para a direita; o flip produz um personagem olhando para a esquerda.
- [ ] Armas de classe visíveis, carregadas e contidas no quadro.
- [ ] Tamanhos, pivôs, frames e JSON idênticos aos atuais.
- [ ] Sem texto, sombra projetada, glow assado ou anti-alias.
- [ ] Passo legível a 1,5×; sem “deslizar” para cima/baixo.
- [ ] Folha de contato com idle, run, hit e o espelhado.
