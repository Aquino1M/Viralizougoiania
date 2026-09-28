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
  category?: string;
}): string {
  const { title, excerpt = "", sourceText = "", sourceName = "", category = "" } = params;

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

  // Fallback caso a fonte tenha apenas o resumo ou seja um texto curto
  const cleanExcerpt = cleanEditorialText(excerpt);
  const base = cleanExcerpt || cleanEditorialText(title);

  // Fechamentos editoriais contextuais por categoria
  const cat = (category || "").toLowerCase();
  let closing1 = "";
  let closing2 = "";

  if (cat.includes("futebol") || cat.includes("esporte")) {
    closing1 = "A movimentação nos bastidores, o ritmo de preparação e os próximos desafios continuam no centro das atenções da torcida e do clube.";
    closing2 = "A equipe de esportes do Viralizougoiania acompanha cada lance, escalações, negociações e tabela de jogos em tempo real.";
  } else if (cat.includes("fofoca") || cat.includes("famoso") || cat.includes("celebridade")) {
    closing1 = "A novidade repercutiu rapidamente nas redes sociais e movimentou as discussões entre fãs e seguidores ao longo do dia.";
    closing2 = "Todos os detalhes, declarações oficiais e os bastidores mais quentes dos famosos você acompanha em tempo real na aba de Fofocas do Viralizougoiania.";
  } else if (cat.includes("política") || cat.includes("politica")) {
    closing1 = "O tema movimenta os bastidores do poder e gera expectativa quanto aos próximos posicionamentos e articulações políticas.";
    closing2 = "Novos desdobramentos, notas oficiais e análises completas serão atualizados pela equipe do portal Viralizougoiania.";
  } else if (cat.includes("trânsito") || cat.includes("transito")) {
    closing1 = "Motoristas que circulam pela região devem redobrar a atenção e buscar rotas alternativas nos horários de maior fluxo.";
    closing2 = "Mais informações sobre as condições de tráfego e eventuais desvios serão atualizadas pela redação do Viralizougoiania.";
  } else if (cat.includes("segurança") || cat.includes("polícia") || cat.includes("policia")) {
    closing1 = "O caso segue sendo apurado pelas autoridades competentes para esclarecimento completo das circunstâncias.";
    closing2 = "Novas atualizações oficiais sobre as investigações serão divulgadas no portal Viralizougoiania assim que confirmadas.";
  } else {
    closing1 = "Os acontecimentos seguem mobilizando a atenção da comunidade e de equipes locais para novos esclarecimentos.";
    closing2 = "Acompanhe as atualizações e a repercussão completa dos fatos ao longo do dia no portal Viralizougoiania.";
  }

  return `${base}\n\n${closing1}\n\n${closing2}`;
}


