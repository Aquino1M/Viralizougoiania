import fs from "node:fs/promises";
import path from "node:path";
import { BRASILEIRAO_STANDINGS, ROUND_FIXTURES, type StandingRow, type MatchFixture } from "@/lib/football-data";
import { hasSupabaseConfig } from "@/lib/storage";

export interface StoredFootballData {
  standings: StandingRow[];
  fixtures: MatchFixture[];
  currentRound: number;
  updated_at: string;
}

const localFootballFile = path.join(process.cwd(), "data", "football.json");

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

function normalizeRecentForm(raw: unknown): ("W" | "D" | "L")[] {
  if (!Array.isArray(raw)) return ["W", "W", "W", "W", "W"];
  return raw.slice(-5).map((r) => {
    const s = String(r).toLowerCase();
    if (s === "v" || s === "w") return "W";
    if (s === "e") return "D";
    return "L";
  });
}

export function parseGeFootballData(html: string): {
  standings: StandingRow[];
  fixtures: MatchFixture[];
  currentRound: number;
} {
  let standings: StandingRow[] = [];
  let fixtures: MatchFixture[] = [];
  let currentRound = 1;

  // 1. Extração da Classificação Oficial
  const classMatch = html.match(/const\s+classificacao\s*=\s*(\{[\s\S]*?\});\s*(?:const|<)/);
  if (classMatch) {
    try {
      const parsed = JSON.parse(classMatch[1]);
      const list = parsed.classificacao || [];
      standings = list.map((item: any) => {
        const teamCode = String(item.sigla || "TIME").toUpperCase();
        return {
          position: Number(item.ordem) || 0,
          teamCode,
          teamName: item.nome_popular || teamCode,
          points: Number(item.pontos) || 0,
          played: Number(item.jogos) || 0,
          won: Number(item.vitorias) || 0,
          drawn: Number(item.empates) || 0,
          lost: Number(item.derrotas) || 0,
          goalsFor: Number(item.gols_pro) || 0,
          goalsAgainst: Number(item.gols_contra) || 0,
          goalDiff: Number(item.saldo_gols) || 0,
          percentage: Number(item.aproveitamento) || 0,
          recentForm: normalizeRecentForm(item.ultimos_jogos),
        };
      });
    } catch (err) {
      console.warn("Erro ao fazer parse da classificacao do GE:", err);
    }
  }

  // 2. Extração da Rodada Atual
  const roundMatch = html.match(/"rodada"\s*:\s*(\d+)/) || html.match(/(\d+)ª\s*rodada/i);
  if (roundMatch && roundMatch[1]) {
    currentRound = Number(roundMatch[1]);
  }

  // 3. Extração dos Jogos e Placares da Rodada
  const jogosMatch = html.match(/const\s+listaJogos\s*=\s*(\[[\s\S]*?\]);\s*const/);
  if (jogosMatch) {
    try {
      const list = JSON.parse(jogosMatch[1]);
      fixtures = list.map((item: any, idx: number) => {
        const home = item.equipes?.mandante || {};
        const away = item.equipes?.visitante || {};
        const rawDate = item.data_realizacao ? new Date(item.data_realizacao) : null;
        let dateStr = "A definir";
        let timeStr = item.hora_realizacao || "--:--";

        if (rawDate && !Number.isNaN(rawDate.getTime())) {
          const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
          const dayName = days[rawDate.getDay()];
          const dayNum = String(rawDate.getDate()).padStart(2, "0");
          const monthNum = String(rawDate.getMonth() + 1).padStart(2, "0");
          dateStr = `${dayName}, ${dayNum}/${monthNum}`;
        }

        const isFinished =
          item.transmissao?.broadcast?.id === "ENCERRADA" ||
          Boolean(item.jogo_ja_comecou && item.placar_oficial_mandante !== null && item.placar_oficial_visitante !== null);

        return {
          id: String(item.id || `match-${idx + 1}`),
          round: currentRound,
          dateStr,
          timeStr,
          stadium: item.sede?.nome_popular || "A definir",
          homeTeamCode: String(home.sigla || "MAND").toUpperCase(),
          awayTeamCode: String(away.sigla || "VISI").toUpperCase(),
          homeScore: typeof item.placar_oficial_mandante === "number" ? item.placar_oficial_mandante : undefined,
          awayScore: typeof item.placar_oficial_visitante === "number" ? item.placar_oficial_visitante : undefined,
          status: isFinished ? "finished" : item.jogo_ja_comecou ? "live" : "scheduled",
        };
      });
    } catch (err) {
      console.warn("Erro ao fazer parse dos jogos do GE:", err);
    }
  }

  return { standings, fixtures, currentRound };
}

