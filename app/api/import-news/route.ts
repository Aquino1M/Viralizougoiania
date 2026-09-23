import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isAdmin } from "@/lib/session";
import type { ImportedNews } from "@/lib/types";
import { formatViralizouArticle } from "@/lib/rewrite";

const MAX_HTML = 2_000_000;

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const n = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    }
    return named[code.toLowerCase()] ?? `&${code};`;
  });
}

function cleanText(value = "") {
  return decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attrMap(tag: string) {
  const attrs: Record<string, string> = {};
  const re = /([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = decodeEntities(m[3]);
  return attrs;
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = attrMap(tag);
    if ((attrs.property || attrs.name || attrs.itemprop || "").toLowerCase() === key.toLowerCase()) return attrs.content || "";
  }
  return "";
}

function absoluteUrl(value: string, base: string) {
  if (!value) return "";
  try { return new URL(value, base).toString(); } catch { return ""; }
}

function findArticleLd(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArticleLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => ["NewsArticle", "Article", "BlogPosting"].includes(String(t)))) return obj;
  for (const v of Object.values(obj)) {
    const found = findArticleLd(v);
    if (found) return found;
  }
  return null;
}

function extractJsonLd(html: string) {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const found = findArticleLd(JSON.parse(body));
      if (found) return found;
    } catch {}
  }
  return null;
}

function jsonImage(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return jsonImage(value[0]);
  if (value && typeof value === "object") return String((value as Record<string, unknown>).url || "");
  return "";
}

function isPrivateIp(ip: string) {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb")) return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return isPrivateIp(mapped);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

async function assertSafeUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("URL inválida."); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Use apenas links http ou https.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw new Error("Endereço local não permitido.");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Endereço privado não permitido.");
  } else {
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a: { address: string }) => isPrivateIp(a.address))) throw new Error("Esse endereço não pode ser acessado pelo importador.");
  }
  return url;
}

async function safeFetch(raw: string) {
  let current = await assertSafeUrl(raw);
  for (let i = 0; i < 4; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirecionamento inválido na fonte.");
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    if (!res.ok) throw new Error(`A fonte respondeu com erro ${res.status}.`);
    const length = Number(res.headers.get("content-length") || 0);
    if (length > MAX_HTML) throw new Error("A página é grande demais para importar.");
    const text = (await res.text()).slice(0, MAX_HTML);
    return { text, url: current.toString(), contentType: res.headers.get("content-type") || "" };
  }
  throw new Error("Muitos redirecionamentos.");
}

