"use client";

import { FormEvent, useState } from "react";

type Props = { onBack: () => void };

type ResolveResult = {
  title: string;
  thumbnailUrl?: string;
  author?: string;
  downloadUrl: string;
};

export default function InstagramVideoDownloader({ onBack }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);

  async function resolveVideo(e?: FormEvent) {
    e?.preventDefault();
    setResult(null);
    setMessage("");
    if (!url.trim()) {
      setMessage("Cole o link de um Reel ou vídeo público do Instagram.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/instagram/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível localizar o vídeo.");

      setResult(data);
      setMessage("✅ Vídeo público localizado. Use o botão abaixo para baixar.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível localizar o vídeo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel adminIgDownloader">
      <div className="toolbar">
        <div>
          <h1>⬇️ Baixar Vídeo do Instagram</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Baixe Reels e vídeos públicos para uso editorial. O sistema tenta a página pública e o embed oficial do Instagram, sem acessar contas privadas nem contornar login.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      <form className="adminIgForm" onSubmit={resolveVideo}>
        <div className="field">
          <label>📎 Link público do Instagram</label>
          <div className="adminFeedUrlRow">
            <input
              type="url"
              required
              placeholder="https://www.instagram.com/reel/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn" disabled={loading}>
              {loading ? "Procurando vídeo..." : "🔎 Buscar vídeo"}
            </button>
          </div>
        </div>
      </form>

      <div className="adminIgHelp">
        Funciona quando o Instagram disponibiliza o vídeo publicamente na página ou no embed oficial. Conteúdo privado, Stories restritos ou páginas que exigem autenticação não são burlados.
      </div>

      {result && (
        <div className="adminIgResult">
          {result.thumbnailUrl ? (
            <img src={result.thumbnailUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="adminIgNoThumb">🎬</div>
          )}
          <div>
            <small>{result.author || "Instagram"}</small>
            <h3>{result.title || "Vídeo do Instagram"}</h3>
            <a className="btn" href={result.downloadUrl}>
              ⬇️ Baixar vídeo MP4
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
