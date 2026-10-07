import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { resolvePublicInstagramVideo } from "@/lib/instagram-public";
import { resolveInstagramWithBrowser } from "@/lib/instagram-browserbase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const postUrl = (new URL(request.url).searchParams.get("url") || "").trim();
  if (!postUrl) return NextResponse.json({ error: "Link obrigatório." }, { status: 400 });

  try {
    const result = process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID
      ? await resolveInstagramWithBrowser(postUrl)
      : await resolvePublicInstagramVideo(postUrl);

    const response = await fetch(result.mediaUrl, {
      redirect: "follow", cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(45000),
    });
    const type = response.headers.get("content-type") || "video/mp4";
    if (!response.ok || !type.toLowerCase().startsWith("video/")) throw new Error("O Instagram encontrou o Reel, mas não liberou o MP4 para o servidor.");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 300_000_000) return NextResponse.json({ error: "Vídeo acima do limite de 300 MB." }, { status: 413 });

    const headers = new Headers();
    headers.set("Content-Type", type);
    headers.set("Content-Disposition", 'attachment; filename="instagram-reel.mp4"');
    headers.set("Cache-Control", "private, no-store");
    if (length > 0) headers.set("Content-Length", String(length));
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível baixar o vídeo." }, { status: 400 });
  }
}
