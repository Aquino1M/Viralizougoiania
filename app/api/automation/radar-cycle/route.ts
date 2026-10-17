import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { automationConfigured } from "@/lib/automation-state";
import { runServerRadarAutomation } from "@/lib/server-radar-automation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!automationConfigured()) {
    return NextResponse.json({ error: "Supabase precisa estar configurado para executar a rotina manual." }, { status: 503 });
  }

  const result = await runServerRadarAutomation({ force: true, scopeMode: "all_news" });

  return NextResponse.json({
    ...result,
    server: "vercel",
  }, { status: result.ok ? 200 : 500 });
}
