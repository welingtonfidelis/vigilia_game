# Vigília

Jogo de gestão em que você é o prefeito de uma vila à beira de um abismo e os heróis agem sozinhos. Design completo em [GDD.md](GDD.md).

**Estado atual: M2, Fase A, a primeira fatia da Fase B (cidadãos e incursões), o M3 fechado (salários, decretos, eventos sazonais e expansão sul) e o visualizador de dungeon do M4 e o pack de arte Vigília 1.7 no cenário, prédios, moradores, heróis e retratos.** A vila roda no navegador (Phaser + Preact) por cima do núcleo de simulação headless. Dá para jogar do Ato I ao Coração do Abismo, com heróis que se ferem, casam, têm filhos, se aposentam com uma função e ganham epitáfio; moradores nomeados que trabalham, pagam imposto pelo humor e podem morrer; e incursões que descem do abismo quando a corrupção sobe.

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
npm test                                        # 82 testes (núcleo, pessoas, economia, sessão, save, planta e tiles da vila, sprites, textos, som)
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
  town.ts, ground.ts  vila no tileset do pack Vigília 1.7 (autotile de terra/trilha, abismo, marcos e casas); o chão é assado numa textura única para não vazar tile em zoom fracionário
  buildings.ts   os 7 prédios como carimbos de tiles: ruína e níveis 1–3, janelas que acendem
  sprites.ts     moradores, prefeito, crianças, heróis, retratos e monstros do pack 1.7; o 0x72 fica só para ecos de herói
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
  people.ts      lesões e cicatrizes, casamentos e filhos, aposentados com função, velhice e epitáfios
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

A câmera é fixa em 1,5× e acompanha o prefeito; não há zoom por roda ou pinça.

**Atalhos de depuração** (só em `npm run dev`, no console do navegador): `vigilia.days(n)` avança n dias, `vigilia.advance(ticks)`, `vigilia.autoplay(n)` deixa o prefeito automático jogar n dias e `vigilia.frames(n)` roda quadros do Phaser na mão (útil com a aba em segundo plano, quando o navegador para o `requestAnimationFrame`).

## Retrato do balanceamento (10 sementes × 30 anos, prefeito automático)

| Chefe | Ano médio | Horas em 1× | Faixa | Sementes que chegaram |
|---|---|---|---|---|
| Catacumbas | 1,1 | 0,6 h | 0,3–1,8 | 100% |
| Minas Inundadas | 3,2 | 1,7 h | 1,1–5,0 | 100% |
| Jardim de Fungos | 4,3 | 2,3 h | 2,6–6,3 | 100% |
| Cidade Afogada | 7,4 | 4,0 h | 4,0–11,0 | 100% |
| Forja Abissal | 16,4 | 8,7 h | 10,8–24,3 | 100% |
| Coração do Abismo | 20,4 | 10,9 h | 14,8–25,1 | 70% |

- **Mortalidade:** 4,2 mortes/ano com elenco de ~18. Ninguém é mais dispensado: são cerca de 16 aposentadorias por campanha, cada uma com uma função na vila.
- **Pessoas, por campanha:** ~71 lesões, ~6 cicatrizes, ~17 casamentos, ~16 filhos e ~6 deles chegando à maioridade como heróis.
- **Vila (M3), por campanha:** ~33 incursões, ~34 moradores mortos e ~0,3 que deixa a vila; a população termina no teto (~136, abstrata) com **8 aldeões visíveis**, o humor médio fica em ~59 e os prédios em ruína no fim são raros porque o prefeito automático reconstrói.
- **Expedições:** ~89 por ano, 0 impasses de combate, no máximo 2 dias seguidos sem expedição e **5% de retiradas**. A confiança ao descer separa o risco: ≥0,5 → 0,37 morte por expedição; ≥1,0 → 0,07; ≥1,5 → 0,01.
- **Ouro:** o tesouro fica entre ~0,8 e 4,6 mil e o ouro dos heróis entre ~13 e 52 mil. **Festa**, **pensão**, **salários dos guardas**, **decretos**, **ofertas no templo** e **incursões** puxam ouro para fora; ainda faltam sumidouros de fim (relíquias e propriedades).
- **Desempenho:** ~0,7 s para simular uma campanha de 30 anos.

## O que o M0 entrega

