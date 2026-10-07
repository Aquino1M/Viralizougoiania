"use client";

import { FormEvent, useState } from "react";

type Props = { onBack: () => void };
type ResolveResult = { title: string; thumbnailUrl?: string; author?: string; downloadUrl: string };

export default function InstagramVideoDownloader({ onBack }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [liveViewUrl, setLiveViewUrl] = useState("");
  const [connected, setConnected] = useState(false);

  async function connectInstagram() {
    setConnecting(true); setMessage("");
    try {
      const r = await fetch("/api/admin/instagram/connect", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível iniciar a conexão.");
      setSessionId(d.sessionId || ""); setLiveViewUrl(d.liveViewUrl || ""); setConnected(false);
      setMessage("🔐 Faça login no Instagram no navegador remoto e depois clique em “Verificar conexão”.");
      if (d.liveViewUrl) window.open(d.liveViewUrl, "_blank", "noopener,noreferrer");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao conectar o Instagram."); }
    finally { setConnecting(false); }
  }

  async function checkConnection() {
    if (!sessionId) return setMessage("Primeiro clique em “Conectar Instagram”.");
    setChecking(true);
    try {
      const r = await fetch("/api/admin/instagram/connect-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível verificar.");
      setConnected(Boolean(d.loggedIn));
      setMessage(d.loggedIn ? "✅ Instagram conectado. A extensão não é mais necessária." : "⚠️ Ainda não detectei o login. Termine o login e verifique novamente.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao verificar o login."); }
    finally { setChecking(false); }
  }

  async function resolveVideo(e?: FormEvent) {
    e?.preventDefault(); setResult(null); setMessage("");
    if (!url.trim()) return setMessage("Cole o link de um Reel ou vídeo do Instagram.");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/instagram/resolve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível localizar o vídeo.");
      setResult(d); setMessage("✅ Reel localizado. Clique em “Baixar vídeo MP4”.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível localizar o vídeo."); }
    finally { setLoading(false); }
  }

  return (
    <section className="panel adminIgDownloader">
      <div className="toolbar">
        <div>
          <h1>⬇️ Baixar Vídeo do Instagram</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Arquitetura 100% sem extensão: navegador remoto + sessão persistente do Instagram.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      <div className="adminIgLoggedMode">
        <div>
          <b>🔐 Instagram conectado sem extensão</b>
          <small>Na primeira vez, o painel abre um navegador remoto. Faça login nele normalmente; a sessão fica salva no contexto seguro do servidor para os próximos downloads.</small>
        </div>
        <div className="adminIgHelperRow">
          <span className={connected ? "adminIgHelperDot ok" : "adminIgHelperDot"} />
          <span>{connected ? "Instagram conectado" : "Instagram não conectado"}</span>
          <button type="button" className="btn secondary" disabled={connecting} onClick={connectInstagram}>{connecting ? "Iniciando..." : "🔐 Conectar Instagram"}</button>
          {sessionId && <button type="button" className="btn secondary" disabled={checking} onClick={checkConnection}>{checking ? "Verificando..." : "✓ Verificar conexão"}</button>}
          {liveViewUrl && <a className="btn secondary" href={liveViewUrl} target="_blank" rel="noreferrer">🌐 Abrir navegador</a>}
        </div>
      </div>

      <form onSubmit={resolveVideo}>
        <div className="field">
          <label>🔗 Link do Reel</label>
          <input type="url" required placeholder="https://www.instagram.com/reel/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="adminIgActions">
          <button type="submit" className="btn" disabled={loading}>{loading ? "Procurando..." : "🔎 Localizar vídeo"}</button>
        </div>
      </form>

      <div className="adminIgHelp">
        O site não consegue enxergar os cookies do Chrome instalado no seu PC. Por isso, sem extensão, o login é feito uma única vez no navegador remoto do painel. Depois disso o servidor reutiliza a sessão persistente.
      </div>

      {result && <div className="adminIgResult">
        {result.thumbnailUrl ? <img src={result.thumbnailUrl} alt="" referrerPolicy="no-referrer" /> : <div className="adminIgNoThumb">🎬</div>}
        <div>
          <small>{result.author || "Instagram"}</small>
          <h3>{result.title || "Vídeo do Instagram"}</h3>
          <a className="btn" href={result.downloadUrl}>⬇️ Baixar vídeo MP4</a>
        </div>
      </div>}
    </section>
  );
}
