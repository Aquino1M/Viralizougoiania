import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getAnalyticsOverview } from "@/lib/audience-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ analytics: await getAnalyticsOverview() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar audiência." }, { status: 500 });
  }
}
