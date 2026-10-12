import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { archiveOldExternalPosts, getPostStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await archiveOldExternalPosts(7);
    const stats = await getPostStats();
    return NextResponse.json({
      ok: true,
      result,
      stats,
      message: `${result.archived} matérias fora de Goiás (+7 dias) foram arquivadas no Supabase.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro ao arquivar matérias." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    let days = 7;
    try {
      const body = await req.json();
      if (typeof body?.days === "number" && body.days > 0) {
        days = body.days;
      }
    } catch {}

    const result = await archiveOldExternalPosts(days);
    const stats = await getPostStats();
    return NextResponse.json({
      ok: true,
      result,
      stats,
      message: `${result.archived} matérias fora de Goiás com mais de ${days} dias foram arquivadas no Supabase.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro ao arquivar matérias." },
      { status: 500 }
    );
  }
}
