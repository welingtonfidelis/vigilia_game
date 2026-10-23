// Códex do Salão das Lendas (M6 F5): os textos de cada entrada, que se abrem aos poucos.
// Escritos como quem anota o que ouviu dos sobreviventes. Os números ficam nos dados e na
// simulação; aqui o texto só conta, com outras palavras, o que o jogo já faz.

import type { DimRuleId, MysteryId } from '../sim/types.ts';

/** Monstro: o hábito aparece com 10 abates; a história, com 50. */
export interface MonsterLore {
  /** Uma frase: como ele luta ou se comporta (combine com as tags e os números dele). */
  habit: string;
  /** Duas ou três frases: de onde veio, o que foi, o que dizem dele. */
  story: string;
}

/** Senhor: o que se conta dele (visto), como ele luta (vencido) e o segredo (vencido sem baixas). */
export interface LordLore {
  seen: string;
  defeated: string;
  flawless: string;
}

/** Os mistérios do códex (a lista mora em src/sim/types.ts, junto do save). */
export type { MysteryId };

export interface MysteryLore {
  id: MysteryId;
  name: string;
  text: string;
}

/** Um texto por bioma, na ordem de BIOMES. */
export const BIOME_LORE: string[] = [
  // Catacumbas
  'São catacumbas iguais às da velha abadia, com os mesmos nichos e as mesmas urnas, mas sem fim. Ninguém sabe se o abismo as engoliu ou se as copiou de outro mundo. Os ossos que os heróis trazem de lá ainda têm nomes riscados, numa letra que ninguém lê.',
  // Minas Inundadas
  'Galerias de uma mina cavada atrás de um veio de ferro-negro que nunca acabava. A Companhia do Veio Fundo cavou até furar alguma coisa, e a água subiu numa noite só. O minério continua lá, debaixo da água escura, e ainda vale o risco.',
  // Jardim de Fungos
  'Um jardim que cresceu no escuro, sem sol e sem jardineiro, por cima de tudo o que caiu lá dentro. Os fungos comem pedra, osso e lembrança, e soltam os esporos que a vila usa nos unguentos. O ar de lá é morno e úmido como o de uma boca.',
  // Cidade Afogada
  'Chamavam-na Cidade dos Sinos, e ela ficava à beira de um lago que um dia subiu e não desceu mais. O abismo guardou a cidade inteira debaixo da água, com as ruas, as torres e a gente. Nas ostras do fundo crescem pérolas negras, e dizem que cada uma é um fôlego preso.',
  // Forja Abissal
  'Uma forja do tamanho de um vale, com fornos que ninguém acendeu e que nunca se apagam. Lá se trabalha sem descanso, e ninguém sabe para quem. As brasas que os heróis trazem continuam quentes por semanas, mesmo dentro do cofre.',
  // Coração do Abismo
  'O fundo de tudo, onde as paredes pulsam devagar e o chão é frio como pele de morto. Lá não cresce minério nem planta, só fragmentos de alma, que se juntam em volta de quem chega. Os poucos que voltaram de lá dormem de olhos abertos.',
  // Colmeia Pálida
  'Uma colmeia sem céu, de cera pálida, com corredores que se fecham atrás de quem passa. As criaturas de lá não fazem mel: cuidam de esporos como quem cuida de cria. Tudo zune o tempo todo, e o zumbido não sai dos ossos nem depois da volta.',
  // Fossa Cantante
  'Uma fenda de água parada e funda, onde a única luz vem dos próprios bichos. Lá embaixo alguma coisa canta, e a água leva o canto longe. As pérolas negras de lá tremem na mão, como se ainda lembrassem a melodia.',
  // Cidadela de Engrenagens
  'Uma fortaleza de engrenagens de ferro-negro, que giram sem ninguém para dar corda. Os construtores sumiram, e a cidadela seguiu trabalhando sozinha, consertando a si mesma e matando quem entra. O ferro de lá é mais limpo que o das minas, e mais frio.',
  // Deserto de Ossos
  'Um deserto onde a areia é osso moído e as dunas mudam de lugar à noite. Antes foi um reino, que enterrou os seus mortos até não sobrar chão para os vivos. O vento de lá assobia nos ossos como numa flauta.',
];

