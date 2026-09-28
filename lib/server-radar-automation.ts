import { createPost, getCategories, getPosts, publishDuePosts } from "@/lib/storage";
import { formatViralizouArticle } from "@/lib/rewrite";
import { slugify } from "@/lib/slug";
import type { ImportedNews, Post, PostStatus } from "@/lib/types";
import { getAutomationState, saveAutomationState } from "@/lib/automation-state";

type RadarSource = {
  name: string;
  feedUrl: string;
  hosts: string[];
};

const SOURCES: RadarSource[] = [
  { name: "G1 Goiás", feedUrl: "https://g1.globo.com/rss/g1/go/goias/", hosts: ["g1.globo.com"] },
  { name: "A Redação", feedUrl: "https://aredacao.com.br/feed/", hosts: ["aredacao.com.br", "www.aredacao.com.br"] },
  { name: "Diário de Goiás", feedUrl: "https://diariodegoias.com.br/feed/", hosts: ["diariodegoias.com.br", "www.diariodegoias.com.br"] },
  { name: "Curta Mais", feedUrl: "https://curtamais.com.br/goiania/feed/", hosts: ["curtamais.com.br", "www.curtamais.com.br"] },
  { name: "Dia Online", feedUrl: "https://diaonline.ig.com.br/feed/", hosts: ["diaonline.ig.com.br"] },
  { name: "Metrópoles Goiás", feedUrl: "https://www.metropoles.com/distrito-federal/entorno/feed", hosts: ["metropoles.com", "www.metropoles.com"] },
  { name: "Goiás 24 Horas", feedUrl: "https://goias24horas.com.br/feed/", hosts: ["goias24horas.com.br", "www.goias24horas.com.br"] }
];

const STOP = new Set(["de","da","do","das","dos","a","o","as","os","e","em","no","na","nos","nas","um","uma","para","por","com","que","se","ao","aos","goias","goiás","goiania","goiânia"]);

function decodeEntities(value = "") {
  const named: Record<string,string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    hellip: "…", mdash: "—", ndash: "–", ldquo: "“", rdquo: "”"
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function(_, code: string) {
    if (code[0] === "#") {
      const hex = code[1] && code[1].toLowerCase() === "x";
      const n = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    }
    return named[code.toLowerCase()] || "&" + code + ";";
  });
}

function cleanText(value = "") {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\[\s*(?:…|\.{3}|&hellip;)\s*\]/gi, "")
    .trim();
}

function tag(block: string, name: string) {
  const safe = name.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const re = new RegExp("<" + safe + "\\b[^>]*>([\\s\\S]*?)<\\/" + safe + ">", "i");
  const match = block.match(re);
  return match && match[1] ? match[1] : "";
}

function absoluteUrl(value: string, base: string) {
  try { return new URL(value, base).toString(); } catch { return ""; }
}

function safeIso(value = "") {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function feedLink(block: string) {
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return href && href[1] ? href[1] : cleanText(tag(block, "link"));
}

function feedImage(block: string, base: string) {
  const candidates = [
    block.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i),
    block.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/i),
    block.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i),
    block.match(/<img\b[^>]*src=["']([^"']+)["']/i)
  ];
  for (const match of candidates) {
    if (match && match[1]) return absoluteUrl(match[1], base);
  }
  return "";
}

function canonicalUrl(raw: string) {
  try {
    const url = new URL(raw);
    url.hash = "";
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","output"].forEach(function(k) {
      url.searchParams.delete(k);
    });
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return raw.split("#")[0].split("?")[0].replace(/\/$/, "").toLowerCase();
  }
}

function titleTokens(title: string) {
  return slugify(title).split("-").filter(function(w) {
    return w.length > 2 && !STOP.has(w);
  });
}

function titleSimilarity(a: string, b: string) {
  const aa = new Set(titleTokens(a));
  const bb = new Set(titleTokens(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  aa.forEach(function(w) { if (bb.has(w)) common++; });
  return common / Math.max(aa.size, bb.size);
}

function classifyCategory(title: string, text: string) {
  const s = (title + " " + text).toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["Empregos", /\b(vaga|vagas|emprego|empregos|concurso|processo seletivo|oportunidade de trabalho)\b/i],
    ["Esportes", /\b(futebol|goiás esporte|vila nova|atlético-go|campeonato|jogo|partida|gol|série [abc])\b/i],
    ["Política", /\b(prefeito|prefeitura|vereador|câmara|deputad|governador|governo estadual|assembleia|eleição|política)\b/i],
    ["Trânsito", /\b(trânsito|rodovia|br-\d+|go-\d+|acidente|colisão|engarrafamento|interdiç|bloqueio|desvio)\b/i],
    ["Segurança", /\b(polícia|preso|prisão|crime|homicídio|assalto|roubo|furto|delegacia|suspeito|tiro|arma)\b/i],
    ["Eventos", /\b(show|festival|evento|agenda|feira|exposição|concerto|gastronomia|festa)\b/i],
    ["Economia", /\b(economia|preço|inflação|empresa|mercado|comércio|negócio|investimento|imposto|finanças)\b/i],
    ["Serviços", /\b(serviço|atendimento|prazo|saúde|vacina|hospital|energia|água|saneamento|benefício|documento)\b/i],
    ["Bairros", /\b(setor bueno|campinas|jardim goiás|setor oeste|setor marista|setor universitário|bairro|região noroeste|região leste|região sul)\b/i]
  ];
  for (const rule of rules) if (rule[1].test(s)) return rule[0];
  return "Goiânia";
}

function isAllowedArticleUrl(raw: string, source: RadarSource) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return source.hosts.some(function(h) {
      const base = h.replace(/^www\./, "");
      return host === h || host === base || host.endsWith("." + base);
    });
  } catch {
    return false;
  }
}

