import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { openInstagramLoginSession } from "@/lib/instagram-browserbase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await openInstagramLoginSession();
    return NextResponse.json({
      ...result,
      message: "Abra o navegador remoto, faça login no Instagram e depois volte ao painel para verificar a conexão.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o navegador remoto." }, { status: 503 });
  }
}
