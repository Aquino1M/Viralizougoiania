import type { ImportedNews, Post } from "@/lib/types";

export type EditorialCategory =
  | "Goiânia"
  | "Bairros"
  | "Trânsito"
  | "Segurança"
  | "Política"
  | "Empregos"
  | "Esportes"
  | "Eventos"
  | "Economia"
  | "Serviços"
  | "Futebol"
  | "Fofocas";

export type CategoryInput = Pick<
  Partial<Post & ImportedNews>,
  "title" | "excerpt" | "content" | "category" | "source_name" | "source_url" | "author" | "city"
>;

export function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFFFD/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hit(text: string, re: RegExp) {
  return re.test(text);
}

// Fontes 100% goianas
const GOIAS_SOURCES_REGEX =
  /a reda[cç][aã]o|aredacao\.com\.br|di[aá]rio de goi[aá]s|diariodegoias\.com\.br|curta mais|curtamais\.com\.br|dia online|diaonline\.ig\.com\.br|metr[oó]poles goi[aá]s|entorno e goi[aá]s|goi[aá]s 24 horas|goias24horas\.com\.br|g1 > goi[aá]s|g1 goi[aá]s|g1\.globo\.com\/go\/goias|ge goi[aá]s|portal 6|portal6\.com\.br|jornal op[cç][aã]o|mais goi[aá]s|o popular/i;

// Bairros e setores de Goiânia
export const GOIANIA_BAIRROS_REGEX =
  /\b(setor bueno|setor marista|setor oeste|setor central|centro de goiania|setor universitario|setor coimbra|setor sul|jardim goias|negrao de lima|vila viana|vila nova|setor nova vila|setor pedro ludovico|campinas|urias magalhaes|parque amazonia|jardim america|setor bela vista|setor eldorado|parque das laranjeiras|vila redencao|jardim atlantico|vila itatiaia|goiania 2|goiania ii|faicalville|setor sudoeste|setor jao|bairro feliz|setor aeroporto|cidade jardim|vila alpes|vila uniao|parque oeste industrial|vila vera cruz|jardim presidente|jardim curitiba|vila mutirao|regiao noroeste|regiao leste|regiao norte|parque vaca brava|parque flamboyant|parque areiao|bosque dos buritis|lago das rosas|parque cascavel)\b/i;

// Cidades e termos de Goiás
export const GOIAS_TERMS_REGEX =
  /\b(goiania|goianiense|goianienses|goias|goiano|goiana|goianos|goianas|aparecida de goiania|anapolis|rio verde|jatai|caldas novas|trindade|senador canedo|catalao|itumbiara|aguas lindas|valparaiso de goias|valparaiso|luziania|formosa|goianesia|morrinhos|ceres|rialma|pirenopolis|cidade de goias|mineiros|cristalina|inhumas|porangatu|jaragua|niquelandia|posse|santa helena de goias|ipora|sao luis de montes belos|palmeiras de goias|uruacu|planaltina de goias|santo antonio do descoberto|novo gama|bela vista de goias|alexania|hidrolandia|piracanjuba|guapo|neropolis|goianira|abadia de goias|silvania|ipameri|vianopolis|quirinopolis|crixas|arauana|chapada dos veadeiros|alto paraiso|caiado|ronaldo caiado|gracinha caiado|daniel vilela|sandro mabel|rogerio cruz|maguito|iris rezende|prefeitura de goiania|governo de goias|paco municipal|alego|tjgo|mpgo|pmgo|pcgo|goinfra|saneago|equatorial goias|metrobus|eixo anhanguera|vila nova|goias ec|goias e\.c|atletico-go|atletico goianiense|goiania ec|goianatur|goianiatur|serra dourada|antonio accioly|estadio da serrinha|onesio brasileiro)\b/i;

// Detecta se a matéria é genuinamente de Goiás / Goiânia
export function isGoiasOrigin(input: CategoryInput): boolean {
  const sourceName = input.source_name || "";
  const sourceUrl = input.source_url || "";
  if (GOIAS_SOURCES_REGEX.test(sourceName) || GOIAS_SOURCES_REGEX.test(sourceUrl)) {
    return true;
  }

  const text = normalize(
    `${input.title || ""} ${input.excerpt || ""} ${input.source_url || ""} ${input.city || ""}`
  );

  return GOIAS_TERMS_REGEX.test(text) || GOIANIA_BAIRROS_REGEX.test(text);
}

