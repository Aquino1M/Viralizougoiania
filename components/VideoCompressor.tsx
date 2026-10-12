"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";

type Preset = "whatsapp_standard" | "whatsapp_light" | "whatsapp_hd";

type CompressedResult = {
  url: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
};

export default function VideoCompressor({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [preset, setPreset] = useState<Preset>("whatsapp_standard");
  const [compressing, setCompressing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<CompressedResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelect(selected: File) {
    if (!selected.type.startsWith("video/") && !selected.name.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp)$/i)) {
      setMessage("⚠️ Por favor, selecione um arquivo de vídeo válido (MP4, WebM, MOV, AVI, MKV).");
      return;
    }

    if (selected.size > 250 * 1024 * 1024) {
      setMessage("⚠️ O vídeo selecionado ultrapassa o limite de 250 MB.");
      return;
    }

    setFile(selected);
    setMessage("");
    setResult(null);

    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(URL.createObjectURL(selected));
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  async function compressVideo() {
    if (!file) {
      setMessage("⚠️ Selecione um arquivo de vídeo primeiro.");
      return;
    }

    setCompressing(true);
    setMessage("⏳ Comprimindo vídeo com FFmpeg (H.264 Main + AAC + Faststart)... Isso pode levar alguns segundos dependendo do tamanho.");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const safeBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      formData.append("filename", `${safeBase}-whatsapp.mp4`);
      formData.append("preset", preset);

      const response = await fetch("/api/admin/convert-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status} na compressão.`);
      }

      const blob = await response.blob();
      const originalBytes = Number(response.headers.get("X-Original-Size")) || file.size;
      const compressedBytes = Number(response.headers.get("X-Compressed-Size")) || blob.size;
      const reduction = Number(response.headers.get("X-Reduction-Percent")) ||
        Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100));

      const blobUrl = URL.createObjectURL(blob);
      setResult({
        url: blobUrl,
        filename: `${safeBase}-whatsapp.mp4`,
        originalSize: originalBytes,
        compressedSize: compressedBytes,
        reductionPercent: reduction,
      });

      setMessage("🎉 Vídeo comprimido com sucesso! O arquivo está 100% pronto e compatível com o WhatsApp.");
    } catch (err: any) {
      console.error("Erro na compressão:", err);
      setMessage(`❌ Erro: ${err?.message || "Não foi possível comprimir o vídeo."}`);
    } finally {
      setCompressing(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function resetAll() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setVideoPreview("");
    setResult(null);
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="panel" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="toolbar" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, margin: 0 }}>
            <span>🗜️</span> Compressor de Vídeo para WhatsApp
          </h1>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Comprima e converta qualquer vídeo (MP4, WebM, MOV, AVI) para o formato oficial 100% compatível com o WhatsApp (Status, Grupos e Conversas).
            Elimina definitivamente o erro de <b>"Arquivo não compatível"</b> sem precisar de sites externos como FreeConvert.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>
          Voltar
        </button>
      </div>

      {message && (
        <div
          className={message.startsWith("🎉") ? "notice" : message.startsWith("❌") ? "notice error" : "notice"}
          style={{ marginTop: 16 }}
        >
          {message}
        </div>
      )}

      {/* Upload Dropzone */}
      {!result && (
        <div style={{ marginTop: 20 }}>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? "2px dashed #ff6a13" : "2px dashed #cbd5e1",
              background: isDragging ? "#fff7ed" : "#f8fafc",
              borderRadius: 16,
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v,.3gp"
              onChange={onFileInputChange}
              style={{ display: "none" }}
            />
            <div style={{ fontSize: 44, marginBottom: 8 }}>📁</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, color: "#1e293b" }}>
              {file ? file.name : "Clique aqui ou arraste o vídeo que deseja comprimir"}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {file
                ? `Tamanho atual: ${formatBytes(file.size)} · Clique para escolher outro arquivo`
                : "Suporta MP4, WebM, MOV (iPhone), AVI e MKV até 250 MB"}
            </p>
          </div>

          {file && (
            <div style={{ marginTop: 24 }}>
              {/* Prévia do vídeo */}
              {videoPreview && (
                <div style={{ marginBottom: 20, textAlign: "center" }}>
                  <video
                    src={videoPreview}
                    controls
                    playsInline
                    style={{
                      maxHeight: 280,
                      maxWidth: "100%",
                      borderRadius: 12,
                      background: "#000",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    Arquivo: <b>{file.name}</b> ({formatBytes(file.size)})
                  </div>
                </div>
              )}

              {/* Seletor de Modo de Compressão */}
              <label style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#475569", display: "block", marginBottom: 10 }}>
                Selecione o nível de compressão para o WhatsApp:
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {/* Preset 1: Padrão WhatsApp */}
                <div
                  onClick={() => setPreset("whatsapp_standard")}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: preset === "whatsapp_standard" ? "2px solid #ff6a13" : "1.5px solid #e2e8f0",
                    background: preset === "whatsapp_standard" ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "#1e293b", fontSize: 14 }}>🟢 Padrão WhatsApp</b>
                    <span style={{ fontSize: 10, background: "#ff6a13", color: "#fff", padding: "2px 6px", borderRadius: 6, fontWeight: 800 }}>
                      RECOMENDADO
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.4 }}>
                    Reduz <b>~60% a 80% do peso</b>. Mantém excelente nitidez (1080p), áudio estéreo AAC e Faststart. Perfeito para Status e Grupos.
                  </p>
                </div>

                {/* Preset 2: Super Compacto */}
                <div
                  onClick={() => setPreset("whatsapp_light")}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: preset === "whatsapp_light" ? "2px solid #ff6a13" : "1.5px solid #e2e8f0",
                    background: preset === "whatsapp_light" ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "#1e293b", fontSize: 14 }}>⚡ Super Leve (&lt; 16 MB)</b>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.4 }}>
                    Compressão máxima para garantir envio instantâneo sem ultrapassar os limites do WhatsApp até em conexões 3G/4G lentas.
                  </p>
                </div>

                {/* Preset 3: Alta Fidelidade HD */}
                <div
                  onClick={() => setPreset("whatsapp_hd")}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: preset === "whatsapp_hd" ? "2px solid #ff6a13" : "1.5px solid #e2e8f0",
                    background: preset === "whatsapp_hd" ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "#1e293b", fontSize: 14 }}>💎 Alta Qualidade HD</b>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.4 }}>
                    Taxa de bits superior para vídeos promocionais que exigem máxima fidelidade visual, com Faststart e YUV420p habilitados.
                  </p>
                </div>
              </div>

              {/* Botão de Ação */}
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  type="button"
                  className="btn"
                  disabled={compressing}
                  onClick={compressVideo}
                  style={{
                    fontSize: 15,
                    padding: "14px 32px",
                    background: "#ff6a13",
                    boxShadow: "0 6px 20px rgba(255, 106, 19, 0.35)",
                    cursor: compressing ? "not-allowed" : "pointer",
                  }}
                >
                  {compressing ? "⏳ Comprimindo Vídeo com FFmpeg..." : "🚀 Comprimir Vídeo para WhatsApp"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado da Compressão */}
      {result && (
        <div style={{ marginTop: 24, padding: 24, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, color: "#166534" }}>Vídeo 100% Compatível com WhatsApp Pronto!</h2>
              <span style={{ fontSize: 12, color: "#15803d" }}>
                Codificado com H.264 Main Profile + AAC 44.1kHz + Faststart + PixFmt YUV420P
              </span>
            </div>
          </div>

          {/* Comparativo de Tamanho */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Tamanho Original</span>
              <b style={{ display: "block", fontSize: 20, color: "#334155", marginTop: 4 }}>{formatBytes(result.originalSize)}</b>
            </div>

            <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1.5px solid #22c55e" }}>
              <span style={{ fontSize: 11, color: "#16a34a", textTransform: "uppercase", fontWeight: 700 }}>Tamanho Comprimido</span>
              <b style={{ display: "block", fontSize: 20, color: "#15803d", marginTop: 4 }}>{formatBytes(result.compressedSize)}</b>
            </div>

            <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Economia de Espaço</span>
              <b style={{ display: "block", fontSize: 20, color: "#ea580c", marginTop: 4 }}>-{result.reductionPercent}%</b>
            </div>
          </div>

          {/* Player do Vídeo Comprimido */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <video
              src={result.url}
              controls
              playsInline
              style={{
                maxHeight: 320,
                maxWidth: "100%",
                borderRadius: 12,
                background: "#000",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              }}
            />
          </div>

          {/* Botões de Ação do Resultado */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={result.url}
              download={result.filename}
              className="btn"
              style={{
                fontSize: 15,
                padding: "12px 28px",
                background: "#16a34a",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⬇️</span> Baixar Vídeo para WhatsApp (.mp4)
            </a>

            <a
              href="https://web.whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn secondary"
              style={{
                fontSize: 14,
                padding: "12px 20px",
                background: "#ffffff",
                borderColor: "#86efac",
                color: "#166534",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>💬</span> Abrir WhatsApp Web
            </a>

            <button
              type="button"
              className="btn secondary"
              onClick={resetAll}
              style={{ padding: "12px 18px", fontSize: 14 }}
            >
              🔄 Comprimir outro vídeo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
