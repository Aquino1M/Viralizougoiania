function htmlDecode(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/");
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

function unescapeJsonUrl(value: string) {
  try {
    return JSON.parse('"' + value.replace(/"/g, '\\"') + '"');
  } catch {
    return value
      .replace(/\\u0026/g, "&")
      .replace(/\\u002F/gi, "/")
      .replace(/\\\//g, "/");
  }
}

function assertInstagramPostUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Use um link HTTPS do Instagram.");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) {
    throw new Error("Cole um link de instagram.com.");
  }
  if (!/^\/(?:reel|reels|p|tv)\//i.test(url.pathname)) {
    throw new Error("Cole o link direto de um Reel ou publicação com vídeo.");
  }
  url.hash = "";
  return url;
}

export type InstagramPublicVideo = {
  title: string;
  author: string;
  thumbnailUrl: string;
  mediaUrl: string;
  shortcode: string;
};

export async function resolvePublicInstagramVideo(rawUrl: string): Promise<InstagramPublicVideo> {
  const url = assertInstagramPostUrl(rawUrl);

  const response = await fetch(url.toString(), {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Instagram respondeu HTTP ${response.status}. Confirme se a publicação é pública.`);
  }

  const html = await response.text();
  const title = getMeta(html, ["og:title", "twitter:title"]) || "Vídeo do Instagram";
  const thumbnailUrl = getMeta(html, ["og:image", "twitter:image"]);
  const author = getMeta(html, ["instagram:creator", "author"]);

  let mediaUrl = getMeta(html, [
    "og:video:secure_url",
    "og:video",
    "twitter:player:stream",
  ]);

  if (!mediaUrl) {
    const patterns = [
      /"video_url"\s*:\s*"([^"]+)"/i,
      /"contentUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
      /"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"([^"]+)"/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        mediaUrl = unescapeJsonUrl(match[1]);
        break;
      }
    }
  }

  if (!mediaUrl) {
    throw new Error("O Instagram não expôs o arquivo de vídeo nesta página. O post pode exigir login, ser privado ou não ser um vídeo.");
  }

  const media = new URL(htmlDecode(mediaUrl));
  if (media.protocol !== "https:") throw new Error("O endereço do vídeo retornado pelo Instagram é inválido.");

  const shortcode = url.pathname.split("/").filter(Boolean)[1] || "video";
  return {
    title: htmlDecode(title).replace(/\s+/g, " ").trim(),
    author: htmlDecode(author).trim(),
    thumbnailUrl,
    mediaUrl: media.toString(),
    shortcode: shortcode.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "video",
  };
}
