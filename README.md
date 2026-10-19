# Vigília

Jogo de gestão em que você é o prefeito de uma vila à beira de um abismo e os heróis agem sozinhos. Design completo em [GDD.md](GDD.md).

**Estado atual: M0, o núcleo de simulação headless.** Ainda não há tela; tudo roda no terminal.

## Rodar

```bash
npm install
npm test                                        # 19 testes (determinismo, save, soft-locks, comandos)
npm run chronicle -- --seed 4 --years 3         # Crônica da Vila de uma campanha jogada pelo prefeito automático
npm run balance -- --seeds 10 --years 30        # Ritmo, mortalidade, economia e saúde em várias sementes
npm run deaths -- --seeds 6 --years 5           # Diagnóstico de quem morre, onde e para quem
npm run typecheck
```

Node 22+ roda os `.ts` direto (type stripping). Não há passo de build para as ferramentas.

## Arquitetura

```
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

## Próximo: M1 (fatia vertical jogável)

Cena da vila e da masmorra (Phaser), HUD, painéis de herói e prefeito andando. O núcleo já expõe tudo o que a tela precisa ler.