async function fetchText(url: string, timeout = 9000) {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ViralizougoianiaBot/1.0; +https://viralizougoiania.vercel.app)",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.7"
    }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return (await res.text()).slice(0, 3000000);
}

async function fetchSource(source: RadarSource): Promise<ImportedNews[]> {
  const xml = await fetchText(source.feedUrl, 10000);
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const items: ImportedNews[] = [];

  for (const block of blocks.slice(0, 30)) {
    const title = cleanText(tag(block, "title"));
    const link = absoluteUrl(feedLink(block), source.feedUrl);
    if (!title || !link || !isAllowedArticleUrl(link, source)) continue;

    const desc = cleanText(tag(block, "description") || tag(block, "summary"));
    const encoded = cleanText(tag(block, "content:encoded") || tag(block, "content"));
    const sourceText = encoded.length > desc.length ? encoded : desc;
    const pub = cleanText(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"));

    items.push({
      title: title,
      excerpt: desc || sourceText.slice(0, 220) || title,
      content: "",
      source_content: sourceText,
      category: classifyCategory(title, sourceText),
      image_url: feedImage(block, source.feedUrl),
      image_credit: "Foto: Reprodução / " + source.name,
      video_url: "",
      source_name: source.name,
      source_url: link,
      source_author: "",
      published_at: safeIso(pub)
    });
  }
  return items;
}

function dedupeIncoming(items: ImportedNews[], posts: Post[]) {
  const postUrls = new Set(posts.map(function(p) {
    return p.source_url ? canonicalUrl(p.source_url) : "";
  }).filter(Boolean));
  const postSlugs = new Set(posts.map(function(p) { return p.slug; }));
  const result: ImportedNews[] = [];
  const urls = new Set<string>();
  const slugs = new Set<string>();

  const sorted = items.slice().sort(function(a,b) {
    return +new Date(b.published_at || 0) - +new Date(a.published_at || 0);
  });

  for (const item of sorted) {
    const url = canonicalUrl(item.source_url);
    const slug = slugify(item.title);
    if (!url || postUrls.has(url) || urls.has(url) || postSlugs.has(slug) || slugs.has(slug)) continue;
    if (posts.some(function(p) { return titleSimilarity(p.title, item.title) >= 0.86; })) continue;
    if (result.some(function(p) { return titleSimilarity(p.title, item.title) >= 0.86; })) continue;
    urls.add(url);
    slugs.add(slug);
    result.push(item);
  }
  return result;
}

async function parallelMap<T,R>(items: T[], concurrency: number, worker: (item:T,index:number)=>Promise<R>) {
  const out = new Array<R>(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await worker(items[index], index);
    }
  }
  const count = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: count }, function() { return runner(); }));
  return out;
}

function planSchedule(items: ImportedNews[], posts: Post[], intervalMinutes: number) {
  const future = posts
    .filter(function(p) {
      return p.status === "scheduled" && p.published_at && new Date(p.published_at).getTime() > Date.now();
    })
    .sort(function(a,b) {
      return +new Date(a.published_at || 0) - +new Date(b.published_at || 0);
    });

  let baseTime = Date.now();
  if (future.length) baseTime = Math.max(baseTime, +new Date(future[future.length - 1].published_at || 0));

  const groups = new Map<string, ImportedNews[]>();
  for (const item of items) {
    const cat = item.category || "Goiânia";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  const planned: Array<{item:ImportedNews; publishedAt:string}> = [];
  let step = 1;
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    groups.forEach(function(list) {
      const item = list.shift();
      if (!item) return;
      hasMore = true;
      planned.push({
        item: item,
        publishedAt: new Date(baseTime + step * intervalMinutes * 60000).toISOString()
      });
    });
    if (hasMore) step++;
  }
  return planned;
}

