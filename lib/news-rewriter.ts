
import type { RewriteResult } from "@/lib/types";

type RewriteInput = {
  source_name: string;
  source_url: string;
  source_author?: string;
  source_published_at?: string | null;
  source_content: string;
  source_title: string;
  source_excerpt?: string;
  article_section?: string;
  categories?: string[];
  source_complete?: boolean;
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function normalizedWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingleSet(value: string, size = 8) {
  const words = normalizedWords(value);
  const set = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) set.add(words.slice(i, i + size).join(" "));
  return set;
}

export function similarityRatio(source: string, rewritten: string) {
  const a = shingleSet(source, 8);
  const b = shingleSet(rewritten, 8);
  if (!b.size) return 0;
  let shared = 0;
  for (const item of b) if (a.has(item)) shared++;
  return shared / b.size;
}

function extractFactTokens(value: string) {
  const patterns = [
    /R\$\s?\d[\d.,]*/gi,
    /\b\d{1,3}(?:[.,]\d+)?%\b/g,
    /\b\d{1,3}\s?(?:anos?|meses?|dias?|horas?|minutos?)\b/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+\d{4})?\b/gi,
    /\b\d{2,}\b/g,
  ];

  const set = new Set<string>();
  for (const pattern of patterns) {
    const matches = value.match(pattern) || [];
    for (const m of matches) set.add(m.trim());
  }
  return Array.from(set).slice(0, 80);
}

function factWarnings(source: string, rewritten: string) {
  const sourceFacts = extractFactTokens(source);
  const normalizedRewrite = rewritten.toLocaleLowerCase("pt-BR");
  const missing = sourceFacts.filter((fact) => !normalizedRewrite.includes(fact.toLocaleLowerCase("pt-BR")));
  return missing.slice(0, 12).map((fact) => "Confira se o dado da fonte foi preservado: " + fact);
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

function parseJson(value: string) {
  const cleaned = value.trim()
    .replace(/^\x60\x60\x60json\s*/i, "")
    .replace(/^\x60\x60\x60\s*/, "")
    .replace(/\x60\x60\x60$/, "")
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("A IA não retornou um JSON válido.");
}

async function callModel(input: RewriteInput, attempt: number) {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Configure OPENAI_API_KEY na Vercel para usar o reescritor automático.");

  const model = (process.env.OPENAI_REWRITE_MODEL || "gpt-5.6-luna").trim();
  const categories = (input.categories || []).filter(Boolean);

  const instructions = [
    "Você é o reescritor editorial do portal Viralizougoiania, especializado em notícias de Goiânia e Goiás.",
    "Use o texto-fonte apenas como material de apuração.",
    "Escreva uma reportagem nova, completa e independente, cobrindo TODOS os fatos materiais, contexto, cronologia, números, locais e desdobramentos presentes na fonte.",
    "Não faça paráfrase frase a frase e não reproduza a estrutura do texto original.",
    "Não copie sequências longas do texto da fonte. Reorganize as informações e use redação própria.",
    "Não invente fatos. Não acrescente nomes, números, causas, motivações ou conclusões que não estejam na fonte.",
    "Declarações e alegações devem ser atribuídas quando a fonte as atribui.",
    "Citações diretas devem ser evitadas; quando forem necessárias, use apenas trechos curtos e essenciais.",
    "O texto deve ser jornalístico, claro, natural, em português do Brasil e dividido em parágrafos.",
    "O título deve ser original, sem copiar o título da fonte.",
    "O resumo deve ter de 1 a 3 frases.",
    "Escolha category somente entre as categorias fornecidas, quando houver.",
    "Responda SOMENTE com JSON válido com estas chaves: title, excerpt, content, category, city, seo_title, seo_description, seo_keywords.",
    "seo_keywords deve ser uma lista de strings.",
    attempt > 1 ? "A tentativa anterior ficou curta ou próxima demais da fonte. Reescreva com estrutura ainda mais diferente e cubra mais detalhes factuais." : "",
  ].filter(Boolean).join("\n");

  const sourcePacket = {
    source_name: input.source_name,
    source_url: input.source_url,
    source_author: input.source_author || "",
    source_published_at: input.source_published_at || "",
    source_title: input.source_title,
    source_excerpt: input.source_excerpt || "",
    article_section: input.article_section || "",
    categories,
    source_complete: input.source_complete !== false,
    source_word_count: countWords(input.source_content),
    source_content: input.source_content,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(90_000),
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(sourcePacket),
      max_output_tokens: 12000,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error("Falha no reescritor (" + response.status + "): " + detail);
  }

  const payload = await response.json();
  const parsed = parseJson(outputText(payload));

  return {
    title: String(parsed.title || "").trim(),
    excerpt: String(parsed.excerpt || "").trim(),
    content: String(parsed.content || "").trim(),
    category: String(parsed.category || categories[0] || "Goiânia").trim(),
    city: String(parsed.city || "Goiânia").trim(),
    seo_title: String(parsed.seo_title || parsed.title || "").trim(),
    seo_description: String(parsed.seo_description || parsed.excerpt || "").trim(),
    seo_keywords: Array.isArray(parsed.seo_keywords)
      ? parsed.seo_keywords.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 15)
      : [],
  };
}

export async function rewriteNews(input: RewriteInput): Promise<RewriteResult> {
  const sourceWords = countWords(input.source_content);
  if (sourceWords < 80) throw new Error("O corpo da matéria está curto demais para uma reescrita completa.");

  let last: Awaited<ReturnType<typeof callModel>> | null = null;
  let similarity = 0;
  let rewriteWords = 0;
  let completeness = 0;

  for (let attempt = 1; attempt <= 2; attempt++) {
    last = await callModel(input, attempt);
    if (!last.title || !last.excerpt || !last.content) throw new Error("A reescrita veio incompleta.");

    similarity = similarityRatio(input.source_content, last.content);
    rewriteWords = countWords(last.content);
    completeness = sourceWords ? rewriteWords / sourceWords : 0;

    if (similarity <= 0.08 && completeness >= 0.55) break;
  }

  if (!last) throw new Error("Não foi possível gerar a reescrita.");

  const warnings = factWarnings(input.source_content, last.content);
  if (input.source_complete === false) warnings.unshift("A captura da fonte foi marcada como possivelmente incompleta. Confira a página original antes de publicar.");
  if (similarity > 0.08) warnings.unshift("A versão ainda tem trechos muito próximos da fonte. Revise a redação antes de publicar.");
  if (completeness < 0.55) warnings.unshift("A versão ficou bem menor que a matéria-fonte. Confira se algum fato importante foi omitido.");

  return {
    ...last,
    similarity: Number(similarity.toFixed(4)),
    source_word_count: sourceWords,
    rewrite_word_count: rewriteWords,
    completeness_ratio: Number(completeness.toFixed(4)),
    warnings,
  };
}
