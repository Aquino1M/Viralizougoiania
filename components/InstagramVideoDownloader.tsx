"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = { onBack: () => void };

type ResolveResult = {
  title: string;
  thumbnailUrl?: string;
  author?: string;
  downloadUrl: string;
};

type HelperStatus = "unknown" | "ready" | "starting" | "opened" | "error";

export default function InstagramVideoDownloader({ onBack }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [helperStatus, setHelperStatus] = useState<HelperStatus>("unknown");

  useEffect(() => {
    function onHelperReady() {
      setHelperStatus("ready");
    }

    function onHelperStatus(event: Event) {
      const detail = (event as CustomEvent<{ status?: HelperStatus; message?: string }>).detail || {};
      if (detail.status) setHelperStatus(detail.status);
      if (detail.message) setMessage(detail.message);
    }

    window.addEventListener("viralizou-instagram-helper-ready", onHelperReady);
    window.addEventListener("viralizou-instagram-helper-status", onHelperStatus);

    // Pede ao auxiliar instalado que informe se está presente nesta aba.
    window.dispatchEvent(new CustomEvent("viralizou-instagram-helper-ping"));

    return () => {
      window.removeEventListener("viralizou-instagram-helper-ready", onHelperReady);
      window.removeEventListener("viralizou-instagram-helper-status", onHelperStatus);
    };
  }, []);

  function askLocalBrowserDownload() {
    const value = url.trim();
    if (!value) {
      setMessage("Cole o link do Reel primeiro.");
      return;
    }

    try {
      const parsed = new URL(value);
      if (!/instagram\.com$/i.test(parsed.hostname.replace(/^www\./i, "")) || !/^\/(?:reel|reels|p|tv)\//i.test(parsed.pathname)) {
        setMessage("Cole um link direto de Reel/publicação do Instagram.");
        return;
      }
    } catch {
      setMessage("Cole um link válido do Instagram.");
      return;
    }

    setHelperStatus("starting");
    setMessage(
      "⏳ Abrindo o Reel no Instagram usando a sessão já logada neste PC. Não enviamos sua senha nem cookies para o servidor."
    );

    window.dispatchEvent(
      new CustomEvent("viralizou-instagram-download", {
        detail: { url: value },
      }),
    );
  }

  async function resolveVideo(e?: FormEvent) {
    e?.preventDefault();
    setResult(null);
    setMessage("");

    if (!url.trim()) {
      setMessage("Cole o link de um Reel ou vídeo do Instagram.");
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
            O modo recomendado usa o Instagram já logado no seu navegador. A sessão fica no seu PC; ela não é enviada ao Viralizougoiania.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      <div className="adminIgLoggedMode">
        <div>
          <b>🔐 Download pelo navegador logado</b>
          <small>
            Para Reels que o Instagram bloqueia no servidor. É necessário instalar uma pequena extensão auxiliar uma única vez.
          </small>
        </div>
        <div className="adminIgHelperRow">
          <span className={helperStatus === "ready" ? "adminIgHelperDot ok" : "adminIgHelperDot"} />
          <span>
            {helperStatus === "ready"
              ? "Auxiliar conectado"
              : helperStatus === "starting"
                ? "Abrindo Instagram..."
                : helperStatus === "opened"
                  ? "Capturando o vídeo..."
                  : "Auxiliar não detectado"}
          </span>
          {helperStatus === "unknown" && (
            <a
              className="btn secondary"
              href="https://github.com/Aquino1M/Viralizougoiania/tree/main/tools/instagram-downloader-extension"
              target="_blank"
              rel="noreferrer"
            >
              📦 Instalar auxiliar
            </a>
          )}
        </div>
      </div>

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
        </div>
      </div>

      <div className="adminIgActions">
        <button
          type="button"
          className="btn"
          disabled={helperStatus === "starting" || helperStatus === "opened"}
          onClick={askLocalBrowserDownload}
        >
          {helperStatus === "starting" ? "Abrindo Instagram..." : "⬇️ Baixar usando Instagram logado"}
        </button>
        <button type="button" className="btn secondary" disabled={loading} onClick={() => resolveVideo()}>
          {loading ? "Procurando no servidor..." : "🌐 Tentar modo público"}
        </button>
      </div>

      <div className="adminIgHelp">
        O modo logado abre o Reel no próprio Instagram e captura o arquivo que o navegador já recebeu. Não pede sua senha, não copia cookies e não tenta acessar conta privada por fora do seu navegador.
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
