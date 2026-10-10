import { resolvePublicInstagramVideo } from "@/lib/instagram-public";

export type DownloadPlatform = "tiktok" | "instagram" | "twitter" | "generic";

export type ResolvedMedia = {
  platform: DownloadPlatform;
  platformLabel: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  mediaUrl: string;
  downloadUrl: string;
  format: "mp4" | "video";
  watermarkFree: boolean;
};

function cleanTitle(text = ""): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[#@][\w.-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

export function detectPlatform(rawUrl: string): DownloadPlatform {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("tiktok.com") || host.includes("douyin.com")) return "tiktok";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
  } catch {}
  return "generic";
}

/**
 * 1. TikTok Engine (Sem marca d'água via TikWM / Aweme)
 * Inspirado nas arquiteturas do tiktok-dlp e OmniDL
 */
async function resolveTikTok(url: string): Promise<ResolvedMedia> {
  // TikWM API pública e direta (retorna MP4 sem marca d'água)
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url.trim())}&hd=1`;
  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Falha ao conectar ao servidor do TikTok (HTTP ${response.status}).`);
  }

  const data = await response.json().catch(() => ({}));
  if (data.code === 0 && data.data) {
    const videoDirect = data.data.hdplay || data.data.play || data.data.wmplay;
    if (!videoDirect) {
      throw new Error("O vídeo do TikTok não possui link direto de reprodução.");
    }

    const fullMediaUrl = videoDirect.startsWith("http")
      ? videoDirect
      : `https://www.tikwm.com${videoDirect}`;

    const title = cleanTitle(data.data.title) || "Vídeo TikTok sem marca d'água";
    const author = data.data.author?.unique_id
      ? `@${data.data.author.unique_id}`
      : data.data.author?.nickname || "TikTok";
    const thumb = data.data.cover || data.data.origin_cover || "";

    return {
      platform: "tiktok",
      platformLabel: "TikTok (Sem marca d'água)",
      title,
      author,
      thumbnailUrl: thumb,
      mediaUrl: fullMediaUrl,
      downloadUrl: "",
      format: "mp4",
      watermarkFree: true,
    };
  }

  throw new Error(data.msg || "Não foi possível extrair o vídeo do TikTok sem marca d'água.");
}

/**
 * 2. Twitter / X Engine (vxtwitter e fxtwitter API)
 * Inspirado nas arquiteturas do OmniDL e multiplatform-downloader
 */
async function resolveTwitter(url: string): Promise<ResolvedMedia> {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:[a-zA-Z0-9_]+)\/status\/(\d+)/i) || url.match(/\/status\/(\d+)/i);
  if (!match || !match[1]) {
    throw new Error("Link do Twitter/X inválido. Use um link no formato x.com/usuario/status/...");
  }

  const statusId = match[1];

  // Tentativa 1: VxTwitter API
  try {
    const vxUrl = `https://api.vxtwitter.com/Twitter/status/${statusId}`;
    const res = await fetch(vxUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const mediaList = data.media_extended || [];
      const videoItem = mediaList.find((m: any) => m.type === "video" || m.type === "gif");

      const videoUrl = videoItem?.url || data.video_url || (data.mediaURLs && data.mediaURLs.find((u: string) => /\.mp4(\?|$)/i.test(u)));
      if (videoUrl) {
        return {
          platform: "twitter",
          platformLabel: "Twitter / X",
          title: cleanTitle(data.text) || "Vídeo do Twitter/X",
          author: data.user_screen_name ? `@${data.user_screen_name}` : data.user_name || "Twitter/X",
          thumbnailUrl: videoItem?.thumbnail_url || data.mediaURLs?.[0] || "",
          mediaUrl: videoUrl,
          downloadUrl: "",
          format: "mp4",
          watermarkFree: true,
        };
      }
    }
  } catch {}

  // Tentativa 2: FxTwitter API
  try {
    const fxUrl = `https://api.fxtwitter.com/status/${statusId}`;
    const res = await fetch(fxUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const tweet = data.tweet;
      const video = tweet?.media?.videos?.[0];
      if (video?.url) {
        return {
          platform: "twitter",
          platformLabel: "Twitter / X",
          title: cleanTitle(tweet.text) || "Vídeo do Twitter/X",
          author: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : tweet.author?.name || "Twitter/X",
          thumbnailUrl: video.thumbnail_url || "",
          mediaUrl: video.url,
          downloadUrl: "",
          format: "mp4",
          watermarkFree: true,
        };
      }
    }
  } catch {}

  throw new Error("Não foi possível encontrar vídeo público neste tweet do Twitter/X.");
}

/**
 * 3. Instagram Reels & Vídeos
 */
async function resolveInstagram(url: string): Promise<ResolvedMedia> {
  const result = await resolvePublicInstagramVideo(url);
  return {
    platform: "instagram",
    platformLabel: "Instagram Reels",
    title: cleanTitle(result.title) || "Reel do Instagram",
    author: result.author || "Instagram",
    thumbnailUrl: result.thumbnailUrl,
    mediaUrl: result.mediaUrl,
    downloadUrl: "",
    format: "mp4",
    watermarkFree: true,
  };
}

/**
 * Waterfall Universal Resolver
 * Testa os melhores motores conforme o link enviado
 */
export async function resolveUniversalVideo(rawUrl: string): Promise<ResolvedMedia> {
  const url = rawUrl.trim();
  if (!url) throw new Error("Informe a URL do vídeo.");

  const platform = detectPlatform(url);

  if (platform === "tiktok") {
    return await resolveTikTok(url);
  }

  if (platform === "twitter") {
    return await resolveTwitter(url);
  }

  if (platform === "instagram") {
    return await resolveInstagram(url);
  }

  // Se a plataforma não for óbvia, tenta cascata automática
  try {
    return await resolveTikTok(url);
  } catch {
    try {
      return await resolveInstagram(url);
    } catch {
      return await resolveTwitter(url);
    }
  }
}