export type AutomationRunResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  found: number;
  newItems: number;
  added: number;
  published: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
};

export async function runServerRadarAutomation(options: { force?: boolean } = {}): Promise<AutomationRunResult> {
  const startedAt = new Date().toISOString();
  const state = await getAutomationState();

  if (!options.force && !state.enabled) {
    return { ok:true, skipped:true, reason:"paused", found:0, newItems:0, added:0, published:0, errors:[], startedAt:startedAt, finishedAt:new Date().toISOString() };
  }

  if (!options.force && state.running_until && new Date(state.running_until).getTime() > Date.now()) {
    return { ok:true, skipped:true, reason:"already-running", found:0, newItems:0, added:0, published:0, errors:[], startedAt:startedAt, finishedAt:new Date().toISOString() };
  }

  const intervalMinutes = Math.max(10, Number(state.interval_minutes || 10));
  await saveAutomationState({
    running_until: new Date(Date.now() + 8 * 60000).toISOString(),
    last_run_at: startedAt,
    last_error: ""
  });

  const errors: string[] = [];
  let found = 0;
  let newItems = 0;
  let added = 0;
  let published = 0;

  try {
    const released = await publishDuePosts();
    published = released.length;

    const result = await Promise.all([
      getPosts({ includeDrafts: true }),
      getCategories({ includeInactive: false }),
      Promise.allSettled(SOURCES.map(fetchSource))
    ]);

    const posts = result[0] as Post[];
    const categories = result[1] as Awaited<ReturnType<typeof getCategories>>;
    const sourceResults = result[2] as PromiseSettledResult<ImportedNews[]>[];

    const all: ImportedNews[] = [];
    sourceResults.forEach(function(sourceResult, index) {
      if (sourceResult.status === "fulfilled") {
        all.push.apply(all, sourceResult.value);
      } else {
        const reason = sourceResult.reason instanceof Error ? sourceResult.reason.message : "falha no feed";
        errors.push(SOURCES[index].name + ": " + reason);
      }
    });
    found = all.length;

    const categoryNames = new Set(categories.map(function(c) { return c.name.toLowerCase(); }));
    all.forEach(function(item) {
      if (!item.category || !categoryNames.has(item.category.toLowerCase())) item.category = "Goiânia";
    });

    const unseen = dedupeIncoming(all, posts);
    newItems = unseen.length;
    const planned = planSchedule(unseen, posts, intervalMinutes);

    const created = await parallelMap(planned, 6, async function(plannedItem) {
      const item = plannedItem.item;
      const sourceText = item.source_content || item.excerpt || item.title;
      const content = formatViralizouArticle({
        title: item.title,
        excerpt: item.excerpt,
        sourceText: sourceText,
        sourceName: item.source_name
      });

      try {
        return await createPost({
          slug: slugify(item.title),
          title: item.title,
          excerpt: item.excerpt || item.title,
          content: content,
          source_content: sourceText,
          category: item.category || "Goiânia",
          city: "Goiânia",
          author: item.source_author ? item.source_author + " | " + item.source_name : (item.source_name || "Redação"),
          image_url: item.image_url || "",
          image_credit: item.image_credit || ("Foto: Reprodução / " + (item.source_name || "Fonte")),
          video_url: item.video_url || "",
          featured: false,
          status: "scheduled" as PostStatus,
          published_at: plannedItem.publishedAt,
          source_name: item.source_name || "",
          source_url: item.source_url || "",
          source_author: item.source_author || "",
          seo_title: item.title,
          seo_description: item.excerpt || item.title,
          seo_keywords: "Goiânia, Goiás, " + (item.category || "Goiânia")
        });
      } catch (e) {
        errors.push("Agendamento: " + (e instanceof Error ? e.message : "erro desconhecido"));
        return null;
      }
    });

    added = created.filter(Boolean).length;

    const finishedAt = new Date().toISOString();
    await saveAutomationState({
      running_until: null,
      last_success_at: finishedAt,
      next_run_at: new Date(Date.now() + intervalMinutes * 60000).toISOString(),
      last_found: found,
      last_added: added,
      last_published: published,
      last_hydrated: 0,
      last_error: errors.join(" | ").slice(0, 1500)
    });

    return { ok:true, found:found, newItems:newItems, added:added, published:published, errors:errors, startedAt:startedAt, finishedAt:finishedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    errors.push(message);
    const finishedAt = new Date().toISOString();
    try {
      await saveAutomationState({
        running_until: null,
        next_run_at: new Date(Date.now() + intervalMinutes * 60000).toISOString(),
        last_error: errors.join(" | ").slice(0, 1500)
      });
    } catch {}
    return { ok:false, found:found, newItems:newItems, added:added, published:published, errors:errors, startedAt:startedAt, finishedAt:finishedAt };
  }
}
