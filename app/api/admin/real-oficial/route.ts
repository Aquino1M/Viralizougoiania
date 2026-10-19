import { NextResponse } from "next/server";
import {
  getRealOficialStatus,
  fetchRealOficialSfxCatalog,
  DEFAULT_REAL_OFICIAL_TRACKS,
  getRealOficialToken,
} from "@/lib/real-oficial-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = getRealOficialStatus();
    const { sfx, source, connected } = await fetchRealOficialSfxCatalog();

    return NextResponse.json({
      ok: true,
      status,
      connected,
      source,
      sfx,
      tracks: DEFAULT_REAL_OFICIAL_TRACKS,
      instructions: {
        vercelKey: "REAL_OFICIAL_TOKEN",
        description:
          "Configure a variável de ambiente REAL_OFICIAL_TOKEN nas configurações do seu projeto na Vercel (Project Settings > Environment Variables).",
      },
    });
  } catch (error) {
    console.error("[api/admin/real-oficial] Erro:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Falha ao obter dados do Real Oficial",
        status: getRealOficialStatus(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "test";

    const token = getRealOficialToken();
    const status = getRealOficialStatus();

    if (action === "test") {
      if (!token) {
        return NextResponse.json({
          ok: false,
          connected: false,
          message:
            "A variável de ambiente REAL_OFICIAL_TOKEN não foi encontrada na Vercel ou localmente.",
          status,
        });
      }

      return NextResponse.json({
        ok: true,
        connected: true,
        message: "Token do Real Oficial detectado e ativo com sucesso!",
        status,
      });
    }

    return NextResponse.json({ ok: false, error: "Ação não reconhecida" }, { status: 400 });
  } catch (error) {
    console.error("[api/admin/real-oficial] Erro no POST:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar requisição" },
      { status: 500 }
    );
  }
}
