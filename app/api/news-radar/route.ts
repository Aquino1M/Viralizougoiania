import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { NEWS_SOURCES, type NewsSourceConfig } from "@/lib/news-sources";

export const runtime = "nodejs";

type RadarItem = {
  id: string;
  title: string;
  url: string;
  source_id: string;
  source_name: string;
  source_url: string;
  scope: "goias" | "goiania";
};

const BLOCKED_TEXT = /^(início|home|menu|buscar|pesquisar|ver mais|veja mais|últimas notícias|mais lidas|política|esportes|economia|brasil|mundo|cidades|entretenimento|publicidade)$/i;
const REGIONAL = /(goi[aâ]nia|goi[aá]s|goiano|goiana|goianos|an[aá]polis|aparecida de goi[aâ]nia|trindade|rio verde|jatai|jata[ií]|luzi[aâ]nia|valpara[ií]so|senador canedo|caldas novas|itumbiara|catal[aã]o|formosa|goian[eé]sia|pirin[oó]polis|pires do rio|aparecida|entorno|br-153|go-\d+)/i;

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
  return decodeEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string, base: string) {
  try { return new URL(value, base); } catch { return null; }
}

function sameSource(url: URL, source: NewsSourceConfig) {
  const host = url.hostname.replace(/^www\./, "");
  const domain = source.domain.replace(/^www\./, "");
  if (host !== domain && !host.endsWith("." + domain)) return false;
  if (source.pathPrefixes?.length && !source.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) return false;
  return true;
}

function looksLikeArticle(title: string, url: URL, source: NewsSourceConfig) {
  if (title.length < 28 || title.length > 220) return false;
  if (BLOCKED_TEXT.test(title)) return false;
  if (url.pathname === "/" || url.pathname.split("/").filter(Boolean).length < 2) return false;
  if (/\.(jpg|jpeg|png|webp|gif|svg|pdf)$/i.test(url.pathname)) return false;
  if (/\/tag\/|\/autor\/|\/author\/|\/categoria\/|\/category\/|\/newsletter|\/assine|\/termos|\/politica-de-privacidade|\/promocoes\//i.test(url.pathname)) return false;
  if (source.requireRegionalTerms && !REGIONAL.test(title + " " + url.pathname)) return false;
  return true;
}

function extractItems(html: string, source: NewsSourceConfig): RadarItem[] {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();
  const items: RadarItem[] = [];
  const anchor = /<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchor.exec(html))) {
    const url = absoluteUrl(match[2], source.url);
    if (!url || !["http:", "https:"].includes(url.protocol) || !sameSource(url, source)) continue;

    const title = cleanText(match[3]);
    if (!looksLikeArticle(title, url, source)) continue;

    url.search = "";
    url.hash = "";
    const canonical = url.toString();
    const titleKey = title.toLocaleLowerCase("pt-BR");
    if (seen.has(canonical) || seenTitles.has(titleKey)) continue;
    seen.add(canonical);
    seenTitles.add(titleKey);

    items.push({
      id: `${source.id}:${items.length + 1}`,
      title,
      url: canonical,
      source_id: source.id,
      source_name: source.name,
      source_url: source.url,
      scope: source.scope,
    });

    if (items.length >= 18) break;
  }

  return items;
}

async function loadSource(source: NewsSourceConfig) {
  try {
    const res = await fetch(source.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Viralizougoiania-Radar/1.0)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = (await res.text()).slice(0, 3_000_000);
    return { source, items: extractItems(html, source), error: "" };
  } catch (error) {
    return {
      source,
      items: [] as RadarItem[],
      error: error instanceof Error ? error.message : "Falha ao carregar",
    };
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const requested = req.nextUrl.searchParams.get("source");
  const selected = requested ? NEWS_SOURCES.filter((s) => s.id === requested) : NEWS_SOURCES;
  if (!selected.length) return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });

  const loaded = await Promise.all(selected.map(loadSource));
  const items = loaded.flatMap((entry) => entry.items);

  return NextResponse.json({
    sources: loaded.map((entry) => ({
      id: entry.source.id,
      name: entry.source.name,
      url: entry.source.url,
      scope: entry.source.scope,
      count: entry.items.length,
      error: entry.error || undefined,
    })),
    items,
    updated_at: new Date().toISOString(),
  });
}
