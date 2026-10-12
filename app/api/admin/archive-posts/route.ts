import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { archiveOldExternalPosts, getPostStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await archiveOldExternalPosts(0, { nonGoiasOnly: true });
    const stats = await getPostStats();
    return NextResponse.json({
      ok: true,
      result,
      stats,
      message: `${result.archived} matérias fora de Goiás foram arquivadas no Supabase. Notícias de Goiás e Goiânia foram 100% preservadas.`,
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
    let days = 0;
    let nonGoiasOnly = true;
    let allOlderThanDays = false;
    try {
      const body = await req.json();
      if (typeof body?.days === "number") days = body.days;
      if (typeof body?.nonGoiasOnly === "boolean") nonGoiasOnly = body.nonGoiasOnly;
      if (typeof body?.allOlderThanDays === "boolean") allOlderThanDays = body.allOlderThanDays;
    } catch {}

    const result = await archiveOldExternalPosts(days, { nonGoiasOnly, allOlderThanDays });
    const stats = await getPostStats();
    const msg = `Sucesso! ${result.archived} matérias fora de Goiás foram arquivadas no Supabase. Notícias de Goiás e Goiânia foram 100% preservadas no site.`;
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
