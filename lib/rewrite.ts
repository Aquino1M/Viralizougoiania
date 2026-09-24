function cleanEditorialText(text: string): string {
  if (!text) return "";
  let s = text
    // Remove entidades HTML e marcas de corte de WordPress como [&hellip;], [&#8230;], [...], […], etc.
    .replace(/\[\s*(&hellip;|&#8230;|…|\.{3})\s*\]/gi, "")
    .replace(/(&hellip;|&#8230;)/gi, "")
    .replace(/\[\s*\.\.\.\s*\]/g, "")
    .replace(/\[\s*…\s*\]/g, "")
    .replace(/\[\s*&nbsp;\s*\]/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove preposições ou conjunções órfãs deixadas no final de cortes abruptos
  s = s.replace(/\s+(de|da|do|das|dos|em|no|na|nos|nas|com|para|por|a|o|ao|aos|que|e)$/i, "");
  s = s.trim();

  // Garante fechamento correto da frase
  if (s && !/[.!?]$/.test(s)) {
    s += ".";
  }
  return s;
}

/**
 * Formata o texto bruto capturado da fonte em uma versão editorial limpa
 * e estruturada para publicação imediata no Viralizougoiania.
 */
export function formatViralizouArticle(params: {
  title: string;
  excerpt?: string;
  sourceText?: string;
  sourceName?: string;
}): string {
  const { title, excerpt = "", sourceText = "", sourceName = "" } = params;

  // Se o texto da fonte tiver parágrafos, limpa e organiza
  const rawParagraphs = sourceText
    .split(/\n\n+/)
    .map((p) => cleanEditorialText(p))
    .filter((p) => {
      if (p.length < 20) return false;
      const lower = p.toLowerCase();
      if (lower.startsWith("foto:") || lower.startsWith("imagem:")) return false;
      if (lower.includes("todos os direitos reservados")) return false;
      if (lower.includes("inscreva-se no canal")) return false;
      if (lower.includes("clique aqui") || lower.includes("clique e siga")) return false;
      if (lower.includes("leia também") || lower.includes("veja também") || lower.includes("leia mais")) return false;
      if (lower.includes("compartilhe no whatsapp") || lower.includes("compartilhe esta notícia")) return false;
      if (lower.includes("siga o canal do g1") || lower.includes("canal do g1 no whatsapp")) return false;
      if (lower.includes("fale com o g1") || lower.includes("vídeos: últimas notícias")) return false;
      if (lower.includes("veja outras notícias da região")) return false;
      return true;
    });

  if (rawParagraphs.length >= 2) {
    // Retorna os parágrafos jornalísticos limpos com quebra dupla
    return rawParagraphs.join("\n\n");
  }

  // Fallback caso a fonte tenha apenas o resumo
  const cleanExcerpt = cleanEditorialText(excerpt);
  const base = cleanExcerpt || cleanEditorialText(title);

  return `${base}\n\nO caso segue sendo acompanhado pelas autoridades e novos desdobramentos devem ser divulgados ao longo do dia em Goiânia e região.\n\nMais informações e atualizações serão publicadas no portal Viralizougoiania conforme a confirmação dos fatos.`;
}

