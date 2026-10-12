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
    let nonGoiasOnly = false;
    let allOlderThanDays = true;
    try {
      const body = await req.json();
      if (typeof body?.days === "number") days = body.days;
      if (typeof body?.nonGoiasOnly === "boolean") nonGoiasOnly = body.nonGoiasOnly;
      if (typeof body?.allOlderThanDays === "boolean") allOlderThanDays = body.allOlderThanDays;
    } catch {}

    const result = await archiveOldExternalPosts(days, { nonGoiasOnly, allOlderThanDays });
    const stats = await getPostStats();
    const msg = nonGoiasOnly
      ? `${result.archived} matérias fora de Goiás foram arquivadas no Supabase.`
      : `${result.archived} matérias com mais de ${days} dias foram arquivadas no Supabase.`;
    return NextResponse.json({
      ok: true,
      result,
      stats,
      message: msg,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro ao arquivar matérias." },
      { status: 500 }
    );
  }
}
