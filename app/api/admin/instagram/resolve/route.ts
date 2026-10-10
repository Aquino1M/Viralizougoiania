import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { resolvePublicInstagramVideo } from "@/lib/instagram-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const originalUrl = String(body?.url || "").trim();
    if (!originalUrl) return NextResponse.json({ error: "Link obrigatório." }, { status: 400 });
    const result = await resolvePublicInstagramVideo(originalUrl);
    return NextResponse.json({
      title: result.title,
      author: result.author,
      thumbnailUrl: result.thumbnailUrl,
      downloadUrl: "/api/admin/instagram/download?url=" + encodeURIComponent(originalUrl),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível localizar o vídeo." }, { status: 400 });
  }
}
