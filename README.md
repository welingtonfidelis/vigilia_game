# Vigília

Jogo de gestão em que você é o prefeito de uma vila à beira de um abismo e os heróis agem sozinhos. Design completo em [GDD.md](GDD.md).

**Estado atual: M1, a fatia vertical jogável.** A vila roda no navegador (Phaser + Preact) por cima do núcleo de simulação headless do M0. Dá para jogar o Ato I do zero até o Guardião das Urnas.

## Jogar

```bash
npm install
npm run dev                                     # abre em http://localhost:5173
npm run dev -- --host                           # idem, acessível pelo celular na mesma rede
```

- **Prefeito:** WASD/setas ou clique (toque) no chão para andar. Clique num prédio, no berrante, no quadro, no cofre, no abismo ou no cemitério: o prefeito vai até lá e interage. Perto de algo, **E** interage.
- **Heróis:** clique num herói para ver a ficha (vida, ânimo com a marca de fuga, traços revelados e ocultos, vínculos, feitos). Eles não obedecem: escolhem o que fazer e com quem descer.
- **Tempo:** Espaço pausa · 1, 2, 3 = 1×, 2×, 4× · **M** abismo · **H** heróis · **C** crônica · **Esc** fecha.
- **Som:** liga no primeiro clique (regra dos navegadores). **N** ou o alto-falante no topo silencia; Menu → Som ajusta geral, música, ambiente e efeitos.
- **Save:** salva sozinho no `localStorage` a cada dia do jogo e ao sair da página. Menu → Salvar/Carregar/Novo jogo.
- **Celular:** toque para andar e interagir; os painéis viram folhas acima da barra de navegação; Menu → A−/A+ ajusta o tamanho da interface.

## Rodar as ferramentas

```bash
npm test                                        # 59 testes (núcleo, sessão, save, planta e tiles da vila, sprites, textos, som)
npm run build                                   # typecheck + bundle de produção em dist/
npm run chronicle -- --seed 4 --years 3         # Crônica da Vila de uma campanha jogada pelo prefeito automático
npm run balance -- --seeds 10 --years 30        # Ritmo, mortalidade, economia e saúde em várias sementes
npm run deaths -- --seeds 6 --years 5           # Diagnóstico de quem morre, onde e para quem
npm run typecheck
```

Node 22+ roda os `.ts` direto (type stripping). Não há passo de build para as ferramentas.

## Arquitetura

```
index.html, src/main.tsx   monta a sessão, o HUD/painéis (Preact) e o Phaser; atalhos, autosave e avisos
src/game/   ponte entre tela e núcleo, sem Phaser nem DOM (testável no Node)
  session.ts     acumulador de tick fixo (10 ticks/s em 1×, 2×, 4×, pausa), comandos, eventos e resumo das expedições
  storage.ts     salvar/carregar no localStorage com try/catch e preferências da tela
src/render/ Phaser: só lê o World a cada quadro
  VillageScene.ts  cena da vila: prédios por nível, heróis indo aos lugares da atividade, prefeito, dia/noite, túmulos
  layout.ts      planta da vila e destino de cada herói por atividade (puro, testado)
  town.ts, ground.ts  vila em tiles do Tiny Town (autotile de terra, florestas, abismo, cemitério, marcos)
  buildings.ts   os 6 prédios como carimbos de tiles: ruína e níveis 1–3, janelas que acendem
  sprites.ts     heróis e prefeito do 0x72 (parado/correndo), assets.ts e atlas0x72.ts mapeiam classes e monstros
  art.ts         o pouco que os pacotes não têm (lápide, fogueira, berrante, ícones), pixel a pixel
src/ui/     Preact: HUD, objetivos, avisos e painéis (herói, abismo, crônica, prédios, berrante, quadro, cofre, elenco, cemitério, menu)
src/audio/  som 100% sintetizado (Web Audio, sem arquivos)
  director.ts    eventos → efeitos (prioridade e intervalo mínimo) e clima do mundo → música (puro, testado)
  sfx.ts         26 efeitos: berrante, moedas, martelo, sino fúnebre, fanfarra do chefe, eco dos mortos…
  music.ts       trilha generativa em Ré menor: dia, noite, luto, tensão (chefe) e alvorada (fim)
  ambience.ts    vento, grilos, pássaros, fogueira, metal distante do combate e o zumbido do abismo (cresce com a corrupção)
  engine.ts      mesa com canais de música, ambiente e efeitos, reverb e compressor
src/data/   classes, traços, atos/inimigos/chefes, prédios, nomes (dados puros)
src/sim/    regras: tudo determinístico, estado 100% JSON
  world.ts       cria o mundo
  loop.ts        step(): 1 tick = 0,1 s em 1× · hora = 20 ticks · dia = 480 ticks · ano = 40 dias (~32 min)
  town.ts        necessidades e IA de utilidade (descansar, beber, rezar, comprar, treinar, túmulo, socializar, quadro)
  party.ts       formação autônoma de grupos e escolha do andar (confiança × doutrina × traços × corrupção)
  expedition.ts  descida, salas, saque, conquista, retorno, luto, contratos
  combat.ts      combate em tempo real: papéis, ânimo, fuga, retirada, vingança, mecânicas de chefe
  dungeon.ts     andares (mapa persistente até conquistar), inimigos, afixos, corrupção, estimativa de força
  economy.ts     tesouro, preços, efeitos dos prédios, população e impostos
  commands.ts    alavancas do prefeito (berrante, construir, contrato, sino, doutrina, imposto, patrocínio, dispensar)
  chronicle.ts   Crônica da Vila (eventos com texto em pt-BR)
  save.ts        serialize/deserialize/checksum
  bot.ts         prefeito automático (o "jogador médio" do balanceador)
tools/      balanceador, crônica, diagnóstico de mortes
tests/      vitest
```

