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

  const maxViews = useMemo(
    () => Math.max(1, ...(data?.daily || []).map((d) => Number(d.pageviews || 0))),
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
            Cada abertura de página conta como uma visualização. Abrir uma matéria conta imediatamente como uma visualização da notícia.
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
              <b>{Number(data.today.pageviews || 0).toLocaleString("pt-BR")}</b>
              <span>Visualizações hoje</span>
              <small>Cada abertura de página conta 1 vez</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.month.pageviews || 0).toLocaleString("pt-BR")}</b>
              <span>Visualizações no mês</span>
              <small>Total de páginas abertas no portal</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.today.articleViews || 0).toLocaleString("pt-BR")}</b>
              <span>Matérias abertas hoje</span>
              <small>Cada abertura de /noticia/... conta</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.month.articleViews || 0).toLocaleString("pt-BR")}</b>
              <span>Matérias abertas no mês</span>
              <small>Visualizações acumuladas das notícias</small>
            </div>
          </div>

          <div className="audienceSponsorBox">
            <b>Resumo para patrocinadores:</b>{" "}
            neste mês o Viralizougoiania registrou <b>{Number(data.month.pageviews || 0).toLocaleString("pt-BR")} visualizações no portal</b>, sendo{" "}
            <b>{Number(data.month.articleViews || 0).toLocaleString("pt-BR")} aberturas de matérias</b>. A média diária está em{" "}
            <b>{Number(data.average30.pageviews || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} visualizações</b>.
          </div>

          <div className="field full">
            <label>📈 Visualizações por dia — últimos 30 dias</label>
            <div className="audienceChart">
              {(data.daily || []).map((day) => {
                const height = Math.max(2, Math.round((Number(day.pageviews || 0) / maxViews) * 145));
                const date = new Date(day.date + "T12:00:00");
                return (
                  <div className="audienceBarWrap" key={day.date} title={`${date.toLocaleDateString("pt-BR")}: ${day.pageviews} visualizações / ${day.articleViews} matérias abertas`}>
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
            A métrica principal é visualização: cada vez que uma página ou matéria é aberta, soma 1. O sistema não usa endereço IP para identificar pessoas.
            O cookie anônimo continua apenas como métrica secundária de alcance e não interfere na contagem de visualizações.
            {data.trackingSince ? <> Coleta própria iniciada em {new Date(data.trackingSince).toLocaleString("pt-BR")}.</> : null}
          </div>
        </>
      )}
    </section>
  );
}