- [x] Heróis com classe, rank E–S, nível, 12 traços (1 oculto), ânimo, lealdade, necessidades, luto, vínculos, idade, aposentadoria e feitos que promovem o rank
- [x] IA de utilidade na vila e formação autônoma de grupos (com veteranos que "adotam" novatos)
- [x] 6 atos × 4 andares, 18 inimigos, 5 afixos de elite, 6 chefes com mecânicas (invocar, couraça, veneno, maldição, retaguarda, ecos dos seus mortos)
- [x] Combate em tempo real com regra anti-impasse (o soft-lock da curandeira do jam não existe aqui)
- [x] Fuga individual por ânimo, retirada por doutrina, sino de retirada, heróis vingativos que se recusam a recuar
- [x] Mapa persistente até conquistar, restos de heróis caídos recuperáveis, resgates, santuários, baús
- [x] Corrupção por ato que sobe com o tempo e re-infesta salas; os heróis priorizam conter o pior ato
- [x] Economia de duas carteiras (heróis × tesouro), 7 prédios com 3 níveis e materiais por bioma
- [x] Crônica da Vila em português, save/load versionado e balanceador headless

## Inspiração e créditos

Vigília é um projeto original inspirado na **proposta** de [**Tristram**](https://bippinbits.itch.io/tristram), jogo criado em 72 horas na Ludum Dare 55 (2024) por René Habermann (Bippinbits), Raffaele Picca, Luca Martinelli, Anne Hecker, Cameron Paxton e equipe. A ideia central vem de lá: ser o prefeito de uma vila que convoca heróis autônomos para uma masmorra e reconstrói a cidade com o que eles trazem. O crédito pelo conceito é deles.

- **Nada do Tristram foi reutilizado:** nenhum código, arte, música, texto, nome ou dado. Regras, números, classes, inimigos, chefes, nomes e textos deste repositório foram escritos do zero.
- O estudo do jogo original (mecânicas observadas, pontos fortes, limitações e pedidos dos jogadores) está na seção 1 do [GDD.md](GDD.md).
- A Bippinbits está desenvolvendo a versão completa oficial do Tristram. Este projeto não tem relação com ela nem com a Bippinbits.
- "Tristram" e "Diablo" são marcas da Blizzard Entertainment. Vigília não usa elementos desse universo e não é afiliado à Blizzard.

### Arte de terceiros (CC0)

As duas licenças são CC0 (domínio público), com uso livre inclusive comercial. Creditamos por gentileza:

- **Vigília Art Pack 1.7** (Equipe Vigília, CC0 1.0): terreno, 7 prédios × 3 níveis + ruína, casas, portão/berrante, termas, props, FX, moradores, prefeito, crianças, heróis, retratos, 18 inimigos + 6 chefes, outono, lamparinas, bancos e carroças. Fica em `public/assets/vigilia/`, com `licenses/LICENSE.md` e o gerador no pacote original.
- **[Tiny Town](https://kenney.nl/assets/tiny-town)**, de Kenney (kenney.nl): legado da vila/prédios antigos; permanece em `public/assets/kenney-tiny-town/` com o `License.txt` original.
- **[16x16 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii)**, de Robert (0x72): fallback dos ecos de herói no painel da masmorra; fica em `public/assets/0x72-dungeontileset-ii/`, com o `LICENSE.txt` e a origem do arquivo.

## O que o M1 entrega

- [x] Vila em Phaser: 7 lotes (ruína × níveis 1–3), berrante, quadro de contratos, cofre com a pilha de ouro, fogueira, **fonte termal**, cemitério com uma cova por herói caído, abismo com a abadia em ruínas e brilho que cresce com a corrupção, dia e noite
- [x] Heróis andando até o lugar da atividade escolhida pelo núcleo (estalagem, taverna, templo, ferreiro, campo, quadro, túmulo do amigo, conversa com outro herói), entrando no abismo e voltando por ele
- [x] Prefeito com WASD, clique/toque para andar e interação por proximidade (E ou o botão na tela)
- [x] Painel do abismo: atos e andares, corrupção, grupos com a sala atual (névoa sala a sala), vida e ânimo com a marca do limiar de fuga, inimigos do combate, momentos e o sino de retirada; resumo das expedições recentes
- [x] HUD (tesouro, data e hora, população, heróis/vagas, materiais, velocidade), objetivos abertos, avisos da crônica e fim de ato
- [x] Ficha do herói (atributos, traços revelados e "?", vínculos, luto, feitos, patrocinar, dispensar), elenco, cemitério, cofre (imposto, gráfico do tesouro), crônica navegável por ano e filtro
- [x] Save no `localStorage` (automático por dia e manual), preferências da tela e layout de celular
- [x] Pixel art CC0: pack Vigília 1.7 no cenário/prédios/moradores, heróis e retratos do pack 1.4, câmera fixa que acompanha o prefeito e cena dessaturada para a fantasia sombria
- [x] Som sintetizado: efeitos ligados à crônica e aos comandos, trilha que muda com o clima, ambiente vivo, volume por canal e mudo

## O que o M2 entrega

Especificação na seção 9.1 do [GDD.md](GDD.md).

- [x] **Prefeito com energia diária (4):** conversar, presentear (bebida, relíquia ou arma), consolar quem está de luto, discursar na praça, renomear e aposentar com honras
- [x] **Lesões** (braço, perna, olho, costelas) para quem sai de um combate por um fio. O grupo volta carregando o ferido, que se trata por dias. Algumas viram **cicatrizes** permanentes; com 2 delas o herói fica *Marcado*. A **Casa de cura** (7º prédio) acelera a recuperação e evita cicatrizes
- [x] **Casamentos** entre heróis muito ligados, **filhos** que crescem na vila e viram heróis aos 16 anos com traço, classe e arma herdados; a morte de um cônjuge pesa no outro
- [x] **Aposentados com função** (mentor, ferreiro, contador de histórias, curandeiro) que ficam na vila e melhoram o prédio onde trabalham, e que podem morrer de velhice
- [x] **Epitáfios** gerados a partir da vida de cada herói (feito, como caiu, traço, quem fica)
- [x] Save v1 → v2 migra sozinho (heróis mortos antes do M2 ganham epitáfio)
- [x] Sons novos: lesão, casamento, nascimento, discurso e ações do prefeito
- [x] **Interface:**
  - velas de energia do prefeito no HUD;
  - na ficha do herói, conversar, presentear, consolar, renomear e aposentar com função (a sugerida vem marcada);
  - lesão com barra de recuperação e bandagem no mapa;
  - família e crianças brincando na praça; aposentados no posto de trabalho;
  - epitáfio ao clicar na lápide;
  - discurso na fogueira da praça.

## O que a Fase A entrega (polimento pós-M2)

- [x] **Rótulos do mapa com prioridade:** nomes de heróis não se empilham; em multidão só o nome sob o ponteiro/selecionado aparece (a medalha de rank fica); as placas de prédios vizinhos descem uma linha em vez de encostar uma na outra.
- [x] **Celular:** HUD compacto, objetivos recolhidos por padrão, avisos acima do botão de interação e prompt acima da barra de navegação.
- [x] **Tensão calibrada:** o grupo se acha mais capaz do que é (`confidenceBias`), o que leva as mortes de 2,8 para 4,2 por ano, aumenta retiradas e lesões e faz a confiança ao descer prever o risco de verdade. Massacres continuam raros por desenho (fuga individual + retirada), o que é proposital.
- [x] **Fim de campanha:** painel com anos de vila, chefes, expedições, ouro saqueado, população e os epitáfios de quem não voltou; dá para continuar jogando. O menu reabre o resumo.
- [x] **Sumidouros de ouro:** festa na praça (no Cofre), pensão diária dos aposentados e ofertas que os heróis ricos deixam no templo.
- [x] **Save v2 → v3** migra sozinho (data da última festa).

## Ajustes antes do M3

- [x] **Arma de classe fora do mapa.** O desenho ao lado do herói era um enfeite fixo da classe, não o equipamento comprado — e ficava enorme. O herói anda sem arma na mão; a ficha mostra a arma de classe, o tier comprado e o bônus exato de ataque, vida e defesa (o tier sempre entrou no combate).
- [x] **Fonte termal.** Bacia de pedra no lugar do antigo portão sul, com vapor e água quente que sobe do abismo. Não tem nível nem preço: heróis machucados, sem ânimo ou de luto vão sozinhos, e a água recupera 20% da vida, 12 de energia, 12 de ânimo, alivia o luto e adianta meio dia de lesão. O painel mostra quem está na água.

## O que a Fase B entrega (primeira fatia: vila viva)

- [x] **Cidadãos nomeados.** A vila começa com 6 moradores e chega a 8 nomes (um a cada 4 de população, até 8), com ofícios que saem dos prédios reconstruídos: guarda, copeiro, ferreiro, acólito, pedreiro e lavrador. Eles andam pela vila (trabalho de dia, praça no meio do dia, estalagem ou fogueira à noite), aparecem no mapa sem rótulo e abrem o painel da Vila quando clicados. **Lavradores**, que não têm prédio próprio, circulam entre a praça, as estradas e a fonte; o campo de treino fica para os heróis.
- [x] **Humor e imposto.** O humor médio (0–100) puxa o imposto dos moradores e decide quem fica: abaixo de 30, o morador pode deixar a vila. Festa na praça e pouca corrupção levantam o humor; incursões derrubam.
- [x] **Incursões noturnas.** Às 22h, o ato mais corrompido (≥55) pode subir à vila. A defesa soma heróis em casa, aposentados e guardas; o resultado é **repelida**, **segurada com custo** ou **saqueada**. No pior caso, prédios voltam a ruínas, moradores morrem, heróis se ferem e o tesouro sangra — a campanha nunca acaba. Aviso na crônica, no toast, no mapa (vultos saindo do abismo) e na navegação.
- [x] **Painel da Vila** com população, humor, guardas, ameaça, ofícios, a lista de moradores com a barra de humor e as últimas incursões.
- [x] **Sprites de morador:** quatro ofícios — lavrador, artesã, acólito e guarda — em dois gêneros, agora com a arte do pack 1.4 de frente; heróis e moradores não dividem o mesmo corpo.
- [x] **Casinhas e noite:** cinco casas na borda sul, com caminhos de terra. À noite a maioria entra em casa e some; os guardas ficam no portão e copeiros/alguns noctívagos, na taverna.
- [x] **Entrada e câmera:** portão de madeira com o berrante grande montado sobre a viga, no centro-esquerdo. A câmera fixa em 1,5× acompanha o prefeito; o zoom por roda/pinça saiu.
- [x] **Save v3 → v4** migra sozinho (moradores, crescimento, incursões).

## M3: vila viva (concluído)

- [x] **Salários dos guardas.** A milícia recebe por dia e o Cofre mostra o custo separado; a defesa noturna continua somando guardas, heróis em casa e aposentados.
- [x] **Três decretos com trade-off:** taxa de guerra (+25% de imposto, −humor), toque de recolher (+20% de defesa, −humor) e funeral com honras (custa ouro, alivia luto e melhora o humor). No máximo dois ficam ativos.
- [x] **Cofre atualizado** com impostos, manutenção, pensões, salários, decretos e saldo diário.
- [x] **Save v4 → v5** migra sozinho (lista de decretos).
- [x] **Eventos sazonais:** primavera traz a caravana; verão alterna peste e eclipse; outono tem o festival da colheita; inverno alterna cobrador do rei e visita lendária. Cada um pausa o jogo e oferece escolhas com custo.
- [x] **Save v5 → v6** migra sozinho (evento pendente e chave do último evento).
- [x] **Expansão sul:** limpar a floresta abre três lotes de moradia; o jogador escolhe em qual lote construir. Cada casa aumenta a capacidade populacional em 6 e as vagas de herói em 1.
- [x] **Save v6 → v7** migra sozinho (distrito sul e casas).

## M4 — Profundidade (primeira fatia)

- [x] **Visualizador de dungeon:** o painel do Abismo ganhou o botão **Acompanhar**. A tela mostra heróis e monstros na sala, vida, dano flutuante, ouro saqueado, sala/andar, momentos e abas para trocar de grupo. O combate continua automático: o jogador só assiste.
- [ ] Itens nomeados e afixos.
- [ ] Fabricação no ferreiro.
- [ ] Especializações de nível 3 dos prédios.
- [ ] Mais variações de chefe e sala.

## Próximo: M4

Itens nomeados, fabricação e especializações. Mudança de local dos prédios ficou de fora. Ver a seção 9 do [GDD.md](GDD.md).
