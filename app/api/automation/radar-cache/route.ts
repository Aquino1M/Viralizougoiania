import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getRadarSnapshot } from "@/lib/automation-state";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const snapshot = await getRadarSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
