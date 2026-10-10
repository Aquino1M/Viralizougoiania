import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaUrl = (searchParams.get("url") || "").trim();
  const rawFilename = (searchParams.get("filename") || "viralizou-video.mp4").trim();
  const platform = (searchParams.get("platform") || "").toLowerCase();

  if (!mediaUrl) {
    return NextResponse.json({ error: "Parâmetro de URL obrigatório." }, { status: 400 });
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

    const response = await fetch(mediaUrl, {
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      // Se der erro ao buscar via stream direto, redireciona para a URL original da mídia
      return NextResponse.redirect(mediaUrl, { status: 302 });
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");

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
    // Fallback: redireciona para o link original do vídeo
    return NextResponse.redirect(mediaUrl, { status: 302 });
  }
}