// Localização inteligente
export function inferLocation(input: CategoryInput): {
  city: string;
  isGoias: boolean;
  isGoiania: boolean;
  isBairro: boolean;
} {
  const isGoias = isGoiasOrigin(input);
  const titleAndExcerpt = normalize(`${input.title || ""} ${input.excerpt || ""}`);

  // Se for de Goiás
  if (isGoias) {
    // Checa se é um bairro específico de Goiânia
    const bairroMatch = titleAndExcerpt.match(GOIANIA_BAIRROS_REGEX);
    if (bairroMatch) {
      const bName = bairroMatch[0];
      const capBairro = bName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return { city: capBairro, isGoias: true, isGoiania: true, isBairro: true };
    }

    // Checa cidades vizinhas do interior ou região metropolitana de Goiás
    if (/\b(aparecida de goiania|aparecida)\b/.test(titleAndExcerpt)) return { city: "Aparecida de Goiânia", isGoias: true, isGoiania: false, isBairro: false };
    if (/\banapolis\b/.test(titleAndExcerpt)) return { city: "Anápolis", isGoias: true, isGoiania: false, isBairro: false };
    if (/\brio verde\b/.test(titleAndExcerpt)) return { city: "Rio Verde", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bjatai\b/.test(titleAndExcerpt)) return { city: "Jataí", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bcaldas novas\b/.test(titleAndExcerpt)) return { city: "Caldas Novas", isGoias: true, isGoiania: false, isBairro: false };
    if (/\btrindade\b/.test(titleAndExcerpt)) return { city: "Trindade", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bsenador canedo\b/.test(titleAndExcerpt)) return { city: "Senador Canedo", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bitumbiara\b/.test(titleAndExcerpt)) return { city: "Itumbiara", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bcatalao\b/.test(titleAndExcerpt)) return { city: "Catalão", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bformosa\b/.test(titleAndExcerpt)) return { city: "Formosa", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bluziania\b/.test(titleAndExcerpt)) return { city: "Luziânia", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bvalparaiso\b/.test(titleAndExcerpt)) return { city: "Valparaíso", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bpirenopolis\b/.test(titleAndExcerpt)) return { city: "Pirenópolis", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bgoianesia\b/.test(titleAndExcerpt)) return { city: "Goianésia", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bmorrinhos\b/.test(titleAndExcerpt)) return { city: "Morrinhos", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bporangatu\b/.test(titleAndExcerpt)) return { city: "Porangatu", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bjaragua\b/.test(titleAndExcerpt)) return { city: "Jaraguá", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bnovo gama\b/.test(titleAndExcerpt)) return { city: "Novo Gama", isGoias: true, isGoiania: false, isBairro: false };
    if (/\baguas lindas\b/.test(titleAndExcerpt)) return { city: "Águas Lindas", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bcristalina\b/.test(titleAndExcerpt)) return { city: "Cristalina", isGoias: true, isGoiania: false, isBairro: false };
    if (/\binhumas\b/.test(titleAndExcerpt)) return { city: "Inhumas", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bceres\b|\brialma\b/.test(titleAndExcerpt)) return { city: "Ceres", isGoias: true, isGoiania: false, isBairro: false };
    if (/\bchapada dos veadeiros\b|\balto paraiso\b/.test(titleAndExcerpt)) return { city: "Alto Paraíso", isGoias: true, isGoiania: false, isBairro: false };

    // Se mencionar explicitamente Goiânia ou a capital
    if (/\b(goiania|goianiense|goianienses|capital goiana|paco municipal|prefeitura de goiania|paço municipal)\b/.test(titleAndExcerpt)) {
      return { city: "Goiânia", isGoias: true, isGoiania: true, isBairro: false };
    }

    // REGRA DE OURO DO PORTAL: Se é de Goiás mas não é especificamente de Goiânia, a tag OBRIGATORIAMENTE É "Goiás"!
    return { city: "Goiás", isGoias: true, isGoiania: false, isBairro: false };
  }

  // Notícia Nacional ou Internacional: NUNCA usar "Goiânia" nem "Goiás"
  if (/\b(belo horizonte|metro de bh|minas gerais|bh)\b/.test(titleAndExcerpt)) return { city: "Belo Horizonte", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(sao paulo|capital paulista|sp)\b/.test(titleAndExcerpt)) return { city: "São Paulo", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(rio de janeiro|rj)\b/.test(titleAndExcerpt)) return { city: "Rio de Janeiro", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(brasilia|distrito federal|df|stf|congresso nacional)\b/.test(titleAndExcerpt)) return { city: "Brasília", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(curitiba|parana)\b/.test(titleAndExcerpt)) return { city: "Paraná", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(porto alegre|rio grande do sul|gaucho|gaucha)\b/.test(titleAndExcerpt)) return { city: "Rio Grande do Sul", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(santarem|para|belem)\b/.test(titleAndExcerpt)) return { city: "Pará", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(salvador|bahia)\b/.test(titleAndExcerpt)) return { city: "Bahia", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(recife|pernambuco)\b/.test(titleAndExcerpt)) return { city: "Pernambuco", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(fortaleza|ceara)\b/.test(titleAndExcerpt)) return { city: "Ceará", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(manaus|amazonas)\b/.test(titleAndExcerpt)) return { city: "Amazonas", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(cuiaba|mato grosso)\b/.test(titleAndExcerpt)) return { city: "Mato Grosso", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(campo grande|ms)\b/.test(titleAndExcerpt)) return { city: "Mato Grosso do Sul", isGoias: false, isGoiania: false, isBairro: false };

  // Internacional
  if (/\b(trump|biden|eua|estados unidos|florida|nova york|washington)\b/.test(titleAndExcerpt)) return { city: "Estados Unidos", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(ucrania|russia|putin|zelensky)\b/.test(titleAndExcerpt)) return { city: "Mundo", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(xangai|china|pequim)\b/.test(titleAndExcerpt)) return { city: "Xangai", isGoias: false, isGoiania: false, isBairro: false };
  if (/\b(champions|europa|espanha|inglaterra|madrid|londres|paris|alemanha|berlim)\b/.test(titleAndExcerpt)) return { city: "Europa", isGoias: false, isGoiania: false, isBairro: false };

  return { city: "Brasil", isGoias: false, isGoiania: false, isBairro: false };
}

