"use client";

import { useEffect, useMemo, useState } from "react";

type Overview = {
  today: { visitors: number; pageviews: number };
  month: { visitors: number; pageviews: number };
  average30: { visitors: number; pageviews: number };
  daily: Array<{ date: string; visitors: number; pageviews: number }>;
  topPages: Array<{ path: string; visitors: number; pageviews: number }>;
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

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h1>📊 Audiência & Patrocínio</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Visitantes únicos e visualizações do portal, com resumo diário e mensal para mídia kit e propostas comerciais.
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
              <span>Visitantes únicos hoje</span>
              <small>{Number(data.today.pageviews || 0).toLocaleString("pt-BR")} visualizações hoje</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.month.visitors || 0).toLocaleString("pt-BR")}</b>
              <span>Visitantes únicos no mês</span>
              <small>{Number(data.month.pageviews || 0).toLocaleString("pt-BR")} visualizações no mês</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.average30.visitors || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</b>
              <span>Média diária de visitantes</span>
              <small>Últimos 30 dias</small>
            </div>
            <div className="audienceMetric">
              <b>{Number(data.average30.pageviews || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</b>
              <span>Média diária de visualizações</span>
              <small>Últimos 30 dias</small>
            </div>
          </div>

          <div className="audienceSponsorBox">
            <b>Resumo para patrocinadores:</b>{" "}
            neste mês o Viralizougoiania registrou <b>{Number(data.month.visitors || 0).toLocaleString("pt-BR")} visitantes únicos</b> e{" "}
            <b>{Number(data.month.pageviews || 0).toLocaleString("pt-BR")} visualizações</b>.
          </div>

          <div className="field full">
            <label>📈 Visitantes únicos por dia — últimos 30 dias</label>
            <div className="audienceChart">
              {(data.daily || []).map((day) => {
                const height = Math.max(2, Math.round((Number(day.visitors || 0) / maxVisitors) * 145));
                const date = new Date(day.date + "T12:00:00");
                return (
                  <div className="audienceBarWrap" key={day.date} title={`${date.toLocaleDateString("pt-BR")}: ${day.visitors} visitantes / ${day.pageviews} visualizações`}>
                    <div className="audienceBar" style={{ height }} />
                    <small>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="field full" style={{ marginTop: 18 }}>
            <label>🔥 Páginas mais acessadas — últimos 30 dias</label>
            {(data.topPages || []).length ? (
              <table className="audienceTopPages">
                <thead><tr><th>Página</th><th>Visitantes</th><th>Visualizações</th></tr></thead>
                <tbody>
                  {data.topPages.map((row) => (
                    <tr key={row.path}>
                      <td><code>{row.path}</code></td>
                      <td>{Number(row.visitors || 0).toLocaleString("pt-BR")}</td>
                      <td>{Number(row.pageviews || 0).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">Os dados começam a aparecer conforme os visitantes acessarem o portal.</div>}
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: "#64748b" }}>
            Visitante único = navegador identificado por cookie anônimo de primeira parte. Não são armazenados nome, e-mail nem endereço IP.
            {data.trackingSince ? <> Coleta própria iniciada em {new Date(data.trackingSince).toLocaleString("pt-BR")}.</> : null}
          </div>
        </>
      )}
    </section>
  );
}
