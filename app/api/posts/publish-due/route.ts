import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const updated = await publishDuePosts();
    return NextResponse.json({
      ok: true,
      publishedCount: updated.length,
      published: updated.map((p) => ({ id: p.id, title: p.title, published_at: p.published_at })),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao checar publicações agendadas" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
