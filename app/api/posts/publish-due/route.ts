import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await publishDuePosts();
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao checar publicações agendadas" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
