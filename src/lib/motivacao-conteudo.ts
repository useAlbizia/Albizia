// As mensagens de motivação dos sócios, em ordem. O envio automático manda
// uma por vez e volta ao começo depois da última.
//
// REGRAS para quem for escrever mais mensagens aqui:
// - Só história REAL e conhecida, sem inventar número ou detalhe. Na dúvida,
//   escreva mais genérico ("com pouco dinheiro") em vez de arriscar um valor.
// - Versículos só de livros que católicos e evangélicos têm em comum (nada de
//   Eclesiástico, Sabedoria, Tobias etc.), em tradução livre e fiel.
// - O nome da marca não vai digitado no corpo: ela aparece no logo do topo.
//   No texto, "a nossa marca". No assunto pode, porque assunto é só texto.
// - Tom de quem já decidiu: o caminho é o sucesso. Não usar a palavra
//   "errado" nem plantar dúvida.

export type Motivacao = {
  /** O que aparece na notificação do celular. */
  assunto: string;
  titulo: string;
  abertura: string;
  historia: { quem: string; texto: string };
  licao: string;
  versiculo: { texto: string; ref: string };
  /** O que fazer hoje. */
  chamada: string;
};

export const MOTIVACOES: Motivacao[] = [
  {
    assunto: "Ainda que o começo seja pequeno",
    titulo: "Pequeno começo, fim muito grande",
    abertura:
      "Estamos num caminho que não tem volta, e o nome dele é sucesso. Toda marca gigante que vocês conhecem já esteve exatamente onde nós estamos agora: poucos sócios, pouco caixa e uma ideia na cabeça.",
    historia: {
      quem: "Phil Knight · Nike",
      texto:
        "Em 1964, Phil Knight pegou 50 dólares emprestados com o pai e começou a vender tênis importados do porta-malas do carro, em pistas de corrida. A empresinha se chamava Blue Ribbon Sports. Anos depois, virou a Nike.",
    },
    licao: "Porta-malas de carro. É daí que saiu a maior marca esportiva do planeta. O tamanho do começo nunca decidiu o tamanho do fim.",
    versiculo: { texto: "Ainda que o teu princípio seja pequeno, o teu fim será muito grande.", ref: "Jó 8:7" },
    chamada: "Hoje: abra o aplicativo e lance um gasto que você já teve com a empresa.",
  },
  {
    assunto: "Ela cresceu num orfanato",
    titulo: "Da agulha das freiras ao nome mais famoso da moda",
    abertura:
      "Moda não é sorte, é constância. E cada peça nossa carrega a mesma coisa que fez as maiores marcas do mundo: alguém que acreditou antes de todo mundo.",
    historia: {
      quem: "Coco Chanel · Chanel",
      texto:
        "Gabrielle Chanel perdeu a mãe ainda criança e cresceu num orfanato, onde aprendeu a costurar com as freiras. Começou fazendo chapéus. O sobrenome dela virou sinônimo de luxo no mundo inteiro.",
    },
    licao: "Ela não tinha família rica, não tinha investidor, não tinha nome. Tinha mão de obra, gosto e coragem. Nós temos tudo isso, e somos três.",
    versiculo: { texto: "Não desprezes o dia dos pequenos começos.", ref: "Zacarias 4:10 (adaptado)" },
    chamada: "Hoje: separe as peças que vão para a sessão de fotos.",
  },
  {
    assunto: "Melhor serem dois do que um",
    titulo: "Sociedade é força multiplicada",
    abertura:
      "Ninguém constrói marca grande sozinho. O que temos de mais valioso não é o site nem o estoque: são três pessoas com o mesmo objetivo.",
    historia: {
      quem: "Steve Jobs e Steve Wozniak · Apple",
      texto:
        "Para montar os primeiros computadores, Jobs vendeu a sua Kombi e Wozniak vendeu a calculadora. Começaram na garagem da casa dos pais de Jobs. Dois sócios, quase nenhum dinheiro, e uma das empresas mais valiosas da história.",
    },
    licao: "Os dois venderam o que tinham para começar. Sociedade é isso: cada um coloca a sua parte e todos colhem juntos.",
    versiculo: {
      texto: "Melhor é serem dois do que um, porque têm melhor paga do seu trabalho. Se um cair, o outro levanta o seu companheiro.",
      ref: "Eclesiastes 4:9-10",
    },
    chamada: "Hoje: aprove os lançamentos que estão esperando o seu voto.",
  },
  {
    assunto: "Ele vendia fósforos de bicicleta",
    titulo: "Do sítio para o mundo",
    abertura:
      "Tem gente que espera ter tudo para começar. Os grandes começaram com o que tinham na mão, e nós já temos muito mais do que eles tinham.",
    historia: {
      quem: "Ingvar Kamprad · IKEA",
      texto:
        "Menino de sítio no interior da Suécia, Ingvar comprava fósforos em quantidade e revendia para os vizinhos de bicicleta. Aos 17 anos fundou a IKEA. Hoje ela está em dezenas de países.",
    },
    licao: "Fósforo, bicicleta e vontade. Nós temos site pronto, pagamento, frete, painel e uma marca linda. Não falta nada para crescer.",
    versiculo: { texto: "Consagra ao Senhor tudo o que fazes, e os teus planos serão bem-sucedidos.", ref: "Provérbios 16:3" },
    chamada: "Hoje: mostre a nossa marca para três pessoas e pergunte o que acharam.",
  },
  {
    assunto: "Assinou o negócio na porta do auxílio",
    titulo: "De vale-alimentação a bilhões",
    abertura: "A nossa história ainda está no primeiro capítulo. E os primeiros capítulos de todas as grandes histórias são parecidos com o nosso.",
    historia: {
      quem: "Jan Koum · WhatsApp",
      texto:
        "Jan Koum chegou aos Estados Unidos adolescente, com a mãe, vivendo de auxílio do governo. Varria o chão de um mercado. Criou o WhatsApp, vendido em 2014 por 19 bilhões de dólares, e assinou o contrato na porta do prédio onde antes ia buscar o auxílio.",
    },
    licao: "O lugar de onde você sai não define o lugar onde você chega. Define só o tamanho da vitória.",
    versiculo: {
      texto: "Porque eu sei os planos que tenho para vocês, planos de paz e não de mal, para dar a vocês um futuro e uma esperança.",
      ref: "Jeremias 29:11",
    },
    chamada: "Hoje: abra o painel e veja como está o caixa da empresa em Sócios.",
  },
  {
    assunto: "Começou costurando bonés com a mãe",
    titulo: "Moda de rua feita em casa",
    abertura: "Marca de roupa nasce assim: dentro de casa, com as mãos de quem acredita. Depois o mundo descobre.",
    historia: {
      quem: "Daymond John · FUBU",
      texto:
        "Daymond John costurava bonés com a mãe, na casa deles em Nova York, e vendia na rua. A mãe chegou a hipotecar a casa para financiar a marca. A FUBU virou um império da moda de rua e faturou bilhões.",
    },
    licao: "Roupa feita em casa, vendida de mão em mão, virou referência mundial. É o mesmo caminho que a nossa marca está trilhando.",
    versiculo: { texto: "Tudo o que fizerem, façam de todo o coração, como para o Senhor.", ref: "Colossenses 3:23" },
    chamada: "Hoje: poste uma foto de uma peça nossa nos seus stories.",
  },
  {
    assunto: "Começou no porão da avó",
    titulo: "Um porão, um cartão de crédito e uma ideia",
    abertura: "Ninguém nos deu nada pronto, e é exatamente por isso que o que construirmos vai ser nosso de verdade.",
    historia: {
      quem: "Kevin Plank · Under Armour",
      texto:
        "Kevin Plank começou a Under Armour no porão da casa da avó, em 1996, com as contas no cartão de crédito chegando ao limite. Vendia camisetas esportivas de carro em carro, para times. Virou uma das maiores marcas esportivas do mundo.",
    },
    licao: "Porão, dívida no cartão e muita persistência. Ele vendeu camiseta por camiseta até o mundo inteiro querer uma.",
    versiculo: { texto: "Não nos cansemos de fazer o bem, pois no tempo certo colheremos, se não desanimarmos.", ref: "Gálatas 6:9" },
    chamada: "Hoje: lance no aplicativo uma compra de insumo que você já pagou.",
  },
  {
    assunto: "O homem que vendia gravatas",
    titulo: "Um produto bem feito abre todas as portas",
    abertura: "Não precisamos de cem produtos. Precisamos de poucos, muito bem feitos. É assim que nascem as marcas que duram.",
    historia: {
      quem: "Ralph Lauren · Polo Ralph Lauren",
      texto:
        "Filho de imigrantes, criado no Bronx, Ralph Lauren trabalhava como vendedor de gravatas. Em 1967 começou a desenhar as próprias gravatas, largas e diferentes de tudo. Daquelas gravatas nasceu um dos maiores impérios da moda.",
    },
    licao: "Ele começou com UM produto. Nós temos três modelos com identidade forte. É mais do que suficiente para começar grande.",
    versiculo: { texto: "Vês um homem habilidoso no seu trabalho? Perante reis ele se apresentará.", ref: "Provérbios 22:29" },
    chamada: "Hoje: revise os três modelos no site e diga o que pode ficar ainda melhor.",
  },
  {
    assunto: "Carregava malas num hotel",
    titulo: "Ele observava o luxo antes de criá-lo",
    abertura: "Antes de ser grande, toda marca de luxo foi o sonho de alguém sem dinheiro nenhum.",
    historia: {
      quem: "Guccio Gucci · Gucci",
      texto:
        "Antes de fundar a Gucci, Guccio trabalhou num hotel de luxo em Londres carregando a bagagem dos hóspedes ricos. Prestava atenção nas malas, no couro, no acabamento. Voltou para Florença e abriu uma pequena loja em 1921.",
    },
    licao: "Ele aprendeu o luxo olhando de perto e fazendo com as próprias mãos. Minimalismo premium é o nosso luxo, e já está no nosso DNA.",
    versiculo: { texto: "Quem é fiel no pouco também será fiel no muito.", ref: "Lucas 16:10" },
    chamada: "Hoje: pense em uma pessoa que tem a cara da nossa marca e mande o site para ela.",
  },
  {
    assunto: "Camelô aos 14 anos",
    titulo: "Da calçada do Rio para a televisão",
    abertura: "O Brasil está cheio de histórias de quem começou na rua e chegou ao topo. A próxima pode ser a nossa.",
    historia: {
      quem: "Silvio Santos · Grupo Silvio Santos",
      texto:
        "Ainda adolescente, Silvio Santos era camelô nas ruas do Rio de Janeiro, vendendo na calçada com a voz como única ferramenta de venda. Construiu um dos maiores grupos de comunicação do país.",
    },
    licao: "Ele vendia com o que tinha: a voz e a coragem. Nós temos um site, um aplicativo e uma marca. Vamos usar.",
    versiculo: { texto: "Entrega o teu caminho ao Senhor, confia nele, e o mais ele fará.", ref: "Salmos 37:5" },
    chamada: "Hoje: grave um vídeo curto mostrando uma peça e mande no grupo dos sócios.",
  },
  {
    assunto: "Uma lojinha no interior",
    titulo: "De uma loja em Franca para o Brasil inteiro",
    abertura: "Toda rede gigante foi, um dia, uma porta só, numa rua qualquer, com o dono atrás do balcão.",
    historia: {
      quem: "Luiza Helena Trajano · Magazine Luiza",
      texto:
        "A Magazine Luiza começou em 1957 como uma pequena loja em Franca, no interior de São Paulo, aberta pelos tios de Luiza Helena. Ela começou a trabalhar no balcão ainda menina. Hoje é uma das maiores varejistas do Brasil.",
    },
    licao: "Uma loja, uma família, trabalho todo dia. Nós já começamos com loja aberta para o Brasil inteiro, 24 horas por dia.",
    versiculo: { texto: "Os planos do diligente conduzem à fartura.", ref: "Provérbios 21:5" },
    chamada: "Hoje: veja no aplicativo os pedidos e confira se está tudo certo para quando as vendas chegarem.",
  },
  {
    assunto: "2 mil ovos de Páscoa",
    titulo: "Quando a encomenda é maior do que você",
    abertura: "Às vezes a oportunidade chega antes de estarmos prontos. Os grandes dizem sim e aprendem no caminho.",
    historia: {
      quem: "Alexandre Costa · Cacau Show",
      texto:
        "Aos 17 anos, Alexandre Costa recebeu uma encomenda de 2 mil ovos de Páscoa que o fornecedor não tinha como entregar. Com dinheiro emprestado de um parente e a ajuda de uma doceira, fez os ovos ele mesmo. Dali nasceu a Cacau Show, com milhares de lojas pelo país.",
    },
    licao: "Ele disse sim antes de saber como. Nós já sabemos como: está tudo pronto. Só falta dizer sim para as vendas.",
    versiculo: { texto: "Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus está contigo por onde quer que andares.", ref: "Josué 1:9" },
    chamada: "Hoje: defina com os sócios a data da sessão de fotos.",
  },
  {
    assunto: "Vendia do porta-malas do carro",
    titulo: "Fazer o produto que você mesmo usaria",
    abertura: "Marca verdadeira nasce de quem ama o que faz. É por isso que a nossa tem alma.",
    historia: {
      quem: "Yvon Chouinard · Patagonia",
      texto:
        "Yvon Chouinard aprendeu sozinho a trabalhar como ferreiro para fazer o equipamento de escalada que ele mesmo usava, e vendia do porta-malas do carro. Daí nasceu a Patagonia, uma das marcas de roupa mais respeitadas do mundo.",
    },
    licao: "Ele fez o que acreditava e vendeu com as próprias mãos. Acreditem no que estamos vestindo: é o que os clientes vão sentir.",
    versiculo: { texto: "Em todo trabalho há proveito.", ref: "Provérbios 14:23" },
    chamada: "Hoje: use uma peça nossa e repare quem pergunta de onde é.",
  },
  {
    assunto: "Começou numa garagem",
    titulo: "Garagem, máquina de costura e economias",
    abertura: "Somos parecidos com quem chegou longe: poucos sócios, pouco dinheiro, muita certeza.",
    historia: {
      quem: "Ben Francis · Gymshark",
      texto:
        "Em 2012, Ben Francis e o amigo de escola Lewis Morgan começaram na garagem dos pais de Ben. Com as economias, compraram uma máquina de costura e uma de serigrafia. A Gymshark passou a valer mais de 1 bilhão de libras.",
    },
    licao: "Eles faziam as peças na garagem e vendiam pela internet. Exatamente o nosso modelo, e com um site que eles não tinham no começo.",
    versiculo: { texto: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
    chamada: "Hoje: abra o aplicativo e confira se você já lançou todos os seus gastos.",
  },
  {
    assunto: "Começou com 150 libras",
    titulo: "O primeiro lote foi para os amigos",
    abertura: "O primeiro cliente quase sempre é um amigo. O segundo é o amigo do amigo. É assim que uma marca começa a andar sozinha.",
    historia: {
      quem: "George e Mike Heaton · Represent",
      texto:
        "Os irmãos Heaton começaram com cerca de 150 libras, mandaram imprimir um lote pequeno de camisetas e venderam para os amigos. Hoje a Represent tem lojas em Los Angeles, Londres e Manchester.",
    },
    licao: "Irmãos, pouco dinheiro, camisetas. A história é tão parecida com a nossa que dá arrepio.",
    versiculo: { texto: "Como o ferro afia o ferro, assim um amigo afia o outro.", ref: "Provérbios 27:17" },
    chamada: "Hoje: faça uma lista de dez amigos que serão os nossos primeiros clientes.",
  },
  {
    assunto: "20 bermudas entre amigos",
    titulo: "A marca carioca que começou na casa dos amigos",
    abertura: "Não precisamos de investidor nem de shopping. Precisamos das primeiras vendas, e elas estão perto.",
    historia: {
      quem: "Rony Meisler e Fernando Sigal · Reserva",
      texto:
        "Os dois amigos começaram vendendo cerca de 20 bermudas para conhecidos no Rio de Janeiro. A Reserva virou uma das marcas masculinas mais fortes do Brasil e entrou para o grupo Arezzo&Co.",
    },
    licao: "Vinte bermudas. Quantas peças nós vamos vender este mês? Que seja o começo da nossa história.",
    versiculo: { texto: "Isaque semeou naquela terra e colheu, naquele mesmo ano, cem vezes mais, porque o Senhor o abençoou.", ref: "Gênesis 26:12" },
    chamada: "Hoje: mande o link da loja para cinco pessoas que você conhece.",
  },
  {
    assunto: "Ele recomeçou depois dos 60",
    titulo: "Nunca é tarde e nunca é cedo",
    abertura: "Não existe hora certa para construir algo grande. Existe a hora em que a gente decide. E nós já decidimos.",
    historia: {
      quem: "Coronel Harland Sanders · KFC",
      texto:
        "O restaurante de beira de estrada do Coronel Sanders perdeu o movimento quando uma nova rodovia passou longe dali. Já com mais de 60 anos, ele pegou a receita de frango e saiu de carro oferecendo para restaurantes. Assim nasceu o KFC.",
    },
    licao: "Ele recomeçou quando todo mundo achava que era hora de parar. Nós estamos começando com tudo pela frente.",
    versiculo: { texto: "Os que esperam no Senhor renovam as suas forças; sobem com asas como águias.", ref: "Isaías 40:31" },
    chamada: "Hoje: abra o Fechamento do mês no aplicativo e veja a meta.",
  },
  {
    assunto: "Recusado em dezenas de empregos",
    titulo: "O não de hoje prepara o sim de amanhã",
    abertura: "Toda grande marca ouviu muitos nãos antes do primeiro sim. Isso não é obstáculo, é o caminho.",
    historia: {
      quem: "Jack Ma · Alibaba",
      texto:
        "Jack Ma não passou no vestibular nas primeiras tentativas e foi recusado em dezenas de vagas de emprego. Fundou o Alibaba em 1999, num apartamento, com um grupo de amigos. Virou um dos maiores comércios eletrônicos do mundo.",
    },
    licao: "Um apartamento e um grupo de amigos. Comércio pela internet. Já ouviram uma história mais parecida com a nossa?",
    versiculo: { texto: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", ref: "Romanos 8:28" },
    chamada: "Hoje: comente com os sócios uma ideia de post para o Instagram.",
  },
  {
    assunto: "Óculos numa banquinha",
    titulo: "De uma banca para todo o Brasil",
    abertura: "Grande marca brasileira de moda também começa pequena, numa banca, num corredor, num ponto qualquer.",
    historia: {
      quem: "Caito Maia · Chilli Beans",
      texto:
        "Caito Maia começou vendendo óculos escuros numa banca em uma feira de moda em São Paulo. Transformou a banca na Chilli Beans, marca com centenas de lojas pelo Brasil e pelo mundo.",
    },
    licao: "Uma banca. Nós temos uma loja online aberta para o país inteiro. O ponto de partida é ainda melhor.",
    versiculo: { texto: "Semeia pela manhã a tua semente e à tarde não retenhas a tua mão.", ref: "Eclesiastes 11:6" },
    chamada: "Hoje: pense em uma parceria local (academia, barbearia, loja) e conte para os sócios.",
  },
  {
    assunto: "Duas empresas fecharam antes",
    titulo: "A terceira tentativa mudou o mundo",
    abertura: "Persistência é o que separa quem sonha de quem chega. E nós chegamos até aqui porque não paramos.",
    historia: {
      quem: "Henry Ford · Ford",
      texto:
        "Antes da Ford Motor Company, Henry Ford participou de duas empresas de automóveis que não deram certo. Na terceira, criou o carro que colocou o mundo sobre rodas.",
    },
    licao: "Ele não parou na primeira nem na segunda. Nós estamos na primeira, com tudo a favor.",
    versiculo: { texto: "Esforcem-se e não desanimem, porque o trabalho de vocês terá recompensa.", ref: "2 Crônicas 15:7" },
    chamada: "Hoje: veja no aplicativo se há lançamento esperando o seu voto e resolva.",
  },
  {
    assunto: "Mãe solo e 12 recusas",
    titulo: "Doze nãos e um sim que mudou tudo",
    abertura: "Quando a visão é clara, os nãos viram combustível.",
    historia: {
      quem: "J.K. Rowling · Harry Potter",
      texto:
        "Mãe solo, vivendo de auxílio do governo, J.K. Rowling escreveu o primeiro livro de Harry Potter e ouviu não de doze editoras. A décima terceira aceitou. A série virou uma das marcas mais valiosas do entretenimento.",
    },
    licao: "Ela acreditou no que tinha nas mãos, mesmo quando ninguém acreditava. Nós temos um produto lindo nas mãos.",
    versiculo: { texto: "Porque a visão ainda é para o tempo determinado; se tardar, espera-o, porque certamente virá.", ref: "Habacuque 2:3" },
    chamada: "Hoje: escreva em uma frase por que a nossa marca vai ser grande e mande para os sócios.",
  },
  {
    assunto: "Perdeu a loja e recomeçou",
    titulo: "Recomeçar mais forte",
    abertura: "O caminho do sucesso tem curvas, mas não tem volta. Cada curva só deixa a gente mais preparado.",
    historia: {
      quem: "Sam Walton · Walmart",
      texto:
        "Sam Walton abriu a primeira loja de variedades com dinheiro emprestado, numa cidade pequena dos Estados Unidos, e fez dela um sucesso. Perdeu o ponto quando o aluguel não foi renovado. Recomeçou em outra cidade e construiu o Walmart.",
    },
    licao: "Ele perdeu o ponto e não perdeu a fé. Recomeçou e construiu a maior varejista do mundo.",
    versiculo: { texto: "Lembra-te do Senhor teu Deus, porque é ele quem te dá força para adquirires riquezas.", ref: "Deuteronômio 8:18" },
    chamada: "Hoje: confira o estoque dos três modelos no aplicativo.",
  },
  {
    assunto: "Ele morou num conjunto habitacional",
    titulo: "Do conjunto habitacional para o mundo inteiro",
    abertura: "Quem cresce sem nada aprende a dar valor a cada passo. É assim que se constrói algo que dura.",
    historia: {
      quem: "Howard Schultz · Starbucks",
      texto:
        "Howard Schultz cresceu num conjunto habitacional popular no Brooklyn, em Nova York. Transformou uma pequena rede de cafeterias de Seattle na Starbucks, presente em quase todo o mundo.",
    },
    licao: "Ele vendia uma experiência, não só café. Nós vendemos uma identidade, não só camiseta.",
    versiculo: { texto: "Confirma, Senhor, a obra das nossas mãos.", ref: "Salmos 90:17" },
    chamada: "Hoje: descreva em três palavras a experiência que o cliente da nossa marca deve sentir.",
  },
  {
    assunto: "Filho de ferroviário",
    titulo: "Do balcão de uma camisaria ao topo",
    abertura: "Moda é um dos negócios que mais transformam vidas, e começa sempre perto do chão.",
    historia: {
      quem: "Amancio Ortega · Zara",
      texto:
        "Filho de um ferroviário, Amancio Ortega começou a trabalhar ainda adolescente como entregador numa camisaria da Espanha. Em 1975 abriu a primeira Zara. Virou um dos homens mais ricos do mundo.",
    },
    licao: "Ele aprendeu a moda por baixo, entregando roupa. Hoje a Zara veste o planeta. Moda feita com constância não tem teto.",
    versiculo: { texto: "A mão diligente enriquece.", ref: "Provérbios 10:4" },
    chamada: "Hoje: olhe três marcas que você admira no Instagram e anote uma ideia para a nossa.",
  },
  {
    assunto: "Vendia aparelhos de fax de porta em porta",
    titulo: "Cinco mil dólares e uma ideia",
    abertura: "Ideia boa com execução firme vale mais do que muito dinheiro parado.",
    historia: {
      quem: "Sara Blakely · Spanx",
      texto:
        "Sara Blakely vendia aparelhos de fax de porta em porta. Com cerca de 5 mil dólares guardados, criou a Spanx. Em 2012, a Forbes a apontou como a mais jovem bilionária que construiu a própria fortuna.",
    },
    licao: "Ela tinha pouco dinheiro e muita convicção. Ninguém acreditava. Ela acreditou por todos.",
    versiculo: { texto: "Deus não nos deu espírito de medo, mas de poder, de amor e de equilíbrio.", ref: "2 Timóteo 1:7" },
    chamada: "Hoje: pense em uma pessoa influente da cidade que poderia usar a nossa marca.",
  },
  {
    assunto: "A primeira empresa dele faliu",
    titulo: "Um rato mudou tudo",
    abertura: "O que parece pausa é preparação. E a nossa fase de preparação está acabando.",
    historia: {
      quem: "Walt Disney · Disney",
      texto:
        "O primeiro estúdio de Walt Disney, em Kansas City, faliu. Ele foi para Hollywood com pouquíssimo dinheiro e recomeçou. Criou o Mickey e um dos maiores impérios de entretenimento da história.",
    },
    licao: "Ele chegou em Hollywood com quase nada e um sonho. Nós temos um site pronto e uma marca com alma.",
    versiculo: { texto: "Bem está, servo bom e fiel. Foste fiel no pouco, sobre o muito te colocarei.", ref: "Mateus 25:21" },
    chamada: "Hoje: entre no painel e dê uma volta pelo tour do Manual.",
  },
  {
    assunto: "Livros vendidos de uma garagem",
    titulo: "A maior loja do mundo começou numa garagem",
    abertura: "Venda pela internet é o caminho dos gigantes. E nós já estamos nele.",
    historia: {
      quem: "Jeff Bezos · Amazon",
      texto:
        "Em 1994, Jeff Bezos começou a Amazon na garagem de casa, em Bellevue, vendendo livros pela internet. Embalava os pedidos ele mesmo. Virou uma das maiores empresas do planeta.",
    },
    licao: "Ele embalava pedido por pedido. Quando o nosso primeiro pedido chegar, vamos embalar com o mesmo cuidado.",
    versiculo: { texto: "O que lavra a sua terra se fartará de pão.", ref: "Provérbios 12:11" },
    chamada: "Hoje: pense em como queremos que o cliente se sinta ao abrir o nosso pacote.",
  },
  {
    assunto: "Ela vestia sacos de batata",
    titulo: "Da pobreza na roça ao topo do mundo",
    abertura: "Não importa de onde a gente vem. Importa para onde a gente decide ir.",
    historia: {
      quem: "Oprah Winfrey",
      texto:
        "Oprah nasceu na pobreza, na zona rural do Mississippi, e conta que chegou a usar vestido feito de saco de batata. Tornou-se uma das mulheres mais influentes e ricas do mundo.",
    },
    licao: "O começo dela foi muito mais difícil do que o nosso. E mesmo assim ela chegou ao topo.",
    versiculo: { texto: "Os passos do homem bom são confirmados pelo Senhor.", ref: "Salmos 37:23" },
    chamada: "Hoje: agradeça a Deus pela sociedade e mande uma mensagem de ânimo para os sócios.",
  },
  {
    assunto: "Um pequeno laboratório em São Paulo",
    titulo: "Uma loja pequena que virou gigante",
    abertura: "Marca brasileira forte nasce de propósito claro. O nosso está no nome e no símbolo.",
    historia: {
      quem: "Luiz Seabra · Natura",
      texto:
        "Em 1969, Luiz Seabra abriu um pequeno laboratório e uma loja em São Paulo. A Natura virou uma das maiores empresas de cosméticos do mundo.",
    },
    licao: "Ele tinha uma ideia clara do que a marca representava. Nós também: silêncio que vira estilo.",
    versiculo: { texto: "O reino dos céus é semelhante a um grão de mostarda: é a menor de todas as sementes, mas, depois de crescer, é a maior das hortaliças.", ref: "Mateus 13:31-32" },
    chamada: "Hoje: leia a página Sobre do nosso site e sugira o que melhorar.",
  },
  {
    assunto: "Não tem volta",
    titulo: "O caminho que só tem uma direção",
    abertura:
      "Já repararam até onde chegamos? Nome, símbolo, site, pagamento, frete, aplicativo, caixa e as contas de cada sócio. Isso não é começo de quem vai parar. É começo de quem vai longe.",
    historia: {
      quem: "Todas as marcas que vocês leram até aqui",
      texto:
        "Nike, Chanel, Apple, IKEA, Zara, Gucci, Reserva, Gymshark. Nenhuma começou grande. Todas começaram com poucos sócios, pouco dinheiro e uma decisão: não voltar atrás.",
    },
    licao: "A decisão já foi tomada. Agora é execução, todos os dias, até as vendas virarem rotina.",
    versiculo: { texto: "Prossigo para o alvo, para o prêmio.", ref: "Filipenses 3:14" },
    chamada: "Hoje: diga para os sócios qual é a sua parte nesta semana.",
  },
  {
    assunto: "Tinham ânimo para trabalhar",
    titulo: "O muro subiu porque o povo quis",
    abertura: "Grandes obras ficam prontas quando cada um pega a sua parte do muro.",
    historia: {
      quem: "Neemias · Jerusalém",
      texto:
        "Quando Neemias decidiu reconstruir os muros de Jerusalém, cada família levantou a parte que ficava em frente à própria casa. Com todos trabalhando ao mesmo tempo, o muro ficou pronto em 52 dias.",
    },
    licao: "Cada sócio com a sua parte: fotos, lançamentos, divulgação, vendas. Quando todos levantam a sua parte, a obra fica pronta rápido.",
    versiculo: { texto: "Assim edificamos o muro, porque o povo tinha ânimo para trabalhar.", ref: "Neemias 4:6" },
    chamada: "Hoje: escolha uma tarefa da empresa e assuma ela até o fim.",
  },
];
