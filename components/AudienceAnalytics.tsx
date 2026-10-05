"use client";

import { useEffect, useMemo, useState } from "react";

type Overview = {
  today: { visitors: number; pageviews: number; articleViews: number };
  month: { visitors: number; pageviews: number; articleViews: number };
  average30: { visitors: number; pageviews: number; articleViews: number };
  daily: Array<{ date: string; visitors: number; pageviews: number; articleViews: number }>;
  topPages: Array<{ path: string; visitors: number; pageviews: number }>;
  topArticles: Array<{ path: string; visitors: number; pageviews: number }>;
  trackingSince: string | null;
};

export default function AudienceAnalytics({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Erro ao carregar audiência.");
      setData(body.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar audiência.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const maxVisitors = useMemo(
    () => Math.max(1, ...(data?.daily || []).map((d) => Number(d.visitors || 0))),
    [data],
  );

  function articleLabel(path: string) {
    const slug = path.replace(/^\/noticia\//, "").replace(/\/$/, "");
    if (!slug) return path;
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h1>📊 Audiência & Patrocínio</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Cada abertura do portal conta como 1 visitante. Abrir uma matéria também soma +1 visitante e +1 visualização da matéria.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={load} disabled={loading}>↻ Atualizar dados</button>
          <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {loading && !data ? <div className="empty">Carregando audiência...</div> : null}

      {data && (
        <>
          <div className="audienceSummaryGrid">
            <div className="audienceMetric">
              <b>{Number(data.today.visitors || 0).toLocaleString("pt-BR")}</b>
              <span>Visitantes hoje</span>
              <small>Cada abertura do site ou matéria soma +1</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.month.visitors || 0).toLocaleString("pt-BR")}</b>
              <span>Visitantes no mês</span>
              <small>Total de acessos registrados no mês</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.average30.visitors || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</b>
              <span>Média diária de visitantes</span>
              <small>Média dos últimos 30 dias</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.today.articleViews || 0).toLocaleString("pt-BR")}</b>
              <span>Matérias vistas hoje</span>
              <small>Cada abertura de notícia soma +1</small>
            </div>
          </div>

          <div className="audienceSponsorBox">
            <b>Resumo para patrocinadores:</b>{" "}
            neste mês o Viralizougoiania registrou <b>{Number(data.month.visitors || 0).toLocaleString("pt-BR")} visitas</b>, com média de{" "}
            <b>{Number(data.average30.visitors || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} visitantes por dia</b> e{" "}
            <b>{Number(data.month.articleViews || 0).toLocaleString("pt-BR")} visualizações de matérias</b>.
          </div>

          <div className="field full">
            <label>📈 Visitantes por dia — últimos 30 dias</label>
            <div className="audienceChart">
              {(data.daily || []).map((day) => {
                const height = Math.max(2, Math.round((Number(day.visitors || 0) / maxVisitors) * 145));
                const date = new Date(day.date + "T12:00:00");
                return (
                  <div className="audienceBarWrap" key={day.date} title={`${date.toLocaleDateString("pt-BR")}: ${day.visitors} visitantes / ${day.articleViews} matérias vistas`}>
                    <div className="audienceBar" style={{ height }} />
                    <small>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="field full" style={{ marginTop: 18 }}>
            <label>🔥 Matérias mais vistas — últimos 30 dias</label>
            {(data.topArticles || []).length ? (
              <table className="audienceTopPages">
                <thead><tr><th>Matéria</th><th>Visualizações</th></tr></thead>
                <tbody>
                  {data.topArticles.map((row) => (
                    <tr key={row.path}>
                      <td title={row.path}>{articleLabel(row.path)}</td>
                      <td>{Number(row.pageviews || 0).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">As matérias mais vistas aparecem aqui conforme forem abertas pelos leitores.</div>}
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: "#64748b" }}>
            Neste painel, “visitante” significa uma visita/acesso: abrir a capa conta +1 e abrir uma matéria conta +1 novamente.
            Não usamos endereço IP para limitar essa contagem.
            {data.trackingSince ? <> Coleta iniciada em {new Date(data.trackingSince).toLocaleString("pt-BR")}.</> : null}
          </div>
        </>
      )}
    </section>
  );
}
