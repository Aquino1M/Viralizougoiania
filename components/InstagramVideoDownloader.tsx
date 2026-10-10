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

function getInstagramPostUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" && /(^|\.)instagram\.com$/i.test(url.hostname) && /^\/(?:reel|reels|p|tv)\//i.test(url.pathname)) {
      return url.toString();
    }
  } catch {}
  return "";
}

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
    const value = getInstagramPostUrl(url);
    if (!value) {
      setMessage("Cole um link direto e válido de Reel/publicação do Instagram.");
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

  function openWithSaveInsta() {
    const value = getInstagramPostUrl(url);
    if (!value) {
      setMessage("Cole um link direto e válido de Reel/publicação do Instagram.");
      return;
    }

    const saveInstaUrl = new URL("https://saveclip.app/pt8");
    saveInstaUrl.searchParams.set("q", value);
    window.open(saveInstaUrl.toString(), "_blank", "noopener,noreferrer");
    setMessage("Abrimos o SaveInsta com o Reel. O download é concluído na outra aba; enviamos somente o link público, sem senha ou cookies.");
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
            Para Reels que o Instagram bloqueia no servidor. Baixe e instale a extensão auxiliar uma única vez no Chrome ou Edge.
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
          <a className="btn secondary" href="/downloads/viralizougoiania-instagram-extension.zip" download>
            ⬇️ Baixar extensão
          </a>
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
        <button type="button" className="btn secondary" onClick={openWithSaveInsta}>
          ↗️ Abrir no SaveInsta
        </button>
      </div>

      <div className="adminIgHelp">
        Para instalar o auxiliar: extraia o ZIP, abra <b>chrome://extensions</b> ou <b>edge://extensions</b>, ative o modo do desenvolvedor e clique em <b>Carregar sem compactação</b>, selecionando a pasta extraída. Depois, entre no Instagram nesse navegador. A extensão não envia sua senha nem cookies ao servidor. O botão SaveInsta abre o serviço em outra aba e encaminha somente o link público.
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
