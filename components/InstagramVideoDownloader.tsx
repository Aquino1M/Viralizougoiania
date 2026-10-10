"use client";

import { FormEvent, useEffect, useState } from "react";
import { DownloadPlatform, detectPlatform } from "@/lib/universal-video-downloader";

type Props = { onBack: () => void };

type ResolveResult = {
  platform: DownloadPlatform;
  platformLabel?: string;
  title: string;
  thumbnailUrl?: string;
  author?: string;
  downloadUrl: string;
  directUrl?: string;
  format?: string;
  watermarkFree?: boolean;
};

type HelperStatus = "unknown" | "ready" | "starting" | "opened" | "error";

export default function InstagramVideoDownloader({ onBack }: Props) {
  const [url, setUrl] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"auto" | "tiktok" | "instagram" | "twitter">("auto");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [helperStatus, setHelperStatus] = useState<HelperStatus>("unknown");

  const detected = detectPlatform(url);

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

    window.dispatchEvent(new CustomEvent("viralizou-instagram-helper-ping"));

    return () => {
      window.removeEventListener("viralizou-instagram-helper-ready", onHelperReady);
      window.removeEventListener("viralizou-instagram-helper-status", onHelperStatus);
    };
  }, []);

  function askLocalBrowserDownload() {
    if (!url.trim()) {
      setMessage("Cole um link válido do Instagram Reels.");
      return;
    }

    setHelperStatus("starting");
    setMessage(
      "⏳ Buscando o Reel em segundo plano com a sessão do Instagram logada no navegador. Seus cookies continuam 100% seguros na sua máquina."
    );

    window.dispatchEvent(
      new CustomEvent("viralizou-instagram-download", {
        detail: { url: url.trim() },
      }),
    );
  }

  function openWithSaveInsta() {
    if (!url.trim()) {
      setMessage("Cole um link antes de abrir no SaveInsta.");
      return;
    }

    const saveInstaUrl = new URL("https://saveclip.app/pt8");
    saveInstaUrl.searchParams.set("q", url.trim());
    window.open(saveInstaUrl.toString(), "_blank", "noopener,noreferrer");
    setMessage("Abrimos o SaveInsta com o link. O download é concluído na nova aba.");
  }

  async function resolveVideo(e?: FormEvent) {
    e?.preventDefault();
    setResult(null);
    setMessage("");

    const targetUrl = url.trim();
    if (!targetUrl) {
      setMessage("Cole o link de um vídeo do Instagram, TikTok ou Twitter/X.");
      return;
    }

    setLoading(true);
    try {
      // 1. Tenta o motor universal de alta velocidade (TikTok sem marca, Twitter/X, Instagram)
      const response = await fetch("/api/video-downloader/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.downloadUrl) {
        setResult(data);
        const tag = data.watermarkFree ? " sem marca d'água" : "";
        setMessage(`✅ Vídeo localizado (${data.platformLabel || "Vídeo"}${tag}). Clique no botão abaixo para baixar.`);
        return;
      }

      // 2. Se for Instagram e o motor universal falhou, tenta o resolvedor legado administrativo
      if (detected === "instagram") {
        const legacyRes = await fetch("/api/admin/instagram/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });
        const legacyData = await legacyRes.json().catch(() => ({}));
        if (legacyRes.ok && legacyData.downloadUrl) {
          setResult({
            platform: "instagram",
            platformLabel: "Instagram Reels",
            title: legacyData.title || "Reel do Instagram",
            author: legacyData.author || "Instagram",
            thumbnailUrl: legacyData.thumbnailUrl,
            downloadUrl: legacyData.downloadUrl,
            format: "mp4",
            watermarkFree: true,
          });
          setMessage("✅ Reel público localizado. Clique abaixo para baixar.");
          return;
        }
      }

      throw new Error(data.error || "Não foi possível localizar o vídeo com os motores disponíveis.");
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
          <h1>⬇️ Central de Download de Vídeos</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Baixe vídeos e Reels do <b>TikTok sem marca d'água</b>, <b>Instagram Reels</b> e <b>Twitter / X</b> direto pelo site.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      {/* Seletor de Redes / Abas */}
      <div style={{ display: "flex", gap: 8, margin: "16px 0 12px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={selectedPlatform === "auto" ? "btn" : "btn secondary"}
          onClick={() => setSelectedPlatform("auto")}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          ⚡ Auto-detectar
        </button>
        <button
          type="button"
          className={selectedPlatform === "tiktok" ? "btn" : "btn secondary"}
          onClick={() => setSelectedPlatform("tiktok")}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          🎵 TikTok (Sem marca d'água)
        </button>
        <button
          type="button"
          className={selectedPlatform === "instagram" ? "btn" : "btn secondary"}
          onClick={() => setSelectedPlatform("instagram")}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          📸 Instagram (Reels & Feed)
        </button>
        <button
          type="button"
          className={selectedPlatform === "twitter" ? "btn" : "btn secondary"}
          onClick={() => setSelectedPlatform("twitter")}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          🐦 Twitter / X
        </button>
      </div>

      {/* Opção avançada para Instagram logado */}
      {(selectedPlatform === "instagram" || (selectedPlatform === "auto" && detected === "instagram")) && (
        <div className="adminIgLoggedMode" style={{ marginBottom: 16 }}>
          <div>
            <b>🔐 Auxiliar de Reels bloqueados no Instagram</b>
            <small>
              Se um Reel do Instagram exigir login fechado, você pode usar a extensão auxiliar instalada no Chrome/Edge.
            </small>
          </div>
          <div className="adminIgHelperRow">
            <span className={helperStatus === "ready" ? "adminIgHelperDot ok" : "adminIgHelperDot"} />
            <span>
              {helperStatus === "ready"
                ? "Auxiliar conectado"
                : helperStatus === "starting"
                  ? "Buscando em segundo plano..."
                  : helperStatus === "opened"
                    ? "Capturando o vídeo..."
                    : "Auxiliar opcional não detectado"}
            </span>
            <a className="btn secondary" href="/downloads/viralizougoiania-instagram-extension.zip" download>
              ⬇️ Baixar extensão
            </a>
          </div>
        </div>
      )}

      {/* Campo de URL com detecção automática */}
      <form onSubmit={resolveVideo}>
        <div className="field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📎 Cole o link do vídeo (Instagram, TikTok ou Twitter/X)</span>
            {detected !== "generic" && (
              <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>
                {detected === "tiktok" && "🎵 TikTok detectado"}
                {detected === "instagram" && "📸 Instagram detectado"}
                {detected === "twitter" && "🐦 Twitter/X detectado"}
              </span>
            )}
          </label>
          <div className="adminFeedUrlRow" style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              required
              placeholder={
                selectedPlatform === "tiktok"
                  ? "https://www.tiktok.com/@usuario/video/... ou https://vm.tiktok.com/..."
                  : selectedPlatform === "twitter"
                    ? "https://x.com/usuario/status/..."
                    : selectedPlatform === "instagram"
                      ? "https://www.instagram.com/reel/..."
                      : "Cole o link do TikTok, Instagram Reels ou Twitter/X..."
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            {url && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setUrl("");
                  setResult(null);
                  setMessage("");
                }}
                style={{ padding: "0 12px" }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="adminIgActions" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="submit" className="btn" disabled={loading || !url.trim()}>
            {loading ? "⏳ Processando link via API..." : "🚀 Localizar e Baixar Vídeo"}
          </button>

          {(selectedPlatform === "instagram" || (selectedPlatform === "auto" && detected === "instagram")) && (
            <>
              <button
                type="button"
                className="btn secondary"
                disabled={helperStatus === "starting" || helperStatus === "opened"}
                onClick={askLocalBrowserDownload}
              >
                {helperStatus === "starting" ? "Baixando..." : "⬇️ Baixar via Navegador Logado"}
              </button>
              <button type="button" className="btn secondary" onClick={openWithSaveInsta}>
                ↗️ Abrir no SaveInsta
              </button>
            </>
          )}
        </div>
      </form>

      {/* Card de Resultado do Vídeo Encontrado */}
      {result && (
        <div
          className="adminIgResult"
          style={{
            marginTop: 20,
            padding: 16,
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            gap: 16,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          {result.thumbnailUrl ? (
            <img
              src={result.thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 110,
                height: 110,
                background: "#f1f5f9",
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                fontSize: 36,
                flexShrink: 0,
              }}
            >
              🎬
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span
                style={{
                  background:
                    result.platform === "tiktok"
                      ? "#000000"
                      : result.platform === "twitter"
                        ? "#1d9bf0"
                        : "#e1306c",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {result.platformLabel || result.platform.toUpperCase()}
              </span>
              {result.watermarkFree && (
                <span
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  ✨ SEM MARCA D'ÁGUA
                </span>
              )}
              {result.author && <small style={{ color: "#64748b" }}>{result.author}</small>}
            </div>

            <h3 style={{ fontSize: 16, margin: "4px 0 10px", lineHeight: 1.3, wordBreak: "break-word" }}>
              {result.title || "Vídeo pronto para download"}
            </h3>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <a
                className="btn"
                href={result.downloadUrl}
                download
                style={{ background: "#ff5a1f", color: "#fff", textDecoration: "none", padding: "9px 16px" }}
              >
                ⬇️ Baixar Vídeo MP4
              </a>

              {result.directUrl && (
                <a
                  className="btn secondary"
                  href={result.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", padding: "9px 14px", fontSize: 13 }}
                >
                  ↗️ Assistir no Navegador
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