O RNG (mulberry32) vive dentro do `World`. Por isso salvar no meio de um combate e carregar continua **exatamente** a mesma partida, e há um teste que garante isso.

A tela fala com o núcleo só por `src/sim/index.ts`: `step()` no acumulador da sessão, `commands.*` para as alavancas do prefeito e consultas somente-leitura (custos, vagas, limiar de fuga, salas do andar). Um teste confirma que jogar pela sessão, quadro a quadro, dá o mesmo mundo que rodar o núcleo direto.

**Atalhos de depuração** (só em `npm run dev`, no console do navegador): `vigilia.days(n)` avança n dias, `vigilia.advance(ticks)`, `vigilia.autoplay(n)` deixa o prefeito automático jogar n dias e `vigilia.frames(n)` roda quadros do Phaser na mão (útil com a aba em segundo plano, quando o navegador para o `requestAnimationFrame`).

## Retrato do balanceamento (10 sementes × 30 anos, prefeito automático)

| Chefe | Ano médio | Horas em 1× | Faixa | Sementes que chegaram |
|---|---|---|---|---|
| Catacumbas | 1,1 | 0,6 h | 0,8–1,5 | 100% |
| Minas Inundadas | 3,4 | 1,8 h | 1,7–5,3 | 100% |
| Jardim de Fungos | 5,4 | 2,9 h | 2,6–7,5 | 100% |
| Cidade Afogada | 11,0 | 5,9 h | 6,4–19,4 | 100% |
| Forja Abissal | 18,5 | 9,9 h | 12,3–27,3 | 100% |
| Coração do Abismo | 20,4 | 10,9 h | 17,0–29,2 | 50% |

- **Mortalidade:** 3,4 mortes/ano com elenco de ~18; carreira típica de 4–6 anos de jogo.
- **Expedições:** ~97 por ano, com zero impasses de combate e no máximo 1 dia seguido sem expedição.
- **Ouro:** o tesouro sobe até ~15–17 mil no meio do jogo e volta a cair com patrocínios e contratos. O ouro dos heróis acumula no fim (economizando para os tiers 11–12). Faltam sumidouros de fim de jogo, que entram no M3 (decretos, defesa, festivais).
- **Desempenho:** ~0,5 s para simular uma campanha de 30 anos.

## O que o M0 entrega