/** Pelo id do monstro (os 30 de BIOMES). */
export const MONSTER_LORE: Record<string, MonsterLore> = {
  // ── Catacumbas ──
  esqueleto: {
    habit: 'Anda devagar e bate firme, e o osso seco aguenta mais golpe do que parece.',
    story:
      'São os mortos das catacumbas, levantados sem pressa e sem vontade. Rangem a cada passo porque as juntas secaram há séculos. Obedecem a quem sabe chamar: o Guardião das Urnas, nas Catacumbas, e um rei, num deserto mais fundo.',
  },
  rato: {
    habit: 'Vem em bando e morde depressa, mas qualquer golpe bem dado acaba com ele.',
    story:
      'Cresceram comendo o que as urnas guardavam e ficaram do tamanho de um cão. Dizem que roem o nome das lápides antes dos ossos. Os ratos da vila fogem do celeiro quando um herói volta com o cheiro deles.',
  },
  acolito: {
    habit: 'Fica atrás dos mortos e fere de longe, com rezas que cortam como faca.',
    story:
      'Eram noviços da Ordem da Candeia, os que ficaram rezando quando a abadia caiu no escuro. A reza mudou de destino, e eles não perceberam. Ainda usam o capuz da ordem, comido pelo mofo.',
  },
  // ── Minas Inundadas ──
  mineiro: {
    habit: 'Avança pesado, de picareta em punho, e aguenta pancada como homem de mina.',
    story:
      'Eram homens da Companhia do Veio Fundo, presos nas galerias quando a água subiu. Continuam cavando, porque ninguém deu o fim do turno. As famílias deles nunca receberam o último pagamento.',
  },
  enguia: {
    habit: 'Chega em cardume e morde rápido, mas o corpo mole não resiste à lâmina.',
    story:
      'Vivem no breu da água parada, onde luz nenhuma chegou. Dizem que nasceram do óleo das lanternas que afundaram com os mineiros. A carne delas tem gosto de ferrugem, e nem os cães da vila comem.',
  },
  golem: {
    habit: 'Lento como uma comporta, mas quase nada o arranha.',
    story:
      'A Companhia mandou fazer golens para carregar minério onde homem nenhum aguentava. Quando a água subiu, ninguém se lembrou de mandá-los parar. Ainda levam pedra de um lado para o outro e esmagam o que fica no caminho.',
  },
  // ── Jardim de Fungos ──
  esporento: {
    habit: 'Luta sem pressa e sem medo, e não cai com o primeiro golpe.',
    story:
      'Era gente que respirou esporo demais e foi deixando de ser gente aos poucos. O fungo cresce por dentro e usa o corpo como bengala. Os curandeiros mandam queimar a roupa de quem volta do Jardim.',
  },
  aranha: {
    habit: 'Fica no alto, atrás dos outros, e pica depressa quem não está olhando.',
    story:
      'Tece fios de micélio em vez de seda, e a teia continua crescendo depois de pronta. Quem fica preso nela vira parte do jardim. As mães da vila varrem todo fiapo branco que aparece nos cantos da casa.',
  },
  brotado: {
    habit: 'Pesado e cheio de seiva, aguenta muito e bate com a força de um tronco.',
    story:
      'Brota do chão do Jardim quando a Mãe-Bolor quer, já crescido e com raiva. Dizem que é oco por dentro, e que no oco dormem sementes de outros iguais. Lenhador nenhum da vila aceita rachar a madeira dele.',
  },
  // ── Cidade Afogada ──
  sacerdote: {
    habit: 'Reza atrás dos outros e fere de longe, com uma voz cheia de água.',
    story:
      'Serviam nos templos da Cidade dos Sinos e afundaram com eles, no meio do ofício. Ainda abençoam quem passa, e a bênção agora machuca. Pela boca deles sai água em vez de fôlego.',
  },
  sereia: {
    habit: 'Ligeira e de pele fina, ataca depressa e cai fácil quando é alcançada.',
    story:
      'Não é peixe nem moça: é o lodo do fundo que aprendeu a imitar uma. Canta baixinho, com a voz de quem se afogou, para chamar os que mergulham. Os pescadores não dizem o nome dela em voz alta.',
  },
  cavaleiroSalobro: {
    habit: 'Firme como muralha, aguenta muito golpe e devolve cada um sem pressa.',
    story:
      'Era a guarda da cidade, que ficou no posto enquanto a água subia. A armadura enferrujou por fora e criou craca por dentro. Os cavaleiros ainda esperam a ordem de abandonar a muralha, e ninguém sobrou para dá-la.',
  },
  // ── Forja Abissal ──
  ferreiroCinzento: {
    habit: 'Duro como o couro do avental, troca golpe por golpe sem recuar.',
    story:
      'Trabalham na Forja Abissal há tanto tempo que ficaram da cor da cinza. Não falam e não descansam, e a quem os interrompe respondem com o martelo. O ferreiro da vila diz que eles forjam bem, mas não sabem para quê.',
  },
  caoBrasa: {
    habit: 'Corre em matilha e morde depressa, mas apaga com poucos golpes.',
    story:
      'Eram cães de guarda da forja que dormiram perto demais do fogo. O pelo virou brasa, e os olhos, carvão. Os cães da vila uivam na noite em que um grupo volta de lá.',
  },
  escravoForja: {
    habit: 'Fica atrás dos ferreiros e atira ferro em brasa por cima deles, com a força de quem não tem escolha.',
    story:
      'É gente de muitos mundos, acorrentada aos fornos pelo Martelo Que Não Dorme. Luta porque as correntes puxam, não porque quer. Alguns pedem ajuda no meio da luta, e ninguém sabe dizer se é armadilha.',
  },
  // ── Coração do Abismo ──
  sombra: {
    habit: 'Ataca rápido e sem trégua, como uma fome que não passa.',
    story:
      'É o que sobra de quem morreu de fome no abismo, sem corpo e sem descanso. Come a luz primeiro e a coragem depois. As tochas do grupo encolhem quando uma delas chega perto.',
  },
  lamento: {
    habit: 'Fica longe, atrás das sombras, e fere com um choro que dói mais que lâmina.',
    story:
      'Ninguém sabe de quem é o choro, só que é sempre de alguém conhecido. Os que voltaram juram que o Lamento chamou cada um pelo nome. Não tem rosto, ou tem um que ninguém consegue lembrar depois.',
  },
  arauto: {
    habit: 'Grande e fechado como um sino, aguenta muito e bate com peso.',
    story:
      'Anuncia a chegada de alguma coisa, mas nunca diz de quê. Veste uma armadura sem emenda, como se tivesse nascido dentro dela. Os velhos dizem que um Arauto do Fundo já subiu até a vila uma vez, e que a vila não se lembra.',
  },
  // ── Colmeia Pálida ──
  zangao: {
    habit: 'De casca dura e passo firme, põe o corpo entre a Rainha e as lâminas.',
    story:
      'São os soldados da Colmeia Pálida, com uma casca de quitina que lâmina ruim não fura. Não pensam em nada além da Rainha dos Esporos. Quando um cai, outro sai da cera para tomar o lugar.',
  },
  mariposa: {
    habit: 'Chega em nuvem e bate depressa, mas cai com qualquer golpe que acerte.',
    story:
      'Nascem na cera da Colmeia e vão atrás de toda luz, até a dos olhos. O pó das asas deixa a pele pálida por dias. Na vila, mariposa branca na janela é sinal de que alguém vai descer.',
  },
  casulo: {
    habit: 'Quase não se mexe e quase nada o fere, e por dentro alguma coisa empurra.',
    story:
      'Ninguém sabe o que dorme dentro dele, e quem abriu um não quis contar. Arrasta-se pela Colmeia à procura de lugar quente. Às vezes, de dentro da casca, uma voz pede que o deixem nascer.',
  },
  // ── Fossa Cantante ──
  peixeLanterna: {
    habit: 'Fica atrás dos outros, no escuro, e fere de longe guiado pela própria luz.',
    story:
      'A luz que carrega na testa é a única da Fossa Cantante, e por isso tudo nada até ela. Quem chega perto descobre a boca. Os pescadores da vila não deixam lanterna acesa perto da água.',
  },
  aguaViva: {
    habit: 'Vem aos montes e queima depressa, mas não tem casca nenhuma, e um golpe a desfaz.',
    story:
      'Flutuam em silêncio na água parada, e cada uma guarda uma nota do canto. Quando muitas se juntam, a Fossa inteira vibra. Dizem que são as lágrimas do Coro Submerso, que nunca param de cair.',
  },
  caranguejo: {
    habit: 'Lento e de casco quase impenetrável, avança de lado e aguenta o que vier.',
    story:
      'Vive no fundo da Fossa e come o que cai lá de cima, inclusive gente. Quem venceu um já usou o casco como escudo. Dizem que é surdo, e que por isso o canto não o prende.',
  },
  // ── Cidadela de Engrenagens ──
  automato: {
    habit: 'Guarda o posto sem pressa e sem cansaço, e cobra caro cada passo.',
    story:
      'Foi feito para vigiar uma porta que já não existe. Segue as ordens de construtores que sumiram, e a primeira delas é não deixar ninguém passar. Range quando anda, como quem reclama de um serviço sem fim.',
  },
  aranhaEngrenagem: {
    habit: 'Sai em bando dos vãos da parede, rápida e miúda, e se desmancha com pouco.',
    story:
      'São máquinas pequenas que consertam a Cidadela, apertando parafusos e trocando dentes de engrenagem. Quem entra é tratado como peça solta. O ferreiro da vila desmontou uma e nunca conseguiu montar de novo.',
  },
  fornalha: {
    habit: 'Pesada, quente e lenta, aguenta muito e bate com o calor de um forno aberto.',
    story:
      'É uma fornalha com pernas, que alimenta as engrenagens da Cidadela com o que encontra pelo caminho. Às vezes encontra gente. O calor dela se sente duas salas antes.',
  },
  // ── Deserto de Ossos ──
  mumia: {
    habit: 'Anda sem pressa e aguenta mais do que as faixas fazem crer.',
    story:
      'Foram os nobres do reino, enfaixados com cuidado para durar. Duraram demais. Vagam pelas dunas procurando a casa onde foram enterrados, que a areia já engoliu.',
  },
  chacal: {
    habit: 'Caça em matilha e morde depressa, mas os ossos soltos quebram com pouco.',
    story:
      'Eram os chacais que rondavam as tumbas do reino, à espera dos enterros. A areia de osso entrou neles até não sobrar carne. Ainda rondam, e os enterros agora são os dos heróis.',
  },
  escorpiao: {
    habit: 'Grande e couraçado, bate forte com a cauda e aguenta muito castigo.',
    story:
      'Dorme debaixo das dunas e acorda com o passo de quem anda por cima. O veneno secou há muito tempo, mas o ferrão ainda fura armadura. Os chacais saem do caminho quando a areia começa a se mexer.',
  },
};

