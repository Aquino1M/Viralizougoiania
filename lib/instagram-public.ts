function htmlDecode(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x3D;/gi, "=");
}

function getMeta(html: string, keys: string[]) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const key of keys) {
    for (const tag of tags) {
      const property = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (property !== key.toLowerCase()) continue;
      const content = tag.match(/content\s*=\s*["']([\s\S]*?)["']/i)?.[1] || "";
      if (content) return htmlDecode(content);
    }
  }
  return "";
}

function normalizeEscapedUrl(value: string) {
  let next = htmlDecode(value.trim())
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0025/gi, "%")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003D/gi, "=")
    .replace(/\\\//g, "/")
    .replace(/\\&/g, "&");

  try {
    // JSON.stringify handles quotes/backslashes safely before parsing escapes.
    const wrapped = JSON.stringify(next).slice(1, -1);
    next = JSON.parse('"' + wrapped + '"');
  } catch {}

  return htmlDecode(next);
}

function assertInstagramPostUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Use um link HTTPS do Instagram.");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) {
    throw new Error("Cole um link de instagram.com.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length || !["reel", "reels", "p", "tv"].includes(parts[0].toLowerCase()) || !parts[1]) {
    throw new Error("Cole o link direto de um Reel ou publicação com vídeo.");
  }

  const shortcode = parts[1].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!shortcode) throw new Error("Não foi possível identificar o código da publicação.");

  return { url, shortcode };
}

async function fetchInstagramHtml(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) return "";
  const html = await response.text();
  if (!html || html.length < 500) return "";
  return html;
}

function extractJsonLdVideo(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;
        if (typeof item.contentUrl === "string" && /^https?:/i.test(item.contentUrl)) return item.contentUrl;
        for (const value of Object.values(item)) {
          if (value && typeof value === "object") queue.push(value);
        }
      }
    } catch {}
  }
  return "";
}

function extractVideoUrl(html: string) {
  const meta = getMeta(html, [
    "og:video:secure_url",
    "og:video",
    "og:video:url",
    "twitter:player:stream",
  ]);
  if (meta) return normalizeEscapedUrl(meta);

  const tagPatterns = [
    /<video\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i,
    /<source\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*type\s*=\s*["']video\//i,
  ];
  for (const pattern of tagPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return normalizeEscapedUrl(match[1]);
  }

  const jsonLd = extractJsonLdVideo(html);
  if (jsonLd) return normalizeEscapedUrl(jsonLd);

  const jsonPatterns = [
    /"video_url"\s*:\s*"((?:\\.|[^"])*)"/i,
    /"contentUrl"\s*:\s*"((?:\\.|[^"])*)"/i,
    /"content_url"\s*:\s*"((?:\\.|[^"])*)"/i,
    /"playback_url"\s*:\s*"((?:\\.|[^"])*)"/i,
    /"video_versions"\s*:\s*\[\s*\{[\s\S]{0,1500}?"url"\s*:\s*"((?:\\.|[^"])*)"/i,
    /"progressive_download_url"\s*:\s*"((?:\\.|[^"])*)"/i,
  ];
  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const value = normalizeEscapedUrl(match[1]);
      if (/^https?:\/\//i.test(value)) return value;
    }
  }

  // Último recurso: procura uma URL HTTPS de MP4 codificada no HTML público.
  const loose = html.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4(?:[^"'<>\s]*)?/i);
  return loose?.[0] ? normalizeEscapedUrl(loose[0]) : "";
}

function extractTitle(html: string) {
  return (
    getMeta(html, ["og:title", "twitter:title"]) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    "Vídeo do Instagram"
  );
}

export type InstagramPublicVideo = {
  title: string;
  author: string;
  thumbnailUrl: string;
  mediaUrl: string;
  shortcode: string;
};

export async function resolvePublicInstagramVideo(rawUrl: string): Promise<InstagramPublicVideo> {
  const { url, shortcode } = assertInstagramPostUrl(rawUrl);

  // Usa apenas páginas públicas do próprio Instagram. O embed costuma expor
  // mídia pública mesmo quando a página normal entrega HTML reduzido ao servidor.
  const candidates = Array.from(new Set([
    url.toString(),
    `https://www.instagram.com/reel/${shortcode}/embed/`,
    `https://www.instagram.com/p/${shortcode}/embed/`,
    `https://www.instagram.com/reel/${shortcode}/embed/captioned/`,
  ]));

  let bestHtml = "";
  let mediaUrl = "";
  let title = "";
  let thumbnailUrl = "";
  let author = "";

  for (const candidate of candidates) {
    const html = await fetchInstagramHtml(candidate).catch(() => "");
    if (!html) continue;

    if (!bestHtml || html.length > bestHtml.length) bestHtml = html;
    if (!title) title = extractTitle(html);
    if (!thumbnailUrl) thumbnailUrl = getMeta(html, ["og:image", "twitter:image"]);
    if (!author) author = getMeta(html, ["instagram:creator", "author"]);

    const found = extractVideoUrl(html);
    if (found) {
      mediaUrl = found;
      break;
    }
  }

  if (!bestHtml) {
    throw new Error("O Instagram bloqueou a leitura pública desta página no servidor. Tente novamente em alguns segundos.");
  }

  if (!mediaUrl) {
    throw new Error("Não consegui localizar o arquivo MP4 nesse Reel público. O Instagram pode ter mudado a página ou exigido autenticação para esse post.");
  }

  let media: URL;
  try {
    media = new URL(htmlDecode(mediaUrl));
  } catch {
    throw new Error("O Instagram retornou um endereço de vídeo inválido.");
  }

  if (media.protocol !== "https:") {
    throw new Error("O endereço do vídeo retornado pelo Instagram é inválido.");
  }

  return {
    title: htmlDecode(title || "Vídeo do Instagram").replace(/\s+/g, " ").trim(),
    author: htmlDecode(author).trim(),
    thumbnailUrl: htmlDecode(thumbnailUrl),
    mediaUrl: media.toString(),
    shortcode,
  };
}
