import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { resolvePublicInstagramVideo } from "@/lib/instagram-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const postUrl = (searchParams.get("url") || "").trim();
  if (!postUrl) return NextResponse.json({ error: "Link obrigatório." }, { status: 400 });

  try {
    const result = await resolvePublicInstagramVideo(postUrl);

    const response = await fetch(result.mediaUrl, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(20000),
    });

    const type = response.headers.get("content-type") || "video/mp4";
    if (!response.ok || !type.toLowerCase().startsWith("video/")) {
      return NextResponse.json({ error: "O Instagram não liberou o arquivo de vídeo para download." }, { status: 502 });
    }

    const length = Number(response.headers.get("content-length") || 0);
    if (length > 300_000_000) {
      return NextResponse.json({ error: "Vídeo acima do limite de 300 MB." }, { status: 413 });
    }

    const headers = new Headers();
    headers.set("Content-Type", type);
    headers.set("Content-Disposition", `attachment; filename="instagram-${result.shortcode}.mp4"`);
    headers.set("Cache-Control", "private, no-store");
    if (length > 0) headers.set("Content-Length", String(length));

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível baixar o vídeo." },
      { status: 400 },
    );
  }
}
