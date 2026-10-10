import { NextResponse } from "next/server";
import { resolveUniversalVideo, detectPlatform } from "@/lib/universal-video-downloader";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUrl = String(body?.url || "").trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Por favor, informe o link do vídeo (Instagram, TikTok ou Twitter/X)." },
        { status: 400 }
      );
    }

    const resolved = await resolveUniversalVideo(rawUrl);
    const safeSlug = slugify(resolved.title).slice(0, 50) || `${resolved.platform}-video`;
    const filename = `viralizou-${resolved.platform}-${safeSlug}.mp4`;

    const downloadProxyUrl = `/api/video-downloader/download?url=${encodeURIComponent(
      resolved.mediaUrl
    )}&filename=${encodeURIComponent(filename)}&platform=${encodeURIComponent(resolved.platform)}`;

    return NextResponse.json({
      ...resolved,
      downloadUrl: downloadProxyUrl,
      directUrl: resolved.mediaUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível localizar o vídeo. Verifique se o link é público e tente novamente.",
      },
      { status: 400 }
    );
  }
}