/** Pelo id do chefe do bioma (os 10 Senhores). */
export const LORD_LORE: Record<string, LordLore> = {
  // Nível 1 (invocar)
  guardiaoUrnas: {
    seen: 'Os coveiros contam de um vulto alto que anda entre as urnas das Catacumbas e não deixa nenhuma ser aberta. Dizem que, quando ele bate o cajado, os mortos se levantam para ajudar.',
    defeated:
      'Chama os mortos das urnas, dois a dois, e eles se levantam enquanto houver lugar na sala. Quando sangra, quebra as próprias urnas: a cada chamado, os cacos e as cinzas ferem o grupo inteiro.',
    flawless:
      'Era o último coveiro da Ordem da Candeia. Jurou que nenhum morto da abadia ficaria sem guarda, e o abismo o tomou ao pé da letra. Ele ainda sabe o nome de cada um.',
  },
  // Nível 2 (couraca)
  couraca: {
    seen: 'Os mineiros velhos falam de uma armadura que faz a ronda no fundo das galerias alagadas, sem ninguém dentro. Dizem que as picaretas quebram nela como gravetos.',
    defeated:
      'Quase nenhuma lâmina passa a couraça, e a luta pede paciência mais que força. Ferida, ela endurece ainda mais, e cada golpe dela alcança dois heróis de uma vez.',
    flawless:
      'A couraça não está vazia, como diziam. Dentro dela ficou o capataz da Companhia do Veio Fundo, que desceu para fechar a comporta quando a água subiu. Ainda faz a ronda que fazia em vida.',
  },
  // Nível 3 (veneno)
  maeBolor: {
    seen: 'Dizem que no meio do Jardim de Fungos há uma figura enorme que cuida das plantas como mãe. Quem chegou perto voltou com a garganta verde e não quis falar dela.',
    defeated:
      'Solta esporos sobre o grupo inteiro, e o veneno corrói devagar quem não é tratado; um bom curandeiro limpa o mal. Ferida, faz o jardim brotar: dois Brotados saem do chão, e os esporos vêm mais depressa.',
    flawless:
      'Antes do jardim, era uma curandeira que plantava ervas na encosta da abadia. Desceu atrás de uma raiz que curava qualquer mal, e achou. A raiz é que não a deixou voltar.',
  },
  // Nível 4 (maldicao)
  arcebispo: {
    seen: 'Os pescadores contam de um sermão que sobe do fundo da água nas noites paradas. Quem escuta até o fim acorda sem vontade de nada.',
    defeated:
      'A reza dele é maldição: tira o ânimo de quem ouve, e só os devotos não sentem; com um curandeiro no grupo, pesa menos. Ferido, reza ao contrário e amaldiçoa mais vezes, e depois de cada maldição as curas rendem a metade por um tempo.',
    flawless:
      'Quando a água começou a subir, o arcebispo mandou fechar as portas do templo e rezar até ela baixar. A água não baixou, e ele não terminou a reza. Os sinos da cidade ainda tocam para que alguém o mande parar.',
  },
  // Nível 5 (retaguarda)
  martelo: {
    seen: 'Na Forja Abissal um martelo bate sem parar, e ninguém viu a mão que o segura. O ferreiro da vila jura que às vezes o ouve pelo chão da oficina.',
    defeated:
      'Quase não liga para quem está na frente: procura os que curam e os que atacam de longe. De tempos em tempos bate no chão, e o tremor alcança o grupo inteiro. Ferido, bate mais vezes e caça quem está mais perto da morte.',
    flawless:
      'Era um ferreiro que jurou não dormir até forjar uma corrente capaz de fechar o abismo. Esqueceu há muito o que forjava, mas não o juramento. A corrente, dizem, já está pronta, e ele não lembra onde a guardou.',
  },
  // Nível 6 (colmeia)
  rainhaEsporos: {
    seen: 'Dizem que numa dimensão funda há uma colmeia do tamanho da abadia, de cera pálida como pele. Quem chegou perto ouviu o zumbido da rainha dentro dos próprios ossos.',
    defeated:
      'Enquanto houver um Zangão de Quitina de pé, a Rainha quase não sente os golpes, e ela chama zangões novos sem parar. Ferida, sobe para o alto do ninho, onde as lâminas mal chegam, e a luta passa a ser dos que atacam de longe.',
    flawless:
      'A Rainha nasceu de um esporo que a Mãe-Bolor soltou fundo demais. Onde a mãe fez um jardim, a filha fez um exército. Nenhuma das duas sabe que a outra existe.',
  },
  // Nível 7 (canto)
  coroSubmerso: {
    seen: 'Os marinheiros falam de muitas vozes que cantam uma melodia só, debaixo da água parada. Quem para para ouvir não sabe dizer depois quanto tempo ficou ali.',
    defeated:
      'O canto prende quem bate mais forte, que larga a luta e fica parado, ouvindo. Ferido, o Coro canta mais alto: prende dois de cada vez e se cura com a própria voz.',
    flawless:
      'O Coro é feito dos que pararam para ouvir. Cada voz nova se afina com as outras e esquece o próprio nome. Entre elas, dizem, há vozes de gente da vila.',
  },
  // Nível 8 (placas)
  colosso: {
    seen: 'Contam de uma cidadela que gira sozinha e de um gigante de ferro no meio dela, que ninguém nunca viu parado. Dizem que é ele que faz tudo girar.',
    defeated:
      'Placas de ferro-negro cobrem o Colosso e bebem os golpes antes da carne. Se o grupo não as quebra a tempo, elas se refazem inteiras; quebradas, demoram a voltar, e é nessa janela que se bate. Ferido, superaquece: as placas caem, o ferro amolece e jatos de vapor atingem todos.',
    flawless:
      'O Colosso não foi feito para a guerra. Os construtores da cidadela o ergueram para segurar o teto quando o mundo deles começou a cair. Ele segura até hoje, e só luta para não soltar.',
  },
  // Nível 9 (exercito)
  reiOssuarios: {
    seen: 'Dizem que no Deserto de Ossos um rei conta os seus soldados todas as noites, e a conta nunca fecha. Quem morre por lá entra na conta.',
    defeated:
      'Quem cai do lado dele pode se levantar de novo como esqueleto, mas só uma vez. Ferido, chama o exército inteiro: dois esqueletos se erguem na hora, mais mortos voltam, e cada golpe do rei lhe devolve vida.',
    flawless:
      'Era um rei que mandou o exército inteiro descer à tumba com ele, para não ser enterrado sozinho. A tumba cresceu até virar deserto. A conta nunca fecha porque ele esquece de contar a si mesmo.',
  },
  // Nível 10, o chefe máximo (ecos)
  aquiloQueVigia: {
    seen: 'A vila tem o nome dele, e ninguém se lembra de quem o deu. Os velhos dizem que o abismo não é um buraco: é uma pálpebra.',
    defeated:
      'Logo que a luta começa, ergue os ecos dos mortos da vila e os põe contra os vivos. Quando sangra, ergue outros e abre o olho, e quem é olhado perde a coragem aos poucos; os devotos aguentam mais.',
    flawless:
      'Os que o venceram sem perder ninguém não falam do que viram quando o olho se fechou. Um deles disse apenas que, do outro lado, havia uma vila igual à nossa, e alguém olhando para baixo.',
  },
};

