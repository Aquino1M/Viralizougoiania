import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { inspectInstagramSession } from "@/lib/instagram-browserbase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || "").trim();
    if (!sessionId) return NextResponse.json({ error: "Sessão obrigatória." }, { status: 400 });
    return NextResponse.json(await inspectInstagramSession(sessionId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível verificar a sessão." }, { status: 400 });
  }
}