function dedicatedVertical(sourceName = "", sourceUrl = "", title = ""): EditorialCategory | null {
  const source = normalize(sourceName + " " + sourceUrl);
  const normTitle = normalize(title);

  if (
    /portal leo ?dias|portalleodias|metropoles celebridades|celebridades .*metropoles|revista quem|(^|\s)quem(\s|$)|hugo gloss|uol entretenimento|uol famosos|uol splash|ofuxico|a fazenda|\/celebridades\//.test(
      source
    )
  ) {
    return "Fofocas";
  }

  // Se for feed esportivo mas o título for outros esportes (tênis, motogp, f1), vai para Esportes
  if (
    hit(normTitle, /\b(tenis|xangai|us open|wimbledon|roland garros|alcaraz|djokovic|jodar|tirante|medvedev|aliassime|motogp|marquez|gp da|f1|formula 1|formula 2|nfl|basquete|nba|volei|atletismo)\b/)
  ) {
    return "Esportes";
  }

  if (
    /ge brasileirao|ge futebol|ge goias|ge\.globo|gazeta esportiva|metropoles futebol|lance\.com|lance futebol|lance brasileirao|\/futebol\/|\/brasileirao/.test(
      source
    )
  ) {
    return "Futebol";
  }

  return null;
}

function add(scores: Record<EditorialCategory, number>, category: EditorialCategory, points: number) {
  scores[category] += points;
}

