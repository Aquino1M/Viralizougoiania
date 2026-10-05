import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getPostStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ stats: await getPostStats() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao contar notícias." }, { status: 500 });
  }
}
