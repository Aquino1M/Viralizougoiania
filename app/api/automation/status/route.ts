import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { automationConfigured, getAutomationState, saveAutomationState } from "@/lib/automation-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getAutomationState();
  return NextResponse.json({
    configured: automationConfigured(),
    state,
    scheduler: "GitHub Actions → Vercel",
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!automationConfigured()) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (body.interval_minutes !== undefined) patch.interval_minutes = Math.max(10, Number(body.interval_minutes) || 10);
    const allowedQueueModes = new Set(["1_per_10m", "2_per_10m", "3_per_10m", "1_per_category", "3_per_category"]);
    if (typeof body.queue_mode === "string" && allowedQueueModes.has(body.queue_mode)) patch.queue_mode = body.queue_mode;

    const state = await saveAutomationState(patch);
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar automação" }, { status: 500 });
  }
}
