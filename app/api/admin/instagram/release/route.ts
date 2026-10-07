import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { releaseInstagramSession } from "@/lib/instagram-browserbase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || "").trim();
    if (sessionId) await releaseInstagramSession(sessionId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
