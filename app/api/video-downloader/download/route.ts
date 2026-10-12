import { NextResponse } from "next/server";
import { runFfmpeg } from "@/lib/ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function isAllowedMediaHost(hostname: string, platform: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const suffixes: Record<string, string[]> = {
    tiktok: ["tikwm.com", "tiktok.com", "tiktokcdn.com", "tiktokcdn-us.com", "akamaized.net", "ibytedtos.com", "byteoversea.com", "byteimg.com"],
    instagram: ["instagram.com", "cdninstagram.com", "fbcdn.net"],
    twitter: ["twimg.com", "twitter.com", "x.com"],
  };
  return (suffixes[platform] || []).some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function safeMediaUrl(value: string, platform: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL de mídia inválida."); }
  if (url.protocol !== "https:" || url.username || url.password || !isAllowedMediaHost(url.hostname, platform)) {
    throw new Error("O servidor de mídia não pertence à plataforma do vídeo.");
  }
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaUrl = (searchParams.get("url") || "").trim();
  const rawFilename = (searchParams.get("filename") || "viralizou-video.mp4").trim();
  const platform = (searchParams.get("platform") || "").toLowerCase();
  const isWhatsapp = searchParams.get("whatsapp") === "1" || searchParams.get("compress") === "1";

  if (!mediaUrl) {
    return NextResponse.json({ error: "Parâmetro de URL obrigatório." }, { status: 400 });
  }
  if (!["tiktok", "instagram", "twitter"].includes(platform)) {
    return NextResponse.json({ error: "Plataforma de vídeo inválida." }, { status: 400 });
  }

  const safeFilename = rawFilename
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/\.mp4$/i, "")
    .concat(".mp4");

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
    };

    if (platform === "tiktok") {
      headers["Referer"] = "https://www.tiktok.com/";
    } else if (platform === "instagram") {
      headers["Referer"] = "https://www.instagram.com/";
    } else if (platform === "twitter") {
      headers["Referer"] = "https://twitter.com/";
    }

    let target = safeMediaUrl(mediaUrl, platform);
    let response: Response | null = null;
    for (let redirects = 0; redirects <= 5; redirects++) {
      response = await fetch(target, {
        headers,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location || redirects === 5) throw new Error("O servidor de mídia retornou redirecionamentos demais.");
      target = safeMediaUrl(new URL(location, target).toString(), platform);
    }

    if (!response || !response.ok) throw new Error(`Não foi possível baixar o vídeo (HTTP ${response?.status || "desconhecido"}).`);

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");
    if (!(contentType.toLowerCase().startsWith("video/") || contentType.toLowerCase().includes("application/octet-stream"))) {
      throw new Error("A plataforma não retornou um arquivo de vídeo válido.");
    }
    if (contentLength && Number(contentLength) > 300_000_000) {
      return NextResponse.json({ error: "O vídeo ultrapassa o limite de 300 MB." }, { status: 413 });
    }

    // Se solicitado formato WhatsApp, comprime e adiciona Faststart + YUV420P via FFmpeg
    if (isWhatsapp) {
      const tmpDir = os.tmpdir();
      const id = crypto.randomBytes(8).toString("hex");
      const inPath = path.join(tmpDir, `viralizou-dl-in-${id}.mp4`);
      const outPath = path.join(tmpDir, `viralizou-dl-out-${id}.mp4`);

      try {
        const arrayBuf = await response.arrayBuffer();
        await fs.writeFile(inPath, Buffer.from(arrayBuf));

        const ffmpegArgs = [
          "-y",
          "-threads", "0",
          "-i", inPath,
          "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
          "-map", "0:v:0",
          "-map", "0:a?",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-profile:v", "main",
          "-level", "4.0",
          "-preset", "veryfast",
          "-crf", "26",
          "-maxrate", "2800k",
          "-bufsize", "5600k",
          "-r", "30",
          "-c:a", "aac",
          "-b:a", "128k",
          "-ar", "44100",
          "-ac", "2",
          "-movflags", "+faststart",
          "-max_muxing_queue_size", "1024",
          outPath,
        ];

        const res = await runFfmpeg(ffmpegArgs);
        if (res.code === 0) {
          const compBuffer = await fs.readFile(outPath);
          const outName = safeFilename.replace(/\.mp4$/i, "") + "-whatsapp.mp4";
          return new NextResponse(compBuffer, {
            status: 200,
            headers: {
              "Content-Type": "video/mp4",
              "Content-Disposition": `attachment; filename="${outName}"`,
              "Content-Length": String(compBuffer.length),
              "Cache-Control": "no-store",
            },
          });
        }
      } catch (e) {
        console.warn("[download] Falha na compressão WhatsApp, entregando original:", e);
      } finally {
        await fs.unlink(inPath).catch(() => {});
        await fs.unlink(outPath).catch(() => {});
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Content-Disposition", `attachment; filename="${safeFilename}"`);
    responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    return new Response(response.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao baixar o vídeo." }, { status: 400 });
  }
}
