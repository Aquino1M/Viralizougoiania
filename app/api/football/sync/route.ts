import { NextResponse } from "next/server";
import { syncBrasileiraoData, getLiveFootballData } from "@/lib/football-sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    const data = force ? await syncBrasileiraoData() : await getLiveFootballData();

    return NextResponse.json({
      success: true,
      message: "Tabela e rodadas do Brasileirão sincronizadas com sucesso!",
      current_round: data.currentRound,
      total_teams: data.standings.length,
      total_fixtures: data.fixtures.length,
      updated_at: data.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao sincronizar futebol" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await syncBrasileiraoData();
    return NextResponse.json({
      success: true,
      message: "Tabela e jogos da rodada atualizados com sucesso da fonte oficial!",
      current_round: data.currentRound,
      total_teams: data.standings.length,
      total_fixtures: data.fixtures.length,
      updated_at: data.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao atualizar dados" },
      { status: 500 }
    );
  }
}