- [x] Heróis com classe, rank E–S, nível, 12 traços (1 oculto), ânimo, lealdade, necessidades, luto, vínculos, idade, aposentadoria e feitos que promovem o rank
- [x] IA de utilidade na vila e formação autônoma de grupos (com veteranos que "adotam" novatos)
- [x] 6 atos × 4 andares, 18 inimigos, 5 afixos de elite, 6 chefes com mecânicas (invocar, couraça, veneno, maldição, retaguarda, ecos dos seus mortos)
- [x] Combate em tempo real com regra anti-impasse (o soft-lock da curandeira do jam não existe aqui)
- [x] Fuga individual por ânimo, retirada por doutrina, sino de retirada, heróis vingativos que se recusam a recuar
- [x] Mapa persistente até conquistar, restos de heróis caídos recuperáveis, resgates, santuários, baús
- [x] Corrupção por ato que sobe com o tempo e re-infesta salas; os heróis priorizam conter o pior ato
- [x] Economia de duas carteiras (heróis × tesouro), 6 prédios com 3 níveis e materiais por bioma
- [x] Crônica da Vila em português, save/load versionado e balanceador headless

## Inspiração e créditos

Vigília é um projeto original inspirado na **proposta** de [**Tristram**](https://bippinbits.itch.io/tristram), jogo criado em 72 horas na Ludum Dare 55 (2024) por René Habermann (Bippinbits), Raffaele Picca, Luca Martinelli, Anne Hecker, Cameron Paxton e equipe. A ideia central vem de lá: ser o prefeito de uma vila que convoca heróis autônomos para uma masmorra e reconstrói a cidade com o que eles trazem. O crédito pelo conceito é deles.

- **Nada do Tristram foi reutilizado:** nenhum código, arte, música, texto, nome ou dado. Regras, números, classes, inimigos, chefes, nomes e textos deste repositório foram escritos do zero.
- O estudo do jogo original (mecânicas observadas, pontos fortes, limitações e pedidos dos jogadores) está na seção 1 do [GDD.md](GDD.md).
- A Bippinbits está desenvolvendo a versão completa oficial do Tristram. Este projeto não tem relação com ela nem com a Bippinbits.
- "Tristram" e "Diablo" são marcas da Blizzard Entertainment. Vigília não usa elementos desse universo e não é afiliado à Blizzard.

### Arte de terceiros (CC0)

As duas licenças são CC0 (domínio público), com uso livre inclusive comercial. Creditamos por gentileza:

- **[Tiny Town](https://kenney.nl/assets/tiny-town)**, de Kenney (kenney.nl): vila, prédios, árvores e caminhos. Fica em `public/assets/kenney-tiny-town/`, com o `License.txt` original.
- **[16x16 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii)**, de Robert (0x72): heróis, monstros e masmorra. Fica em `public/assets/0x72-dungeontileset-ii/`, com o `LICENSE.txt` e a origem do arquivo.

## O que o M1 entrega

- [x] Vila em Phaser: 6 lotes (ruína × níveis 1–3), berrante, quadro de contratos, cofre com a pilha de ouro, fogueira, cemitério com uma cova por herói caído, abismo com a abadia em ruínas e brilho que cresce com a corrupção, dia e noite
- [x] Heróis andando até o lugar da atividade escolhida pelo núcleo (estalagem, taverna, templo, ferreiro, campo, quadro, túmulo do amigo, conversa com outro herói), entrando no abismo e voltando por ele
- [x] Prefeito com WASD, clique/toque para andar e interação por proximidade (E ou o botão na tela)
- [x] Painel do abismo: atos e andares, corrupção, grupos com a sala atual (névoa sala a sala), vida e ânimo com a marca do limiar de fuga, inimigos do combate, momentos e o sino de retirada; resumo das expedições recentes
- [x] HUD (tesouro, data e hora, população, heróis/vagas, materiais, velocidade), objetivos abertos, avisos da crônica e fim de ato
- [x] Ficha do herói (atributos, traços revelados e "?", vínculos, luto, feitos, patrocinar, dispensar), elenco, cemitério, cofre (imposto, gráfico do tesouro), crônica navegável por ano e filtro
- [x] Save no `localStorage` (automático por dia e manual), preferências da tela e layout de celular
- [x] Pixel art CC0 (Tiny Town + DungeonTileset II): zoom em passos de pixel inteiro, cena dessaturada e escurecida para a fantasia sombria
- [x] Som sintetizado: efeitos ligados à crônica e aos comandos, trilha que muda com o clima, ambiente vivo, volume por canal e mudo

## Próximo: M2 (pessoas)

Conversas, presentes e discursos do prefeito (energia diária), lesões, memorial com epitáfio, filhos e aposentados com função. Ver a seção 9 do [GDD.md](GDD.md).