export const RULE_LORE: Record<DimRuleId, string> = {
  nevoa:
    'Em certas dimensões sobe do chão uma névoa grossa, que não molha e não se desfaz. Nela ninguém enxerga o ponto fraco do outro, nem herói nem monstro. Os golpes certeiros ficam raros dos dois lados, e a luta vira paciência.',
  mare: 'A água de algumas dimensões sobe e desce como maré, sem lua e sem mar. Ela pesa nas pernas de todo mundo, herói ou monstro, e a descida demora mais. Os velhos dizem que é o abismo respirando.',
  esporos:
    'O ar de certas passagens vem carregado de um pó amarelo que gruda na garganta. A cada sala atravessada, os heróis perdem um pouco do fôlego e da carne. Os curandeiros acham que é o Jardim de Fungos crescendo para dentro de outros mundos.',
  calor:
    'Algumas dimensões ficam perto demais da Forja Abissal e esquentam como um forno. O calor deixa os monstros furiosos, e o ouro que eles guardam amolece e se solta. Quem volta de lá volta mais rico e mais queimado.',
  silencio:
    'Há passagens onde nenhum som vai longe, e as rezas morrem na boca de quem cura. As feridas fecham devagar, como se a bênção tivesse de atravessar algodão. Os acólitos da vila não gostam de falar desse silêncio.',
  ganancia:
    'Certas dimensões parecem pedir para ser saqueadas: baús por toda parte, e mais monstros grandes guardando cada um. Os velhos dizem que é isca, e que o abismo pesca com ouro. A guilda manda os gananciosos assim mesmo.',
  luaSangue:
    'Em algumas passagens, o teto de pedra se abre para uma lua vermelha que não existe em mundo nenhum. Sob ela, mais monstros grandes nascem com sede e bebem o sangue de quem ferem para fechar as próprias feridas. Ninguém sabe o que a lua é, só que ela também tem sede.',
  ecos: 'Há passagens onde os mortos da vila não estão tão mortos. O abismo guarda o jeito de lutar de cada herói que levou, e nesses lugares ele se lembra com mais força. Os ecos aparecem mais, com as armas e o rosto de quem a vila já chorou.',
};

