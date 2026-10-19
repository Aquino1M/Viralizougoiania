import { NextResponse } from "next/server";
import {
  getRealOficialStatus,
  fetchRealOficialSfxCatalog,
  DEFAULT_REAL_OFICIAL_TRACKS,
  getRealOficialToken,
  setRealOficialInMemoryToken,
} from "@/lib/real-oficial-client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || req.headers.get("x-real-oficial-token");
    if (queryToken && queryToken.trim().length >= 3) {
      setRealOficialInMemoryToken(queryToken.trim());
    }

    const status = getRealOficialStatus();
    const { sfx, source, connected } = await fetchRealOficialSfxCatalog();

    return NextResponse.json({
      ok: true,
      status,
      tokenStatus: status, // compatibilidade
      connected: status.configured || connected,
      source,
      sfx,
      sfxCatalog: sfx, // compatibilidade
      tracks: DEFAULT_REAL_OFICIAL_TRACKS,
      instructions: {
        vercelKey: "REAL_OFICIAL_TOKEN",
        description:
          "Configure a variável de ambiente REAL_OFICIAL_TOKEN nas configurações do seu projeto na Vercel (Project Settings > Environment Variables).",
      },
    });
  } catch (error) {
    console.error("[api/admin/real-oficial] Erro:", error);
    const status = getRealOficialStatus();
    return NextResponse.json(
      {
        ok: false,
        error: "Falha ao obter dados do Real Oficial",
        status,
        tokenStatus: status,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "test";

    const customToken = (body.token || body.apiKey || "").trim();
    if (customToken && customToken.length >= 3) {
      setRealOficialInMemoryToken(customToken);
    }

    const token = getRealOficialToken();
    const status = getRealOficialStatus();
    const { sfx, source, connected } = await fetchRealOficialSfxCatalog();

    if (action === "save" || action === "set-token") {
      return NextResponse.json({
        ok: true,
        connected: status.configured || connected,
        message: "Token do Real Oficial ativado e salvo com sucesso!",
        status,
        tokenStatus: status,
        source,
        sfx,
        sfxCatalog: sfx,
      });
    }

    if (action === "test") {
      if (!token) {
        return NextResponse.json({
          ok: false,
          connected: false,
          message:
            "A variável de ambiente REAL_OFICIAL_TOKEN não foi encontrada na Vercel ou localmente.",
          status,
          tokenStatus: status,
        });
      }

      return NextResponse.json({
        ok: true,
        connected: true,
        message: "Token do Real Oficial detectado e ativo com sucesso!",
        status,
        tokenStatus: status,
        sfx,
        sfxCatalog: sfx,
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