export function classifyEditorial(input: CategoryInput): EditorialCategory {
  const title = normalize(input.title || "");
  const excerpt = normalize(input.excerpt || "");
  const sourceName = input.source_name || "";
  const sourceUrl = input.source_url || "";
  const source = normalize(sourceName + " " + sourceUrl);
  const isGoias = isGoiasOrigin(input);

  const vertical = dedicatedVertical(sourceName, sourceUrl, input.title || "");
  if (vertical) return vertical;

  const scores: Record<EditorialCategory, number> = {
    Goiânia: 0,
    Bairros: 0,
    Trânsito: 0,
    Segurança: 0,
    Política: 0,
    Empregos: 0,
    Esportes: 0,
    Eventos: 0,
    Economia: 0,
    Serviços: 0,
    Futebol: 0,
    Fofocas: 0,
  };

  // Se a matéria for genuinamente goiana, Goiânia começa com pontuação base
  if (isGoias) {
    scores["Goiânia"] = 15;
  }

  // Ajuda por editoria declarada na fonte
  if (/g1\s*>\s*politica|g1 politica|\/politica\//.test(source)) add(scores, "Política", 30);
  if (/g1\s*>\s*economia|g1 economia|\/economia\//.test(source)) add(scores, "Economia", 30);

  // Empregos
  if (
    hit(
      title,
      /\b(vaga|vagas|emprego|empregos|concurso|concursos|processo seletivo|oportunidades? de trabalho|contratacao|contrata|salarios? de ate|edital|estagio|trainee)\b/
    )
  ) {
    add(scores, "Empregos", 60);
  }

  // Futebol
  if (
    hit(
      title,
      /\b(futebol|brasileirao|serie a|serie b|copa do brasil|libertadores|sul-americana|cbf|amistoso|amistosos|selecao brasileira|ancelotti|mercado da bola|campeonato goiano|escalacao|escalacoes|onde assistir|gol|gols|goleiro|tecnico|torcida|partida|clubes paulistas|palmeiras|flamengo|corinthians|sao paulo|santos|botafogo|vasco|fluminense|gremio|internacional|cruzeiro|atletico-mg|atletico-go|atletico goianiense|goias ec|goias e\.c|vila nova|bragantino|bahia|fortaleza|juventude|cuiaba|criciuma|arrascaeta|raphinha|bruno guimaraes|adson batista|paulo vitor|champions league|real madrid|barcelona|manchester|liverpool|bayern|chelsea|juventus)\b/
    )
  ) {
    add(scores, "Futebol", 75);
  }

  // Esportes gerais (não futebol)
  if (
    hit(
      title,
      /\b(volei|basquete|tenis|tênis|masters 1000|atletismo|corrida|maratona|mma|ufc|formula 1|f1|f2|motogp|sprint|gp da|natacao|olimpiad|ginastica|mister olympia|nfl|cesar cielo|alcaraz|djokovic|jodar|tirante|medvedev|aliassime)\b/
    )
  ) {
    add(scores, "Esportes", 70);
  }

  // Trânsito
  const explicitTraffic = hit(
    title,
    /\b(transito|engarraf|interdi[cç]|bloqueio|desvio|semaforo|ciclovia|pedagio|recapeamento|asfalto|fluidez|eixo viario|obra viaria|obras na rodovia|obras na via|marginal botafogo|marginal cascavel|perimetral norte|eixo anhanguera)\b/
  );
  const crash = hit(
    title,
    /\b(acidente|colisao|batida|capot|atropel|sai da pista|tomba|tombamento|engavetamento)\b/
  );
  const roadOrVehicle = hit(
    title,
    /\b(rodovia|rodovias|br-\d+|go-\d+|avenida|rua|via |pista|cruzamento|motorista|carreta|caminhao|ciclista|moto|carro|onibus)\b/
  );
  if (explicitTraffic) add(scores, "Trânsito", 50);
  if (crash && roadOrVehicle) add(scores, "Trânsito", 45);
  else if (crash) add(scores, "Trânsito", 28);

  // Segurança (crimes, polícia, tragédias, quedas de avião, desastres naturais)
  if (
    hit(
      title,
      /\b(policia|policia federal|pf |pcdf|pmgo|pcgo|preso|presa|prisao|crime|homicidio|assassinad[oa]s?|assassinato|matar|morte|morre|morto|morta|mortos|balead[oa]s?|tiroteio|assaltad[oa]s?|assalto|roubo|furto|delegacia|suspeito|arma|trafico|drogas|maconha|mandado|feminicidio|estupro|agredid[oa]s?|agressao|tortura|sequestro|golpe|estelionato|pcc|operacao policial|apreendid[oa]s?|apreensao|corpo encontrado|corpo carbonizado|incendio|explosao|bombeiros|queda de aviao|aviao monomotor|queda de aeronave|acidente aereo|desastre|temporal|temporais|arranca telhado|destruicao|furacao|estado de emergencia|inundacao|alagamento|desabamento)\b/
    )
  ) {
    add(scores, "Segurança", 55);
  }
  if (hit(title, /\b(pega fogo|em chamas|queimado|queimada|carbonizado|carbonizada)\b/)) {
    add(scores, "Segurança", 45);
  }

  // Política (local, nacional e internacional)
  if (
    hit(
      title,
      /\b(eleicao|eleicoes|candidato|candidata|candidatura|campanha eleitoral|prefeito|vereador|deputado|deputada|governador|assembleia|senado|senador|presidencia|presidenciavel|datafolha|atlasintel|quaest|tse|tre-go|stf|stj|congresso|camara dos deputados|partido|debate eleitoral|caiado|daniel vilela|marconi|sandro mabel|rogerio cruz|lula|bolsonaro|flavio bolsonaro|gilmar|moraes|fachin|pavanato|trump|putin|biden|ucrania|zelensky|acordo|diplomata|onu|ministro|ministerio|camara municipal|mpf|governo)\b/
    )
  ) {
    add(scores, "Política", 75);
  }

  // Economia
  if (
    hit(
      title,
      /\b(dolar|inflacao|ipca|selic|juros|pix|banco central|credito|ibovespa|petroleo|combustiveis|diesel|gasolina|economia|empresa|empresas|comercio|varejo|negocio|negocios|investimento|imposto|impostos|pib|safra|agronegocio|agro|tarifa|tarifas|salario minimo|correios|pobreza|industria|importacao|exportacao|mei|mega-sena|loteria|inadimplencia|divida|endividamento|tributaria|tributario|carro eletrico|leilao|leiloes|lances|arremata)\b/
    )
  ) {
    add(scores, "Economia", 50);
  }

  // Serviços e Utilidade Pública (saúde, dicas, educação, previsão do tempo)
  if (
    hit(
      title,
      /\b(vacina|vacinacao|saude|sus|hospital|upa|ambulancia|energia|conta de luz|agua|saneamento|cnh|ipva|iptu|educacao|escola|universidade|ufg|matricula|beneficio|servico|servicos|atendimento|curso|cursos|temperatura|onda de calor|previsao do tempo|inmet|clima|chimarrao|bacterias|mofo|veja como|como limpar|dicas|faculdade|diploma|estudo)\b/
    )
  ) {
    add(scores, "Serviços", 52);
  }

  // Eventos e Cultura
  if (
    hit(
      title,
      /\b(show|festival|feira|teatro|cinema|concerto|programacao|agenda cultural|ingresso|ingressos|exposicao|gastronomia|rodeio|carnaval|apresentacao|turne|mostra|espetaculo|expo|forum cultural|exposi[cç][aã]o)\b/
    )
  ) {
    add(scores, "Eventos", 40);
  }

  // Fofocas e Celebridades
  if (
    hit(
      title,
      /\b(atriz|ator|cantor|cantora|sertanejo|celebridade|famoso|famosa|influenciador|influenciadora|namoro|separacao|divorcio|gravidez|gestante|bastidores|reality|bbb|a fazenda|novela|polemica|ensaio|gloria pires|viviane araujo|paolla oliveira|bruna biancardi|virginia fonseca|ze felipe|gusttavo lima|anitta|neymar|leonardo|ticiane|preta gil|luana piovani|tais araujo|poliana rocha|oruam|taylor swift|madonna|bts|luan santana|murilo huff|gabriela versiani)\b/
    )
  ) {
    add(scores, "Fofocas", 50);
  }

  // Bairros: APENAS se for de Goiás e citar um bairro/setor ou melhorias de bairro
  if (isGoias) {
    const hasBairro = GOIANIA_BAIRROS_REGEX.test(title) || GOIANIA_BAIRROS_REGEX.test(excerpt);
    const hasNeighborhoodIssue = hit(
      title,
      /\b(bairro|bairros|setor|setores|recapeamento|asfalto novo|obras no setor|moradores do|praca do|limpeza no bairro|iluminacao no bairro|posto de saude do)\b/
    );
    if (hasBairro && hasNeighborhoodIssue) {
      add(scores, "Bairros", 80);
    } else if (hasBairro) {
      add(scores, "Bairros", 50);
    } else if (hasNeighborhoodIssue) {
      add(scores, "Bairros", 35);
    }
  }

  // Resumo como apoio leve
  if (/\b(famoso|famosa|celebridade|reality|novela)\b/.test(excerpt)) add(scores, "Fofocas", 5);
  if (/\b(brasileirao|futebol|libertadores|copa do brasil)\b/.test(excerpt)) add(scores, "Futebol", 5);
  if (/\b(eleicao|candidato|stf|congresso)\b/.test(excerpt)) add(scores, "Política", 5);

  // Ordem de desempate
  const priorityGoias: EditorialCategory[] = [
    "Bairros",
    "Trânsito",
    "Segurança",
    "Política",
    "Empregos",
    "Eventos",
    "Economia",
    "Serviços",
    "Fofocas",
    "Futebol",
    "Esportes",
    "Goiânia",
  ];

  // Se NÃO for de Goiás, APENAS 5 ABAS SÃO PERMITIDAS CONFORME A REGRA EDITORIAL:
  // Política, Esportes, Economia, Futebol e Fofocas (assuntos gerais/variedades/virais).
  // Todas as demais abas (Goiânia, Bairros, Trânsito, Segurança, Empregos, Eventos, Serviços) são 100% locais de Goiânia e Goiás!
  const priorityNacional: EditorialCategory[] = [
    "Política",
    "Economia",
    "Futebol",
    "Esportes",
    "Fofocas",
  ];

  if (isGoias) {
    let winner: EditorialCategory = "Goiânia";
    let best = scores[winner];
    for (const category of priorityGoias) {
      const val = scores[category];
      if (val > best) {
        best = val;
        winner = category;
      }
    }
    return winner;
  }

  // Se NÃO for de Goiás, só escolhe entre as 5 abas gerais permitidas:
  let winner: EditorialCategory = "Fofocas";
  let best = 0;
  for (const category of priorityNacional) {
    const val = scores[category];
    if (val > best) {
      best = val;
      winner = category;
    }
  }

  // Fallback seguro para matérias nacionais/internacionais
  if (best === 0) {
    if (hit(title, /\b(governo|autoridade|justica|lei|tribunal|relatorio|decisao|posse|acordo|diplomacia|stf|congresso|lula|bolsonaro)\b/)) return "Política";
    if (hit(title, /\b(preco|mercado|venda|compra|dinheiro|taxa|imposto|banco|dolar|lucro|bilhao|milhao|safra)\b/)) return "Economia";
    if (hit(title, /\b(futebol|campeonato|jogo|gol|time|selecao)\b/)) return "Futebol";
    if (hit(title, /\b(esporte|tenis|atleta|corrida|nfl|nba|f1)\b/)) return "Esportes";
    // O usuário definiu: "FOFOCAS QUE PODE ENTRAR ASSUNTOS EM GERAL"
    return "Fofocas";
  }

  return winner;
}

export function normalizePostCategory(post: Post): Post {
  const isGoias = isGoiasOrigin(post);
  const location = inferLocation(post);
  const correctCategory = classifyEditorial(post);

  let updatedCity = location.city;
  if (post.city === "Goiânia" && !location.isGoiania) {
    updatedCity = location.city;
  } else if (!post.city || (post.city === "Goiânia" && !isGoias)) {
    updatedCity = location.city;
  }

  return {
    ...post,
    category: correctCategory,
    city: updatedCity || (isGoias ? "Goiás" : "Brasil"),
  };
}

export function normalizeImportedCategory(item: ImportedNews, forcedCategory?: string): ImportedNews {
  if (forcedCategory === "Futebol" || forcedCategory === "Fofocas") {
    return { ...item, category: forcedCategory };
  }
  return { ...item, category: classifyEditorial(item) };
}
