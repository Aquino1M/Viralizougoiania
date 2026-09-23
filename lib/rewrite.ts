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
    .map((p) => p.trim())
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
  const cleanExcerpt = excerpt.replace(/\s+/g, " ").trim();
  const base = cleanExcerpt || title;

  return `${base}\n\nO caso segue sendo acompanhado pelas autoridades e novos desdobramentos devem ser divulgados ao longo do dia em Goiânia e região.\n\nMais informações e atualizações serão publicadas no portal Viralizougoiania conforme a confirmação dos fatos.`;
}
