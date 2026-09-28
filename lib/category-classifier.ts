import type { ImportedNews, Post } from "@/lib/types";

export type EditorialCategory =
  | "Goiânia" | "Bairros" | "Trânsito" | "Segurança" | "Política" | "Empregos"
  | "Esportes" | "Eventos" | "Economia" | "Serviços" | "Futebol" | "Fofocas";

type CategoryInput = Pick<Partial<Post & ImportedNews>,
  "title" | "excerpt" | "content" | "category" | "source_name" | "source_url" | "author"
>;

function normalize(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/�/g, "").replace(/\s+/g, " ").trim();
}

function sourceVertical(source: string): EditorialCategory | null {
  if (/portal leo ?dias|portalleodias|metropoles celebridades|revista quem|quem acontece|hugo gloss|uol famosos|uol splash|ofuxico|celebridades\/feed|a fazenda/.test(source)) return "Fofocas";
  if (/ge brasileirao|ge futebol|ge goias|ge\.globo|gazeta esportiva|uol esporte|metropoles futebol|lance\.com/.test(source)) return "Futebol";
  return null;
}

export function classifyEditorial(input: CategoryInput): EditorialCategory {
  const title = normalize(input.title || "");
  const source = normalize((input.source_name || "") + " " + (input.source_url || ""));
  const vertical = sourceVertical(source);
  if (vertical) return vertical;

  if (/\b(vaga|vagas|emprego|empregos|concurso|concursos|processo seletivo|oportunidades? de trabalho|contratacao|contrata|salarios? de ate|edital)\b/.test(title)) return "Empregos";

  if (/\b(futebol|brasileirao|serie a|serie b|copa do brasil|libertadores|sul-americana|cbf|amistoso|selecao brasileira|mercado da bola|campeonato goiano|palmeiras|flamengo|corinthians|sao paulo|santos|botafogo|vasco|fluminense|gremio|internacional|cruzeiro|atletico-mg|atletico-go|atletico goianiense|goias ec|goias e\.c|vila nova|bragantino|bahia|fortaleza|juventude|cuiaba|criciuma)\b/.test(title)) return "Futebol";

  if (/\b(volei|basquete|tenis|atletismo|corrida|maratona|mma|ufc|formula 1|f1|natacao|olimpiad|ginastica|mister olympia)\b/.test(title)) return "Esportes";

  if (/\b(transito|rodovia|rodovias|br-\d+|go-\d+|acidente|colisao|batida|capot|atropel|engarraf|interdi[cç]|bloqueio|desvio|recapeamento|asfalto|semaforo|ciclovia|cruzamento|pista|pedagio|carreta|caminhao)\b/.test(title)) return "Trânsito";

  if (/\b(policia|pcdf|pmgo|preso|presa|prisao|crime|homicidio|assassin|matar|morto a tiros|mortos a tiros|balead|tiroteio|assalt|roubo|furto|delegacia|suspeito|arma|trafico|drogas|mandado|feminicidio|estupro|agressao|tortura|sequestro|golpe|estelionato|pcc|operacao policial|apreende|apreensao|corpo encontrado|corpo carbonizado)\b/.test(title)) return "Segurança";

  if (/\b(prefeito|prefeitura|vereador|camara|deputado|deputada|governador|governo de goias|assembleia|eleicao|eleicoes|candidato|candidata|senado|senador|datafolha|quaest|tse|stf|congresso|ministro|ministerio|partido|debate|caiado|daniel vilela|marconi)\b/.test(title)) return "Política";
  if (/g1\s*>\s*politica|\/politica\//.test(source)) return "Política";

  if (/\b(dolar|inflacao|ipca|selic|juros|pix|banco central|banco|credito|mercado|ibovespa|petroleo|combustiveis|preco|precos|economia|empresa|empresas|comercio|varejo|negocio|investimento|imposto|impostos|pib|safra|agronegocio|agro|tarifa|tarifas|salario minimo|greve dos correios|correios|pobreza|industria|importacao|exportacao)\b/.test(title)) return "Economia";
  if (/g1\s*>\s*economia|\/economia\//.test(source)) return "Economia";

  if (/\b(vacina|vacinacao|saude|sus|hospital|upa|energia|conta de luz|agua|saneamento|cnh|ipva|iptu|educacao|escola|universidade|ufg|matricula|beneficio|direitos|servico|servicos|atendimento|curso gratuito|cursos gratuitos|sindrome respiratoria)\b/.test(title)) return "Serviços";

  if (/\b(show|festival|feira|teatro|cinema|concerto|programacao|agenda cultural|ingresso|ingressos|exposicao|gastronomia|rodeio|carnaval|apresentacao)\b/.test(title)) return "Eventos";

  if (/\b(atriz|ator|cantor|cantora|sertanejo|celebridade|famoso|famosa|influenciador|influenciadora|namoro|separacao|divorcio|gravidez|gestante|bastidores|reality|bbb|a fazenda|novela|polemica|ensaio|gloria pires|paolla oliveira|bruna biancardi|virginia fonseca|ze felipe|gusttavo lima|anitta|neymar|leonardo)\b/.test(title)) return "Fofocas";

  if (/\b(bairro|bairros|setor [a-z]|jardim [a-z]|vila [a-z]|parque [a-z]|residencial [a-z]|regiao noroeste|regiao leste|regiao sul|regiao norte|campinas|setor bueno|setor marista|setor oeste|setor universitario)\b/.test(title)) return "Bairros";

  return "Goiânia";
}

export function normalizePostCategory<T extends Post>(post: T): T {
  if (!post.source_name && !post.source_url) return post;
  const category = classifyEditorial(post);
  return category === post.category ? post : { ...post, category };
}

export function normalizeImportedCategory<T extends ImportedNews>(item: T, forcedCategory?: string): T {
  if (forcedCategory === "Futebol" || forcedCategory === "Fofocas") return { ...item, category: forcedCategory };
  return { ...item, category: classifyEditorial(item) };
}
