function cleanEditorialText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\s*(&hellip;|&#8230;|…|\.{3})\s*\]/gi, "")
    .replace(/(&hellip;|&#8230;)/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/✅\s*Clique e siga o canal[^\n.!?]*(?:WhatsApp)?/gi, "")
    .replace(/📱\s*Veja outras notícias[^\n.!?]*(?:\.|$)/gi, "")
    .replace(/VÍDEOS?\s*:\s*últimas notícias[^\n.!?]*(?:\.|$)/gi, "")
    .replace(/\bO post\s+.+?\s+(?:apareceu|foi publicado)\s+primeiro\s+em\s+[^\n.]+\.?/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function isBoilerplateLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower) return true;
  if (/^(?:foto|imagem|divulgação|reprodução)(?:\s*:|\/)/i.test(line)) return true;
  if (/^(?:leia|veja) também\s*:?$/i.test(line)) return true;
  if (/^agora no g1$/i.test(line)) return true;
  if (/^vídeos?\s*:/i.test(line)) return true;
  if (/^(?:✅|📱|🔔)/.test(line)) return true;
  if (lower.includes("todos os direitos reservados")) return true;
  if (lower.includes("inscreva-se no canal")) return true;
  if (lower.includes("clique e siga") || lower.includes("clique aqui")) return true;
  if (lower.includes("compartilhe no whatsapp") || lower.includes("compartilhe esta notícia")) return true;
  if (lower.includes("siga o canal do g1") || lower.includes("canal do g1 no whatsapp")) return true;
  if (lower.includes("fale com o g1") || lower.includes("veja outras notícias da região")) return true;
  if (/^o post .+ (?:apareceu|foi publicado) primeiro em /i.test(line)) return true;
  return false;
}

function splitLongParagraph(text: string): string[] {
  if (text.length <= 700) return [text];

  const sentences = text
    .split(/(?<=[.!?…”"])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ“])/u)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length < 2) {
    const chunks: string[] = [];
    let rest = text.trim();
    while (rest.length > 620) {
      let cut = rest.lastIndexOf(" ", 620);
      if (cut < 300) cut = 620;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  }

  const groups: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if ((current + " " + sentence).length <= 520) current += " " + sentence;
    else {
      groups.push(current);
      current = sentence;
    }
  }
  if (current) groups.push(current);
  return groups;
}

export function buildEditorialParagraphs(sourceText = ""): string[] {
  const source = cleanEditorialText(sourceText)
    .replace(/\bLEIA TAMBÉM\s*:\s*[\s\S]*?\bAgora no g1\b/gi, "\n")
    .replace(/\b(?:CONVOCAÇÃO|PRÓXIMO CONCURSO)\s*:\s*[^\n]+/gi, "\n");

  const lines = source.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const accepted: string[] = [];
  let skippingRelated = false;

  for (let line of lines) {
    if (/^(?:leia|veja) também\s*:?$/i.test(line)) {
      skippingRelated = true;
      continue;
    }

    if (skippingRelated) {
      const realParagraph = line.length >= 150 && /[.!?…”"]$/.test(line);
      if (!realParagraph) continue;
      skippingRelated = false;
    }

    line = line
      .replace(/\s+O post\s+.+?\s+(?:apareceu|foi publicado)\s+primeiro\s+em\s+[^.]+\.?$/i, "")
      .trim();

    if (isBoilerplateLine(line)) continue;
    if (line.length < 35 && !/[.!?]$/.test(line)) continue;

    for (const paragraph of splitLongParagraph(line)) {
      const p = paragraph.trim();
      if (p.length < 20 || isBoilerplateLine(p)) continue;
      accepted.push(p);
    }
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const paragraph of accepted) {
    const key = paragraph
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(paragraph);
  }
  return result;
}

export function buildEditorialExcerpt(text = "", fallback = "", maxLength = 240): string {
  const paragraphs = buildEditorialParagraphs(text);
  let base = paragraphs.find((p) => p.length >= 55) || paragraphs[0] || cleanEditorialText(fallback);
  base = base.replace(/\s+/g, " ").trim();
  if (!base) return "";
  if (base.length <= maxLength) return base;

  let cut = base.lastIndexOf(" ", maxLength);
  if (cut < Math.floor(maxLength * 0.65)) cut = maxLength;
  return base.slice(0, cut).trim().replace(/[,:;\-–—]+$/, "") + "…";
}

export function needsEditorialRepair(input: {
  excerpt?: string | null;
  content?: string | null;
  source_content?: string | null;
}): boolean {
  const excerpt = String(input.excerpt || "");
  const content = String(input.content || "");
  const joined = excerpt + "\n" + content;

  if (excerpt.length > 360) return true;
  if ((excerpt.match(/\n/g) || []).length >= 2) return true;
  if (/LEIA TAMBÉM|Clique e siga|Veja outras notícias|VÍDEOS?\s*:|O post .+ primeiro em/i.test(joined)) return true;

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (content.length > 700 && paragraphs.length <= 1) return true;
  return false;
}

export function formatViralizouArticle(params: {
  title: string;
  excerpt?: string;
  sourceText?: string;
  sourceName?: string;
  category?: string;
}): string {
  const { title, excerpt = "", sourceText = "" } = params;
  const paragraphs = buildEditorialParagraphs(sourceText || excerpt);
  if (paragraphs.length) return paragraphs.join("\n\n");

  return buildEditorialExcerpt(excerpt || title, title, 420) || cleanEditorialText(title);
}