/** Pelo nome próprio da lendária (LEGENDARY_TITLES). */
export const LEGENDARY_LORE: Record<string, string> = {
  'Vigia Partida':
    'O nome vem do primeiro vigia da borda do abismo, que passava as noites olhando para baixo. Uma noite ele viu alguma coisa olhar de volta, e nunca mais dormiu inteiro. Quem carrega a peça sente, às vezes, o mesmo olhar na nuca.',
  'Lamento de Ferro-negro':
    'Foi batida com ferro-negro das Minas Inundadas por um ferreiro que perdeu os dois filhos na água. Ele trabalhou o metal chorando, e o choro ficou preso nele. Quando a peça leva um golpe, soa como gente.',
  'Última Vela':
    'O último irmão da Ordem da Candeia levou uma vela acesa para o escuro quando a abadia caiu. Apagou-a para não ser visto, mas a chama passou para o metal em que a guardaram. Quem carrega a peça nunca fica de todo no escuro.',
  'Dente do Guardião':
    'O primeiro grupo que venceu o Guardião das Urnas arrancou-lhe um dente, e o joalheiro o engastou numa peça. À noite ela range como as urnas das Catacumbas. Os coveiros pedem que não a tragam ao cemitério.',
  'Promessa Afogada':
    'Era a aliança de um casamento que acontecia no templo quando a Cidade dos Sinos afundou. Os noivos não chegaram a dizer o sim, e o arcebispo não terminou a bênção. A peça ainda guarda a promessa, e pesa como quem espera.',
  'Coração de Brasa':
    'É uma brasa da Forja Abissal que não esfriou nem no fundo do poço da vila. O ferreiro que a engastou trabalhou de luvas por um ano. Quem a carrega não sente frio, nem no inverno nem no luto.',
  'Silêncio das Urnas':
    'Foi feita com a tampa da última urna que o Guardião das Urnas guardava. Quem a carrega anda pelas Catacumbas sem que os mortos o ouçam. Os coveiros dizem que é a única coisa que saiu de lá com a licença do Guardião.',
  'Juramento do Fundo':
    'Foi forjada para quem jurou descer até o fim do abismo e voltar contando o que viu. Passou por muitas mãos, e cada dono morreu cumprindo o juramento do anterior. Ninguém o cumpriu até hoje, e a peça continua procurando quem cumpra.',
  'Olho que Não Dorme':
    'É uma pedra escura e úmida, achada no Coração do Abismo, que às vezes parece piscar. O joalheiro não quis lapidá-la e a encaixou do jeito que veio. Quem a carrega dorme pouco e sonha que está sendo olhado.',
  'Raiz da Mãe-Bolor':
    'É a raiz que a Mãe-Bolor desceu para buscar, quando ainda tinha outro nome. O grupo que a venceu achou a raiz enrolada no que lhe servia de coração e a trouxe para a vila. A peça ainda cresce um pouco a cada lua, e ninguém teve coragem de podar.',
  'Maré Negra':
    'Foi feita com pérolas negras da Fossa Cantante, fundidas numa noite em que a água de lá subiu sem motivo. Quem a carrega ouve ondas onde não há mar. Os pescadores juram que, quando ela passa, a água do poço sobe um palmo.',
  'Cinza do Martelo':
    'Foi forjada com a cinza do Martelo Que Não Dorme, recolhida pelo grupo que o fez parar. Naquela noite, a Forja Abissal ficou em silêncio pela primeira vez. A peça esquenta na mão quando há um ferido por perto, como se ainda procurasse por ele.',
};

