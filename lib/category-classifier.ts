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

function dedicatedVertical(sourceName = "", sourceUrl = ""): EditorialCategory | null {
  const source = normalize(sourceName + " " + sourceUrl);

  if (
    /portal leo ?dias|portalleodias|metropoles celebridades|celebridades .*metropoles|revista quem|(^|\s)quem(\s|$)|hugo gloss|uol entretenimento|uol famosos|uol splash|ofuxico|a fazenda|\/celebridades\//.test(source)
  ) return "Fofocas";

  if (
    /ge brasileirao|ge futebol|ge goias|ge\.globo|gazeta esportiva|uol esporte|metropoles futebol|lance\.com|lance futebol|lance brasileirao|\/futebol\/|\/brasileirao/.test(source)
  ) return "Futebol";

  return null;
}

function add(scores: Record<EditorialCategory, number>, category: EditorialCategory, points: number) {
  scores[category] += points;
}

function hit(text: string, re: RegExp) {
  return re.test(text);
}

export function classifyEditorial(input: CategoryInput): EditorialCategory {
  const title = normalize(input.title || "");
  const excerpt = normalize(input.excerpt || "");
  const sourceName = input.source_name || "";
  const sourceUrl = input.source_url || "";
  const source = normalize(sourceName + " " + sourceUrl);

  const vertical = dedicatedVertical(sourceName, sourceUrl);
  if (vertical) return vertical;

  const scores: Record<EditorialCategory, number> = {
    "Goiânia": 1,
    "Bairros": 0,
    "Trânsito": 0,
    "Segurança": 0,
    "Política": 0,
    "Empregos": 0,
    "Esportes": 0,
    "Eventos": 0,
    "Economia": 0,
    "Serviços": 0,
    "Futebol": 0,
    "Fofocas": 0,
  };

  // Seções editoriais explícitas da fonte ajudam, mas não anulam um título claramente de outra editoria.
  if (/g1\s*>\s*politica|\/politica\//.test(source)) add(scores, "Política", 22);
  if (/g1\s*>\s*economia|\/economia\//.test(source)) add(scores, "Economia", 22);

  if (hit(title, /\b(vaga|vagas|emprego|empregos|concurso|concursos|processo seletivo|oportunidades? de trabalho|contratacao|contrata|salarios? de ate|edital)\b/)) add(scores, "Empregos", 34);

  if (hit(title, /\b(futebol|brasileirao|serie a|serie b|copa do brasil|libertadores|sul-americana|cbf|amistoso|amistosos|selecao brasileira|ancelotti|mercado da bola|campeonato goiano|escalacao|escalacoes|onde assistir|gol|gols|goleiro|tecnico|torcida|partida|clubes paulistas|palmeiras|flamengo|corinthians|sao paulo|santos|botafogo|vasco|fluminense|gremio|internacional|cruzeiro|atletico-mg|atletico-go|atletico goianiense|goias ec|goias e\.c|vila nova|bragantino|bahia|fortaleza|juventude|cuiaba|criciuma|arrascaeta|raphinha|bruno guimaraes|adson batista|paulo vitor)\b/)) add(scores, "Futebol", 32);

  if (hit(title, /\b(volei|basquete|tenis|atletismo|corrida|maratona|mma|ufc|formula 1|f1|f2|natacao|olimpiad|ginastica|mister olympia|nfl|cesar cielo)\b/)) add(scores, "Esportes", 32);

  const trafficIncident = hit(title, /\b(acidente|colisao|batida|capot|atropel|motorista|carreta|caminhao|ciclista|moto|carro)\b/);
  const roadContext = hit(title, /\b(transito|rodovia|rodovias|br-\d+|go-\d+|avenida|rua|via |pista|cruzamento|semaforo|ciclovia|pedagio|recapeamento|asfalto|engarraf|interdi[cç]|bloqueio|desvio)\b/);
  if (roadContext) add(scores, "Trânsito", 24);
  if (trafficIncident && roadContext) add(scores, "Trânsito", 18);
  else if (trafficIncident && hit(title, /\b(moto|carro|carreta|caminhao|ciclista|motorista)\b/)) add(scores, "Trânsito", 16);

  if (hit(title, /\b(policia|pcdf|pmgo|preso|presa|prisao|crime|homicidio|assassin|matar|balead|tiroteio|assalt|roubo|furto|delegacia|suspeito|arma|trafico|drogas|maconha|mandado|feminicidio|estupro|agressao|tortura|sequestro|golpe|estelionato|pcc|operacao policial|apreende|apreensao|corpo encontrado|corpo carbonizado|incendio|explosao|bombeiros|abus[oa] sexual|criminosos)\b/)) add(scores, "Segurança", 34);
  if (hit(title, /\b(pega fogo|em chamas|queimado|queimada|carbonizado|carbonizada)\b/)) add(scores, "Segurança", 25);
  if (hit(title, /\b(ex-namorado|ex-marido|de proposito)\b/) && hit(title, /\b(atropel|agred|amea[cç]|violencia)\b/)) add(scores, "Segurança", 28);

  if (hit(title, /\b(eleicao|eleicoes|candidato|candidata|candidatura|campanha eleitoral|prefeito|vereador|deputado|deputada|governador|assembleia|senado|senador|datafolha|quaest|tse|stf|congresso|partido|debate eleitoral|caiado|daniel vilela|marconi|lula|bolsonaro|gilmar|moraes)\b/)) add(scores, "Política", 30);
  if (hit(title, /\b(prefeitura|governo de goias|ministro|ministerio|camara municipal)\b/)) add(scores, "Política", 9);

  if (hit(title, /\b(dolar|inflacao|ipca|selic|juros|pix|banco central|credito|ibovespa|petroleo|combustiveis|economia|empresa|empresas|comercio|varejo|negocio|negocios|investimento|imposto|impostos|pib|safra|agronegocio|agro|tarifa|tarifas|salario minimo|correios|pobreza|industria|importacao|exportacao|mei|mega-sena|loteria|premio|tributaria|tributario)\b/)) add(scores, "Economia", 28);

  if (hit(title, /\b(vacina|vacinacao|saude|sus|hospital|upa|ambulancia|energia|conta de luz|agua|abastecimento|saneamento|cnh|ipva|iptu|educacao|escola|universidade|ufg|matricula|beneficio|servico|servicos|atendimento|curso gratuito|cursos gratuitos|sindrome respiratoria|temperatura|onda de calor|previsao do tempo|inmet|clima)\b/)) add(scores, "Serviços", 28);

  if (hit(title, /\b(show|festival|feira|teatro|cinema|concerto|programacao|agenda cultural|ingresso|ingressos|exposicao|gastronomia|rodeio|carnaval|apresentacao|apresenta-se|se apresenta|turne|mostra|espetaculo|forum|premiacao)\b/)) add(scores, "Eventos", 27);

  if (hit(title, /\b(atriz|ator|cantor|cantora|sertanejo|celebridade|famoso|famosa|influenciador|influenciadora|namoro|separacao|divorcio|gravidez|gestante|bastidores|reality|bbb|a fazenda|novela|polemica|ensaio|gloria pires|viviane araujo|paolla oliveira|bruna biancardi|virginia fonseca|ze felipe|gusttavo lima|anitta|neymar|leonardo|ticiane|preta gil|bruno gagliasso|luana piovani|tais araujo|poliana rocha|oruam|taylor swift|madonna|bts|blackpink|ricky martin|lindsay lohan|jennifer lopez|tom cruise|luan santana|carreta furacao)\b/)) add(scores, "Fofocas", 26);

  if (hit(title, /\b(bairro|bairros|setor [a-z]|jardim [a-z]|vila [a-z]|parque [a-z]|residencial [a-z]|regiao noroeste|regiao leste|regiao sul|regiao norte|campinas|setor bueno|setor marista|setor oeste|setor universitario|setor coimbra|negrao de lima|vila viana)\b/)) add(scores, "Bairros", 14);

  // Desempates pelo resumo, com peso baixo para não repetir o erro antigo de classificar pelo corpo inteiro.
  if (/\b(famoso|famosa|celebridade|reality|novela)\b/.test(excerpt)) add(scores, "Fofocas", 5);
  if (/\b(brasileirao|futebol|libertadores|copa do brasil)\b/.test(excerpt)) add(scores, "Futebol", 5);

  const priority: EditorialCategory[] = [
    "Fofocas","Futebol","Empregos","Segurança","Trânsito","Política","Economia","Serviços","Esportes","Eventos","Bairros","Goiânia"
  ];

  let winner: EditorialCategory = "Goiânia";
  let best = scores[winner];
  for (const category of priority) {
    const value = scores[category];
    if (value > best) {
      best = value;
      winner = category;
    }
  }
  return winner;
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