function classifyCategory(title: string, text = ""): string {
  const combined = `${title} ${text}`.toLowerCase();

  const rules: { category: string; terms: string[] }[] = [
    {
      category: "Segurança",
      terms: [
        "polícia", "policia", "preso", "presa", "apreendido", "apreensão", "tiro", "assalto", "roubo",
        "delegado", "delegacia", "pmgo", "pm-go", "pm ", "crime", "homicídio", "homicidio", "assassin",
        "tráfico", "trafico", "suspeito", "arma de fogo", "batalhão", "droga", "mandado", "golpe",
        "estelionato", "prisão", "prisao", "morte violenta", "rotam", "choque"
      ],
    },
    {
      category: "Trânsito",
      terms: [
        "trânsito", "transito", "colisão", "colisao", "acidente", "batida", "marginal botafogo", "detran",
        "congestionamento", "interdição", "interdicao", "desvio", "pista", "motorista", "capotamento",
        "atropelamento", "avenida 85", "avenida t-63", "t-63", "t-9", "avenida anhanguera", "semáforo",
        "semaforo", "br-153", "viaduto", "lentidão", "lentidao"
      ],
    },
    {
      category: "Empregos",
      terms: [
        "vaga", "vagas", "concurso", "concursos", "sine", "contratação", "contratacao", "processo seletivo",
        "currículo", "curriculo", "estágio", "estagio", "trainee", "oportunidade de emprego", "carteira assinada",
        "trabalhador", "salário", "salario", "inscrições abertas", "inscricoes abertas", "edital"
      ],
    },
    {
      category: "Eventos",
      terms: [
        "show", "shows", "festival", "pecuária", "pecuaria", "teatro", "cinema", "música", "musica",
        "festa", "rodeio", "sertanejo", "pagode", "ingresso", "ingressos", "exposição", "exposicao",
        "cultural", "gastronomia", "gastronômico", "balada", "programação do fim de semana"
      ],
    },
    {
      category: "Política",
      terms: [
        "prefeitura", "câmara", "camara", "prefeito", "governador", "deputado", "vereador", "eleição",
        "eleicoes", "votos", "senado", "senador", "caiado", "ronaldo caiado", "rogério cruz", "rogerio cruz",
        "câmara municipal", "tribunal de contas", "tce-go", "tcm-go", "partido", "plenário", "secretário"
      ],
    },
    {
      category: "Esportes",
      terms: [
        "goiás ec", "goias ec", "goiás e.c", "vila nova", "atlético goianiense", "atletico goianiense",
        "atlético-go", "atletico-go", "serra dourada", "estádio antônio accioly", "estadio", "campeonato goiano",
        "futebol", "brasileirão", "brasileirao", "série a", "série b", "dragão", "esmeraldino", "tigre",
        "goleador", "copa do brasil"
      ],
    },
    {
      category: "Economia",
      terms: [
        "inflação", "inflacao", "economia", "comércio", "comercio", "faturamento", "ipca", "mercado",
        "empresas", "pib", "imposto", "impostos", "shopping", "varejo", "exportação", "safra", "agronegócio",
        "agronegocio", "agropecuária", "cotação", "juros", "selic"
      ],
    },
    {
      category: "Serviços",
      terms: [
        "vacinação", "vacinacao", "saúde", "saude", "sus", "água", "agua", "saneago", "equatorial",
        "cnh", "serviço", "servico", "ipva", "iptu", "coleta de lixo", "lixo", "posto de saúde", "upa",
        "hospital", "agendamento", "poupatempo", "vapt vupt", "atendimento ao cidadão"
      ],
    },
    {
      category: "Bairros",
      terms: [
        "setor bueno", "setor marista", "campinas", "jardim goiás", "jardim goias", "setor oeste",
        "setor sul", "setor universitário", "setor universitario", "setor pedro ludovico", "setor central",
        "setor bela vista", "parque amazônia", "parque amazonia", "bairro", "bairros", "moradores",
        "região noroeste", "região leste"
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.terms.some((term) => combined.includes(term))) {
      return rule.category;
    }
  }

  return "Goiânia";
}

function extractFullContent(html: string): string {
  // 1. G1 / Globo: Parágrafos com classe 'content-text__container'
  const g1Paras = html.match(/<p\b[^>]*class=["'][^"']*content-text__container[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi);
  if (g1Paras && g1Paras.length > 0) {
    const list = g1Paras
      .map(cleanText)
      .filter((t) => {
        if (t.length < 20) return false;
        const low = t.toLowerCase();
        if (low.startsWith("leia também") || low.startsWith("veja também")) return false;
        if (low.includes("clique e siga o canal") || low.includes("veja outras notícias")) return false;
        if (low.includes("vídeos: últimas notícias") || low.includes("assista aos vídeos")) return false;
        return true;
      });
    if (list.length >= 2) return list.join("\n\n");
  }

  // 2. Blocos principais de portais (A Redação, Mais Goiás, O Popular, etc.)
  const containerPatterns = [
    /<div\b[^>]*class=["'][^"']*(?:entry-content|article-body|post-content|corpo-texto|materia-conteudo|noticia-conteudo)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<section\b[^>]*class=["'][^"']*(?:article__content|materia__conteudo)[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
    /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
  ];

  for (const pattern of containerPatterns) {
    const match = pattern.exec(html);
    if (match) {
      const ps = match[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
      if (ps && ps.length >= 2) {
        const list = ps.map(cleanText).filter((t) => t.length >= 25);
        if (list.length >= 2) return list.join("\n\n");
      }
    }
  }

  // 3. Fallback genérico: varredura em todo o HTML limpo
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

  const allPs = cleanHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const extracted: string[] = [];

  for (const rawP of allPs) {
    const text = cleanText(rawP);
    if (
      text.length >= 25 &&
      !text.toLowerCase().includes("todos os direitos reservados") &&
      !text.toLowerCase().includes("leia também") &&
      !text.toLowerCase().includes("veja também") &&
      !text.toLowerCase().includes("inscreva-se no canal") &&
      !text.toLowerCase().includes("clique aqui") &&
      !text.toLowerCase().includes("publicidade") &&
      !text.toLowerCase().includes("compartilhe esta notícia") &&
      !text.toLowerCase().includes("política de privacidade") &&
      !text.toLowerCase().includes("termos de uso")
    ) {
      extracted.push(text);
    }
  }

  if (extracted.length >= 2) {
    return extracted.join("\n\n");
  }

  return "";
}


function extractAuthorFromHtml(html: string, ld?: Record<string, unknown> | null): string {
  const g1Match = html.match(/<p\b[^>]*class=["'][^"']*content-publication-data__from[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) ||
                  html.match(/<span\b[^>]*class=["'][^"']*content-publication-data__from[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (g1Match) {
    const raw = cleanText(g1Match[1]);
    const cleaned = raw.replace(/^Por\s+/i, "").trim();
    if (cleaned) return cleaned;
  }

  const metaAut = cleanText(
    metaContent(html, "author") ||
    metaContent(html, "article:author") ||
    metaContent(html, "dc.creator") ||
    metaContent(html, "twitter:creator")
  );
  if (metaAut && !metaAut.includes("http") && metaAut.length < 80) return metaAut;

  if (ld?.author) {
    if (typeof ld.author === "string") return cleanText(ld.author);
    if (Array.isArray(ld.author) && ld.author[0]) {
      const first = ld.author[0] as Record<string, unknown>;
      if (typeof first.name === "string") return cleanText(first.name);
    }
    if (typeof ld.author === "object") {
      const obj = ld.author as Record<string, unknown>;
      if (typeof obj.name === "string") return cleanText(obj.name);
    }
  }

  const authorTagMatch =
    html.match(/<a\b[^>]*rel=["']author["'][^>]*>([\s\S]*?)<\/a>/i) ||
    html.match(/<span\b[^>]*class=["'][^"']*(?:author-name|author__name|post-author|autor-nome)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (authorTagMatch) {
    const tagAut = cleanText(authorTagMatch[1]);
    if (tagAut && tagAut.length < 70) return tagAut;
  }

  return "";
}

function extractVideoFromHtml(html: string, ld?: Record<string, unknown> | null): string {
  const ytMatch = html.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;

  const globoPlayMatch = html.match(/https?:\/\/globoplay\.globo\.com\/v\/(\d+)/i) ||
                         html.match(/data-video-id=["'](\d+)["']/i) ||
                         html.match(/"video_id":\s*"?(\d+)"?/i);
  if (globoPlayMatch) return `https://globoplay.globo.com/v/${globoPlayMatch[1]}/`;

  if (ld?.video && typeof ld.video === "object") {
    const vid = ld.video as Record<string, unknown>;
    const vUrl = String(vid.embedUrl || vid.contentUrl || "");
    if (vUrl) return vUrl;
  }

  const ogVid = metaContent(html, "og:video") || metaContent(html, "og:video:url") || metaContent(html, "og:video:secure_url");
  if (ogVid) return ogVid;

  const videoSrcMatch = html.match(/<video\b[^>]*src=["']([^"']+\.mp4[^"']*)["']/i) ||
                        html.match(/<source\b[^>]*src=["']([^"']+\.mp4[^"']*)["']/i);
  if (videoSrcMatch) return videoSrcMatch[1];

  return "";
}

function extractArticle(html: string, finalUrl: string): ImportedNews {
  const ld = extractJsonLd(html);
  const htmlTitle = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const title = cleanText(metaContent(html, "og:title") || String(ld?.headline || ld?.name || "") || htmlTitle);
  const excerpt = cleanText(metaContent(html, "og:description") || metaContent(html, "description") || String(ld?.description || ""));
  const image = metaContent(html, "og:image") || metaContent(html, "twitter:image") || jsonImage(ld?.image);
  const sourceName = cleanText(metaContent(html, "og:site_name") || String((ld?.publisher as Record<string, unknown> | undefined)?.name || "") || new URL(finalUrl).hostname.replace(/^www\./, ""));
  
  const published = metaContent(html, "article:published_time") ||
                    metaContent(html, "pubdate") ||
                    String(ld?.datePublished || "") ||
                    html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] || "";
  
  const author = extractAuthorFromHtml(html, ld);
  const video = extractVideoFromHtml(html, ld);

  if (!title) throw new Error("Não consegui identificar o título dessa matéria.");

  const fullText = extractFullContent(html);
  const autoCategory = classifyCategory(title, fullText || excerpt);
  const formattedContent = formatViralizouArticle({
    title,
    excerpt,
    sourceText: fullText,
    sourceName,
  });

  return {
    title,
    excerpt: excerpt || (fullText ? fullText.slice(0, 180) + "..." : title),
    content: formattedContent,
    source_content: fullText || excerpt,
    category: autoCategory,
    image_url: absoluteUrl(image, finalUrl),
    image_credit: author ? `Reportagem: ${author} (${sourceName})` : `Fonte original: ${sourceName}`,
    video_url: video ? absoluteUrl(video, finalUrl) : undefined,
    source_name: sourceName,
    source_url: finalUrl,
    source_author: author || undefined,
    published_at: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : new Date().toISOString(),
  };
}

function tag(block: string, name: string) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`<${safe}\\b[^>]*>([\\s\\S]*?)<\\/${safe}>`, "i"))?.[1] || "";
}

function feedLink(block: string) {
  const atom = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return atom || cleanText(tag(block, "link"));
}

function feedImage(block: string): string {
  // 1. Procura em srcset (pega a maior imagem de alta resolução em feeds Wordpress como A Redação)
  const srcsets = block.match(/srcset=["']([^"']+)["']/gi) || [];
  for (const s of srcsets) {
    const raw = s.replace(/^srcset=["']/i, "").replace(/["']$/, "");
    const parts = raw.split(",").map((p) => p.trim().split(/\s+/));
    const sorted = parts.sort((a, b) => (parseInt(b[1]) || 0) - (parseInt(a[1]) || 0));
    if (sorted[0]?.[0] && sorted[0][0].startsWith("http")) {
      return decodeEntities(sorted[0][0].trim());
    }
  }

  // 2. Procura em tags XML de mídia e tags <img>
  const candidates = [
    block.match(/<media:content\b[^>]*url=["']([^"']+)["']/i)?.[1],
    block.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["']/i)?.[1],
    block.match(/<enclosure\b[^>]*url=["']([^"']+)["']/i)?.[1],
    block.match(/<image\b[^>]*>\s*<url>([\s\S]*?)<\/url>/i)?.[1],
    block.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1],
  ];
  const found = candidates.find((c) => Boolean(c && typeof c === "string" && c.trim().length > 5));
  return found ? decodeEntities(found.trim()) : "";
}

async function fetchOgImage(link: string): Promise<string> {
  try {
    const res = await fetch(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 150_000);
    const og =
      metaContent(html, "og:image") ||
      metaContent(html, "twitter:image") ||
      metaContent(html, "image");
    return og ? absoluteUrl(og, link) : "";
  } catch {
    return "";
  }
}

function feedVideo(block: string): string {
  const videoMedia = block.match(/<media:content\b[^>]*medium=["']video["'][^>]*url=["']([^"']+)["']/i)?.[1] ||
                     block.match(/<media:content\b[^>]*type=["']video\/[^"']*["'][^>]*url=["']([^"']+)["']/i)?.[1] ||
                     block.match(/<enclosure\b[^>]*type=["']video\/[^"']*["'][^>]*url=["']([^"']+)["']/i)?.[1];
  if (videoMedia) return videoMedia;

  const ytMatch = block.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;

  return "";
}

function feedAuthor(item: string): string {
  const dcCreator = cleanText(tag(item, "dc:creator"));
  if (dcCreator && dcCreator.length < 80) return dcCreator;
  const authorTag = cleanText(tag(item, "author"));
  if (authorTag && !authorTag.includes("@") && authorTag.length < 80) return authorTag;
  return "";
}

async function parseFeed(xml: string, feedUrl: string): Promise<ImportedNews[]> {
  const sourceName = cleanText(tag(xml, "title")) || new URL(feedUrl).hostname.replace(/^www\./, "");
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const parsed = items.slice(0, 30).map((item) => {
    const link = absoluteUrl(feedLink(item), feedUrl);
    const dateRaw = cleanText(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated") || tag(item, "dc:date"));
    const title = cleanText(tag(item, "title"));
    const rawContent = tag(item, "content:encoded") || tag(item, "content") || tag(item, "description");
    const cleanContent = cleanText(rawContent);
    const excerpt = cleanText(tag(item, "description") || tag(item, "summary") || cleanContent).slice(0, 500);
    const category = classifyCategory(title, cleanContent || excerpt);
    const author = feedAuthor(item);
    const video = feedVideo(item);
    const image = feedImage(item);
    const formattedContent = formatViralizouArticle({
      title,
      excerpt,
      sourceText: cleanContent,
      sourceName,
    });

    return {
      title,
      excerpt,
      content: formattedContent,
      source_content: cleanContent || excerpt,
      category,
      image_url: image ? absoluteUrl(image, feedUrl) : "",
      image_credit: author ? `Reportagem: ${author} (${sourceName})` : `Fonte original: ${sourceName}`,
      video_url: video ? absoluteUrl(video, feedUrl) : undefined,
      source_name: sourceName,
      source_url: link || feedUrl,
      source_author: author || undefined,
      published_at: dateRaw && !Number.isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toISOString() : new Date().toISOString(),
    };
  }).filter((item) => item.title && item.source_url);

  // Para jornais que não enviam imagem no feed XML, busca o og:image da matéria em paralelo
  const missingImg = parsed.filter((it) => !it.image_url && it.source_url);
  if (missingImg.length > 0) {
    await Promise.allSettled(
      missingImg.slice(0, 15).map(async (item) => {
        const og = await fetchOgImage(item.source_url);
        if (og) item.image_url = og;
      })
    );
  }

  return parsed;
}

function discoverFeed(html: string, baseUrl: string) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const link of links) {
    const attrs = attrMap(link);
    if ((attrs.rel || "").toLowerCase().includes("alternate") && /rss|atom|xml/i.test(attrs.type || "")) {
      return absoluteUrl(attrs.href || "", baseUrl);
    }
  }
  return "";
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    const mode = body.mode === "feed" ? "feed" : "article";
    if (!url) return NextResponse.json({ error: "Cole um link para importar." }, { status: 400 });

    const first = await safeFetch(url);
    if (mode === "article") {
      return NextResponse.json({ items: [extractArticle(first.text, first.url)] });
    }

    let feedText = first.text;
    let feedUrl = first.url;
    const looksLikeFeed = /<(rss|feed|rdf:RDF)\b/i.test(first.text) || /xml|rss|atom/i.test(first.contentType);
    if (!looksLikeFeed) {
      const discovered = discoverFeed(first.text, first.url);
      if (!discovered) return NextResponse.json({ error: "Não encontrei um RSS/Atom nessa página. Cole diretamente o endereço do feed." }, { status: 400 });
      const feed = await safeFetch(discovered);
      feedText = feed.text;
      feedUrl = feed.url;
    }
    const items = await parseFeed(feedText, feedUrl);
    if (!items.length) return NextResponse.json({ error: "Não encontrei notícias nesse feed." }, { status: 400 });
    return NextResponse.json({ items, feed_url: feedUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao importar notícia" }, { status: 500 });
  }
}
