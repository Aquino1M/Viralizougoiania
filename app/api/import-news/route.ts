import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isAdmin } from "@/lib/session";
import type { ImportedNews } from "@/lib/types";

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
      headers: { "User-Agent": "Viralizougoiania-NewsImporter/1.0" },
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

function extractArticle(html: string, finalUrl: string): ImportedNews {
  const ld = extractJsonLd(html);
  const htmlTitle = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const title = cleanText(metaContent(html, "og:title") || String(ld?.headline || ld?.name || "") || htmlTitle);
  const excerpt = cleanText(metaContent(html, "og:description") || metaContent(html, "description") || String(ld?.description || ""));
  const image = metaContent(html, "og:image") || jsonImage(ld?.image);
  const sourceName = cleanText(metaContent(html, "og:site_name") || String((ld?.publisher as Record<string, unknown> | undefined)?.name || "") || new URL(finalUrl).hostname.replace(/^www\./, ""));
  const published = metaContent(html, "article:published_time") || String(ld?.datePublished || "");
  if (!title) throw new Error("Não consegui identificar o título dessa matéria.");
  return {
    title,
    excerpt,
    image_url: absoluteUrl(image, finalUrl),
    source_name: sourceName,
    source_url: finalUrl,
    published_at: published ? new Date(published).toISOString() : null,
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

function feedImage(block: string) {
  const candidates = [
    block.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    block.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    block.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i)?.[1],
  ];
  return candidates.find(Boolean) || "";
}

function parseFeed(xml: string, feedUrl: string): ImportedNews[] {
  const sourceName = cleanText(tag(xml, "title")) || new URL(feedUrl).hostname.replace(/^www\./, "");
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return items.slice(0, 25).map((item) => {
    const link = absoluteUrl(feedLink(item), feedUrl);
    const date = cleanText(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated"));
    return {
      title: cleanText(tag(item, "title")),
      excerpt: cleanText(tag(item, "description") || tag(item, "summary") || tag(item, "content")).slice(0, 500),
      image_url: absoluteUrl(feedImage(item), feedUrl),
      source_name: sourceName,
      source_url: link || feedUrl,
      published_at: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null,
    };
  }).filter((item) => item.title && item.source_url);
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
    const items = parseFeed(feedText, feedUrl);
    if (!items.length) return NextResponse.json({ error: "Não encontrei notícias nesse feed." }, { status: 400 });
    return NextResponse.json({ items, feed_url: feedUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao importar notícia" }, { status: 500 });
  }
}