// Salva os dados no Supabase se configurado
async function saveToSupabase(data: StoredFootballData) {
  if (!hasSupabaseConfig()) return;
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  try {
    const payload = {
      id: "brasileirao",
      standings: data.standings,
      fixtures: data.fixtures,
      current_round: data.currentRound,
      updated_at: data.updated_at,
    };
    await fetch(`${url}/rest/v1/football_data?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Aviso ao salvar football_data no Supabase:", err);
  }
}

// Lê do Supabase se configurado
async function readFromSupabase(): Promise<StoredFootballData | null> {
  if (!hasSupabaseConfig()) return null;
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  try {
    const res = await fetch(`${url}/rest/v1/football_data?id=eq.brasileirao&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows?.[0]) {
      return {
        standings: rows[0].standings || [],
        fixtures: rows[0].fixtures || [],
        currentRound: rows[0].current_round || 1,
        updated_at: rows[0].updated_at || new Date().toISOString(),
      };
    }
  } catch {}
  return null;
}

// Lê dados do arquivo local
async function readLocalFootballData(): Promise<StoredFootballData | null> {
  try {
    const raw = await fs.readFile(localFootballFile, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Escreve dados no arquivo local
async function writeLocalFootballData(data: StoredFootballData) {
  try {
    await fs.mkdir(path.dirname(localFootballFile), { recursive: true });
    await fs.writeFile(localFootballFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Erro ao salvar localFootballFile:", err);
  }
}

// Sincroniza tabela e rodadas ao vivo dos portais oficiais de esporte
export async function syncBrasileiraoData(): Promise<StoredFootballData> {
  try {
    const res = await fetch("https://ge.globo.com/futebol/brasileirao-serie-a/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`Fonte retornou status ${res.status}`);
    }

    const html = await res.text();
    const parsed = parseGeFootballData(html);

    if (!parsed.standings.length) {
      throw new Error("Não foi possível extrair a tabela da fonte");
    }

    const data: StoredFootballData = {
      standings: parsed.standings,
      fixtures: parsed.fixtures.length ? parsed.fixtures : ROUND_FIXTURES,
      currentRound: parsed.currentRound || 1,
      updated_at: new Date().toISOString(),
    };

    // Salva em paralelo localmente e no Supabase
    await Promise.all([
      writeLocalFootballData(data),
      saveToSupabase(data),
    ]);

    return data;
  } catch (err: any) {
    console.warn("Aviso ao sincronizar dados ao vivo do Brasileirão:", err.message);
    // Em caso de falha de conexão na fonte, retorna do cache local ou dados base
    const cached = (await readFromSupabase()) || (await readLocalFootballData());
    if (cached && cached.standings.length) {
      return cached;
    }
    return {
      standings: BRASILEIRAO_STANDINGS,
      fixtures: ROUND_FIXTURES,
      currentRound: 26,
      updated_at: new Date().toISOString(),
    };
  }
}

// Retorna os dados mais recentes (com auto-atualização se tiver mais de 15 minutos)
export async function getLiveFootballData(options?: { forceFresh?: boolean }): Promise<StoredFootballData> {
  const cached = (await readFromSupabase()) || (await readLocalFootballData());

  if (cached && cached.standings.length && !options?.forceFresh) {
    const ageMin = (Date.now() - new Date(cached.updated_at).getTime()) / 60000;
    // Se foi atualizado há menos de 15 minutos, usa o cache instantâneo
    if (ageMin < 15) {
      return cached;
    }
  }

  // Se estiver desatualizado ou forçado, sincroniza
  return await syncBrasileiraoData();
}
