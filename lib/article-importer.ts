
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { proxyImageUrl } from "@/lib/image-proxy";
import type { ImportedNews } from "@/lib/types";

const MAX_HTML = 8_000_000;
const MAX_SOURCE_TEXT = 120_000;
const BOILERPLATE = /^(publicidade|continua depois da publicidade|veja também|leia também|leia mais|saiba mais|compartilhe|siga o|assine|newsletter|receba as notícias|últimas notícias|mais lidas|comentários|menu)$/i;

function decodeEntities(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const n = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    }
    return named[code.toLowerCase()] || "&" + code + ";";
  });
}

function stripTags(value = "") {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function cleanInline(value = "") {
  return decodeEntities(stripTags(value))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function regexEscape(value: string) {
  const special = new Set(["\\", "^", "$", ".", "|", "?", "*", "+", "(", ")", "[", "]", "{", "}"]);
  return Array.from(value).map((ch) => special.has(ch) ? "\\" + ch : ch).join("");
}

function cleanTitle(value = "", source = "") {
  let title = cleanInline(value);
  const suffixes = [source, "G1", "Globo.com"].filter(Boolean).map(regexEscape);
  if (suffixes.length) {
    title = title.replace(new RegExp("\\s*[|–—-]\\s*(?:" + suffixes.join("|") + ")\\s*$", "i"), "").trim();
  }
  return title;
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
  if (types.some((t) => ["NewsArticle", "Article", "BlogPosting", "ReportageNewsArticle"].includes(String(t)))) return obj;
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
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.url || obj.contentUrl || "");
  }
  return "";
}

function jsonImageCaption(value: unknown) {
  if (Array.isArray(value)) return jsonImageCaption(value[0]);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return cleanInline(String(obj.caption || obj.description || obj.name || ""));
  }
  return "";
}

function authorName(value: unknown): string {
  if (Array.isArray(value)) return value.map(authorName).filter(Boolean).join(", ");
  if (typeof value === "string") return cleanInline(value);
  if (value && typeof value === "object") return cleanInline(String((value as Record<string, unknown>).name || ""));
  return "";
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function normalizeBlocks(blocks: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of blocks) {
    const text = cleanInline(raw).replace(/\s+/g, " ").trim();
    if (!text || text.length < 18 || BOILERPLATE.test(text)) continue;
    const key = text.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9áéíóúãõâêôç ]/gi, "").slice(0, 180);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function blocksFromFragment(fragment: string, onlyTargeted = false) {
  const blocks: string[] = [];
  const re = /<(p|h2|h3|blockquote)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    const attrs = m[2] || "";
    const className = attrMap("<x " + attrs + ">").class || "";
    const targeted = /(content-text__container|content-intertitle|mc-article-body|article-body|post-content|entry-content|materia-conteudo|article-content|story-body|content-body)/i.test(className);
    if (onlyTargeted && !targeted) continue;
    const text = cleanInline(m[3]);
    if (m[1].toLowerCase() === "p" && text.length < 35) continue;
    if ((m[1].toLowerCase() === "h2" || m[1].toLowerCase() === "h3") && text.length < 4) continue;
    blocks.push(text);
  }
  return normalizeBlocks(blocks);
}

function longestArticleBlock(html: string) {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  if (!articles.length) return "";
  return articles.sort((a, b) => b.length - a.length)[0] || "";
}

function paragraphFallback(html: string) {
  const blocks: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = cleanInline(m[1]);
    if (text.length >= 55 && !/(política de privacidade|termos de uso|todos os direitos reservados|cookies|newsletter|publicidade)/i.test(text)) {
      blocks.push(text);
    }
  }
  return normalizeBlocks(blocks);
}

function extractBody(html: string, ld: Record<string, unknown> | null) {
  const candidates: Array<{ method: string; blocks: string[] }> = [];

  const targeted = blocksFromFragment(html, true);
  if (targeted.length) candidates.push({ method: "blocos-editoriais", blocks: targeted });

  const article = longestArticleBlock(html);
  if (article) {
    const blocks = blocksFromFragment(article, false);
    if (blocks.length) candidates.push({ method: "tag-article", blocks });
  }

  if (typeof ld?.articleBody === "string") {
    const raw = String(ld.articleBody).replace(/\r/g, "");
    const chunks = raw.includes("\n")
      ? raw.split(/\n+/)
      : raw.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÇ])/);
    const blocks = normalizeBlocks(chunks);
    if (blocks.length) candidates.push({ method: "json-ld", blocks });
  }

  const fallback = paragraphFallback(html);
  if (fallback.length) candidates.push({ method: "pagina-completa", blocks: fallback });

  const high = candidates.filter((c) => c.method !== "pagina-completa" && wordCount(c.blocks.join(" ")) >= 100);
  const pool = high.length ? high : candidates;
  const chosen = pool.sort((a, b) => wordCount(b.blocks.join(" ")) - wordCount(a.blocks.join(" ")))[0] || {
    method: "não-identificado",
    blocks: [] as string[],
  };

  const text = chosen.blocks.join("\n\n").slice(0, MAX_SOURCE_TEXT);
  const words = wordCount(text);
  const paywall = /(conteúdo exclusivo|assine para continuar|continue lendo com|exclusivo para assinantes|faça sua assinatura|já é assinante)/i.test(html);
  const complete = words >= 180 && chosen.blocks.length >= 3 && !(paywall && words < 500);

  return { text, words, paragraphs: chosen.blocks.length, method: chosen.method, complete };
}

