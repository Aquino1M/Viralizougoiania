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

type CategoryInput = Pick<Partial<Post & ImportedNews>,
  "title" | "excerpt" | "content" | "category" | "source_name" | "source_url" | "author"
>;

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/�/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sourceVertical(sourceName = "", sourceUrl = ""): EditorialCategory | null {
  const source = normalize(sourceName + " " + sourceUrl);

  if (
    /portal leo ?dias|portal leo dias|portalleodias|metropoles celebridades|celebridades .*metropoles|revista quem|\bquem\b|hugo gloss|uol entretenimento|uol famosos|uol splash|ofuxico|a fazenda|famosos/.test(source)
  ) return "Fofocas";

  if (
    /ge brasileirao|ge futebol|ge goias|ge\.globo|gazeta esportiva|uol esporte|metropoles futebol|lance\.com|lance futebol|lance brasileirao/.test(source)
  ) return "Futebol";

  return null;
}

function has(title: string, re: RegExp) {
  return re.test(title);
}

export function classifyEditorial(input: CategoryInput): EditorialCategory {
  const title = normalize(input.title || "");
  const excerpt = normalize(input.excerpt || "");
  const sourceName = input.source_name || "";
  const sourceUrl = input.source_url || "";
  const source = normalize(sourceName + " " + sourceUrl);

  const vertical = sourceVertical(sourceName, sourceUrl);
  if (vertical) return vertical;

  // Empregos: somente sinais explícitos no título.
  if (has(title, /\b(vaga|vagas|emprego|empregos|concurso|concursos|processo seletivo|oportunidades? de trabalho|contratacao|contrata|salarios? de ate|edital)\b/)) {
    return "Empregos";
  }

  // Futebol: clubes, competições, seleção, escalações e linguagem típica de partida.
  if (
    has(title, /\b(futebol|brasileirao|serie a|serie b|copa do brasil|libertadores|sul-americana|cbf|amistoso|amistosos|selecao brasileira|anelotti|ancelotti|mercado da bola|campeonato goiano|escalacao|escalacoes|onde assistir|gol|gols|goleiro|tecnico|torcida|partida|palmeiras|flamengo|corinthians|sao paulo|santos|botafogo|vasco|fluminense|gremio|internacional|cruzeiro|atletico-mg|atletico-go|atletico goianiense|goias ec|goias e\.c|vila nova|bragantino|bahia|fortaleza|juventude|cuiaba|criciuma|arrascaeta|raphinha|bruno guimaraes)\b/)
  ) return "Futebol";

  // Outros esportes.
  if (has(title, /\b(volei|basquete|tenis|atletismo|corrida|maratona|mma|ufc|formula 1|\bf1\b|natacao|olimpiad|ginastica|mister olympia|nfl|f2)\b/)) {
    return "Esportes";
  }

  // Trânsito: exige ocorrência/mobilidade viária; citar uma BR sozinho não basta.
  if (
    has(title, /\b(transito|engarraf|interdi[cç]|bloqueio|desvio|recapeamento|asfalto|semaforo|ciclovia|cruzamento|pedagio|acidente|colisao|batida|capot|atropel|motorista|carreta|caminhao|ciclista)\b/) ||
    (has(title, /\b(br-\d+|go-\d+|rodovia|rodovias|pista)\b/) && has(title, /\b(acidente|morre|morto|ferido|colisao|batida|capot|interdi[cç]|obras|bloqueio|transito)\b/))
  ) return "Trânsito";

  // Segurança: crime, violência, investigação, resgate/incêndio relevantes.
  if (
    has(title, /\b(policia|pcdf|pmgo|preso|presa|prisao|crime|homicidio|assassin|matar|morto a tiros|mortos a tiros|balead|tiroteio|assalt|roubo|furto|delegacia|suspeito|arma|trafico|drogas|mandado|feminicidio|estupro|agressao|tortura|sequestro|golpe|estelionato|pcc|operacao policial|apreende|apreensao|corpo encontrado|corpo carbonizado|incendio|explosao)\b/)
  ) return "Segurança";

  // Política: eleições, candidatos, agentes e instituições públicas.
  if (
    has(title, /\b(prefeito|prefeitura|vereador|camara|deputado|deputada|governador|governo de goias|assembleia|eleicao|eleicoes|candidato|candidata|senado|senador|datafolha|quaest|tse|stf|congresso|ministro|ministerio|partido|debate|caiado|daniel vilela|marconi|lula|bolsonaro)\b/)
  ) return "Política";
  if (/g1\s*>\s*politica|\/politica\//.test(source)) return "Política";

  // Economia.
  if (
    has(title, /\b(dolar|inflacao|ipca|selic|juros|pix|banco central|banco|credito|mercado|ibovespa|petroleo|combustiveis|preco|precos|economia|empresa|empresas|comercio|varejo|negocio|negocios|investimento|imposto|impostos|pib|safra|agronegocio|agro|tarifa|tarifas|salario minimo|correios|pobreza|industria|importacao|exportacao|mei|mega-sena|loteria|premio)\b/)
  ) return "Economia";
  if (/g1\s*>\s*economia|\/economia\//.test(source)) return "Economia";

  // Serviços / utilidade pública.
  if (
    has(title, /\b(vacina|vacinacao|saude|sus|hospital|upa|energia|conta de luz|agua|abastecimento|saneamento|cnh|ipva|iptu|educacao|escola|universidade|ufg|matricula|beneficio|direitos|servico|servicos|atendimento|curso gratuito|cursos gratuitos|sindrome respiratoria|temperatura|onda de calor|previsao do tempo|inmet)\b/)
  ) return "Serviços";

  // Eventos e cultura programada.
  if (
    has(title, /\b(show|festival|feira|teatro|cinema|concerto|programacao|agenda cultural|ingresso|ingressos|exposicao|gastronomia|rodeio|carnaval|apresentacao|turne|premiacao)\b/)
  ) return "Eventos";

  // Fofocas em fontes gerais.
  if (
    has(title, /\b(atriz|ator|cantor|cantora|sertanejo|celebridade|famoso|famosa|influenciador|influenciadora|namoro|separacao|divorcio|gravidez|gestante|bastidores|reality|bbb|a fazenda|novela|polemica|ensaio|gloria pires|viviane araujo|paolla oliveira|bruna biancardi|virginia fonseca|ze felipe|gusttavo lima|anitta|neymar|leonardo|ticiane|preta gil|bruno gagliasso|luana piovani|tais araujo|poliana rocha|oruan|oruam)\b/)
  ) return "Fofocas";

  // Bairros: só quando a própria matéria trata de localidade/bairro.
  if (
    has(title, /\b(bairro|bairros|setor [a-z]|jardim [a-z]|vila [a-z]|parque [a-z]|residencial [a-z]|regiao noroeste|regiao leste|regiao sul|regiao norte|campinas|setor bueno|setor marista|setor oeste|setor universitario|setor coimbra)\b/)
  ) return "Bairros";

  // Se a manchete for muito genérica, usa apenas o resumo como desempate leve.
  if (/\b(famoso|famosa|celebridade|reality|novela)\b/.test(excerpt)) return "Fofocas";
  if (/\b(brasileirao|futebol|libertadores|copa do brasil)\b/.test(excerpt)) return "Futebol";

  return "Goiânia";
}

export function normalizePostCategory(post: Post): Post {
  if (!post.source_name && !post.source_url) return post;
  const category = classifyEditorial(post);
  return category === post.category ? post : { ...post, category };
}

export function normalizeImportedCategory(item: ImportedNews, forcedCategory?: string): ImportedNews {
  if (forcedCategory === "Futebol" || forcedCategory === "Fofocas") {
    return { ...item, category: forcedCategory };
  }
  return { ...item, category: classifyEditorial(item) };
}