export const MYSTERY_LORE: MysteryLore[] = [
  {
    id: 'ecos',
    name: 'Os ecos',
    text: 'Às vezes, lá embaixo, um herói que a vila enterrou aparece do lado dos monstros, com o rosto e o jeito de lutar de sempre. A crônica o registra como Eco, seguido do nome que ele tinha, e o eco não reconhece ninguém. Derrubá-lo não o traz de volta, mas o deixa descansar por um tempo.',
  },
  {
    id: 'nemesis',
    name: 'As nêmesis',
    text: 'Quando um monstro comum mata um herói e escapa com vida, a vila lhe dá um nome, e ele parece ouvir. Fica mais forte a cada morte e anda de uma dimensão para outra, carregando a lembrança de quem levou. Só descansa quando alguém cobra a dívida.',
  },
  {
    id: 'elites',
    name: 'Os elites',
    text: 'Alguns monstros saem do escuro maiores e mais velhos que os outros, marcados por dons que o abismo dá a poucos. Uns são velozes, outros couraçados ou ferozes, e há os que estouram ao cair. Os piores bebem o sangue de quem ferem.',
  },
  {
    id: 'calmaria',
    name: 'A calmaria',
    text: 'Nem toda dimensão tem névoa, maré ou lua vermelha. Algumas estão em calmaria, e o abismo parece prender a respiração. Os veteranos desconfiam mais dessas do que das outras.',
  },
  {
    id: 'passagens',
    name: 'As passagens',
    text: 'O abismo não tem um caminho só: abre passagens para mundos que ninguém conhece até atravessar. Cada uma fica aberta por quarenta dias, um ano da vila, e a guilda desenha o mapa dela sala por sala. Quando a passagem se fecha, o que ficou lá dentro fica para sempre.',
  },
  {
    id: 'fragmentos',
    name: 'Os fragmentos do amuleto',
    text: 'Às vezes, depois de uma luta, um herói acha no chão um caco de amuleto que não é de mundo nenhum. Cada nível do abismo tem os seus, e cinco cacos do mesmo nível, nas mãos do joalheiro, viram um amuleto inteiro. O amuleto aponta o caminho do covil do Senhor, e de nenhum outro lugar.',
  },
  {
    id: 'contrato',
    name: 'O contrato do Senhor',
    text: 'Com o amuleto pronto, a guilda escreve o contrato, e os mais fortes da vila põem nele o próprio nome. A descida vai direto ao covil, sem passagem, e quem recua perde o amuleto. Os que caem lá ficam com o Senhor.',
  },
  {
    id: 'retorno',
    name: 'O retorno',
    text: 'Quando Aquilo que Vigia cai, o abismo não se fecha. Os Senhores voltam um a um, mais fortes, como ecos de si mesmos, e a contagem recomeça do primeiro. Os velhos dizem que a vigília não acaba: só muda de lado.',
  },
];