function isPrivateIp(ip: string) {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (/^(fc|fd|fe8|fe9|fea|feb)/i.test(ip)) return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return isPrivateIp(mapped);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

async function assertSafeUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("URL inválida."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use apenas links http ou https.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw new Error("Endereço local não permitido.");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Endereço privado não permitido.");
  } else {
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
      throw new Error("Esse endereço não pode ser acessado pelo importador.");
    }
  }
  return url;
}

export async function fetchSourcePage(raw: string) {
  let current = await assertSafeUrl(raw);
  for (let i = 0; i < 4; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Viralizougoiania/2.0; +https://github.com/Aquino1M/Viralizougoiania)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirecionamento inválido na fonte.");
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }

    if (!res.ok) throw new Error("A fonte respondeu com erro " + res.status + ".");
    const length = Number(res.headers.get("content-length") || 0);
    if (length > MAX_HTML) throw new Error("A página é grande demais para importar.");
    const text = (await res.text()).slice(0, MAX_HTML);
    return { text, url: current.toString(), contentType: res.headers.get("content-type") || "" };
  }
  throw new Error("Muitos redirecionamentos.");
}

function safeIso(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export function extractArticleFromHtml(html: string, finalUrl: string): ImportedNews {
  const ld = extractJsonLd(html);
  const htmlTitle = cleanInline(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const sourceName = cleanInline(
    metaContent(html, "og:site_name") ||
    String((ld?.publisher as Record<string, unknown> | undefined)?.name || "") ||
    new URL(finalUrl).hostname.replace(/^www\./, ""),
  );

  const title = cleanTitle(
    metaContent(html, "og:title") || String(ld?.headline || ld?.name || "") || htmlTitle,
    sourceName,
  );
  const excerpt = cleanInline(
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    String(ld?.description || ""),
  );
  const image = absoluteUrl(metaContent(html, "og:image") || jsonImage(ld?.image), finalUrl);
  const imageCaption = jsonImageCaption(ld?.image) ||
    cleanInline(metaContent(html, "og:image:alt")) ||
    cleanInline(html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || "");
  const sourceAuthor = authorName(ld?.author) || cleanInline(metaContent(html, "author"));
  const articleSection = cleanInline(String(ld?.articleSection || metaContent(html, "article:section") || ""));
  const published = metaContent(html, "article:published_time") || String(ld?.datePublished || "");
  const body = extractBody(html, ld);

  if (!title) throw new Error("Não consegui identificar o título dessa matéria.");

  const proxied = image ? proxyImageUrl(image, 1200) : "";

  return {
    title,
    excerpt,
    image_url: image,
    image_proxy_url: proxied.startsWith("/api/image-proxy") ? proxied : "",
    image_caption: imageCaption,
    source_name: sourceName,
    source_url: finalUrl,
    source_author: sourceAuthor,
    source_published_at: safeIso(published),
    article_section: articleSection,
    source_content: body.text,
    source_word_count: body.words,
    source_capture_method: body.method,
    source_complete: body.complete,
    body_detected: Boolean(body.text),
    body_paragraphs: body.paragraphs,
    published_at: safeIso(published),
  };
}

function tag(block: string, name: string) {
  const safe = regexEscape(name);
  return block.match(new RegExp("<" + safe + "\\b[^>]*>([\\s\\S]*?)<\\/" + safe + ">", "i"))?.[1] || "";
}

function feedLink(block: string) {
  const atom = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return atom || cleanInline(tag(block, "link"));
}

function feedImage(block: string) {
  const candidates = [
    block.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    block.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    block.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i)?.[1],
  ];
  return candidates.find(Boolean) || "";
}

export function parseFeed(xml: string, feedUrl: string): ImportedNews[] {
  const sourceName = cleanInline(tag(xml, "title")) || new URL(feedUrl).hostname.replace(/^www\./, "");
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  return items.slice(0, 25).map((item) => {
    const link = absoluteUrl(feedLink(item), feedUrl);
    const date = cleanInline(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated"));
    const image = absoluteUrl(feedImage(item), feedUrl);
    return {
      title: cleanTitle(cleanInline(tag(item, "title")), sourceName),
      excerpt: cleanInline(tag(item, "description") || tag(item, "summary") || tag(item, "content")).slice(0, 500),
      image_url: image,
      source_name: sourceName,
      source_url: link || feedUrl,
      published_at: safeIso(date),
    };
  }).filter((item) => item.title && item.source_url);
}

export function discoverFeed(html: string, baseUrl: string) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const link of links) {
    const attrs = attrMap(link);
    if ((attrs.rel || "").toLowerCase().includes("alternate") && /rss|atom|xml/i.test(attrs.type || "")) {
      return absoluteUrl(attrs.href || "", baseUrl);
    }
  }
  return "";
}
