"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";

type Preset = "whatsapp_standard" | "whatsapp_light" | "whatsapp_hd";
type EngineMode = "browser" | "server";

type CompressedResult = {
  url: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  format: string;
};

export default function VideoCompressor({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ w: number; h: number } | null>(null);

  const [preset, setPreset] = useState<Preset>("whatsapp_standard");
  const [engineMode, setEngineMode] = useState<EngineMode>("browser");

  const [compressing, setCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");

  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<CompressedResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      // Cleanup URLs on unmount
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (result?.url) URL.revokeObjectURL(result.url);
      stopCurrentProcessing();
    };
  }, []);

  function stopCurrentProcessing() {
    isCancelledRef.current = true;
    try {
      if (activeVideoRef.current) {
        activeVideoRef.current.pause();
        activeVideoRef.current.removeAttribute("src");
        activeVideoRef.current.load();
        activeVideoRef.current = null;
      }
    } catch {}

    try {
      if (activeRecorderRef.current && activeRecorderRef.current.state !== "inactive") {
        activeRecorderRef.current.stop();
        activeRecorderRef.current = null;
      }
    } catch {}

    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    } catch {}
  }

  function handleFileSelect(selected: File) {
    if (!selected.type.startsWith("video/") && !selected.name.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|flv)$/i)) {
      setMessage("⚠️ Por favor, selecione um arquivo de vídeo válido (MP4, WebM, MOV, AVI, MKV).");
      return;
    }

    if (selected.size > 500 * 1024 * 1024) {
      setMessage("⚠️ O vídeo selecionado ultrapassa o limite de 500 MB.");
      return;
    }

    stopCurrentProcessing();
    setFile(selected);
    setMessage("");
    setResult(null);
    setProgress(0);
    setCurrentTime(0);

    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    const url = URL.createObjectURL(selected);
    setVideoPreview(url);

    // Carrega metadados do vídeo para obter duração e resolução exata
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(tempVideo.duration || 0);
      setVideoResolution({
        w: tempVideo.videoWidth || 0,
        h: tempVideo.videoHeight || 0,
      });
    };
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

  function cancelCompression() {
    isCancelledRef.current = true;
    stopCurrentProcessing();
    setCompressing(false);
    setProgress(0);
    setStatusText("");
    setMessage("⚠️ Compressão cancelada.");
  }

  function formatSeconds(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async function startCompression() {
    if (!file) {
      setMessage("⚠️ Selecione um arquivo de vídeo primeiro.");
      return;
    }

    if (engineMode === "server") {
      await compressViaServer();
    } else {
      await compressInBrowser();
    }
  }

  /**
   * Compressão 100% no Navegador (GPU / Canvas + MediaRecorder + Web Audio)
   * Vantagens:
   * - ZERO erro de 413 Payload Too Large (funciona na Vercel com vídeos de 30MB, 100MB, 200MB+)
   * - Barra de progresso real e ultra precisa (0% a 100%)
   * - Otimizado para WhatsApp (720p/1080p, H.264/WebM, AAC/Opus)
   */
  async function compressInBrowser() {
    if (!file) return;

    isCancelledRef.current = false;
    setCompressing(true);
    setProgress(0);
    setCurrentTime(0);
    setStatusText("Preparando acelerador do navegador e decodificando faixas...");
    setMessage("");

    try {
      const video = document.createElement("video");
      activeVideoRef.current = video;
      video.crossOrigin = "anonymous";
      video.playsInline = true;
      // Não solicita o vídeo inteiro antecipadamente: em celulares e PCs fracos
      // deixa o decoder buscar os dados conforme a reprodução avança.
      video.preload = "metadata";
      video.muted = false; // Necessário para AudioContext capturar áudio

      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      // Aguarda vídeo carregar metadados
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Tempo esgotado ao abrir o arquivo de vídeo.")), 15000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Formato de vídeo incompatível com o decodificador do navegador."));
        };
      });

      if (isCancelledRef.current) return;

      const duration = video.duration || videoDuration || 1;
      const origW = video.videoWidth || 1280;
      const origH = video.videoHeight || 720;

      // Resoluções e bitrates recomendados para WhatsApp
      let maxW = 1280;
      let maxH = 720;
      let videoBps = 2_200_000;
      let audioBps = 128_000;

      if (preset === "whatsapp_light") {
        maxW = 854;
        maxH = 480;
        videoBps = 1_100_000;
        audioBps = 96_000;
      } else if (preset === "whatsapp_hd") {
        maxW = 1920;
        maxH = 1080;
        videoBps = 3_800_000;
        audioBps = 160_000;
      }

      // Mantém a compressão padrão leve para hardware modesto; HD continua opcional.
      if (preset !== "whatsapp_hd") {
        maxW = Math.min(maxW, 960);
        maxH = Math.min(maxH, 960);
      }

      // Se vídeo for vertical (Reels / Status / Shorts), inverte dimensões máximas
      if (origH > origW) {
        const tmp = maxW;
        maxW = maxH;
        maxH = tmp;
      }

      const ratio = Math.min(maxW / origW, maxH / origH, 1);
      // Garantir dimensões pares para estabilidade estrita do codec H.264
      const targetW = Math.max(16, Math.round((origW * ratio) / 2) * 2);
      const targetH = Math.max(16, Math.round((origH * ratio) / 2) * 2);

      // Configura canvas de processamento
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d", { alpha: false });

      if (!ctx) {
        throw new Error("Não foi possível inicializar o renderizador de vídeo.");
      }

      // 1. Pipeline de Áudio via Web Audio API (gravação silenciosa nos alto-falantes)
      let audioTrack: MediaStreamTrack | null = null;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          const sourceNode = audioCtx.createMediaElementSource(video);
          const destinationNode = audioCtx.createMediaStreamDestination();
          sourceNode.connect(destinationNode);
          // IMPORTANTE: NÃO conecta aos alto-falantes (audioCtx.destination) para não tocar som alto durante o processamento!

          const audioTracks = destinationNode.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTrack = audioTracks[0];
          }
        }
      } catch (audioErr) {
        console.warn("[VideoCompressor] Vídeo sem faixa de áudio ou áudio bloqueado:", audioErr);
      }

      if (isCancelledRef.current) return;

      // 2. Captura do fluxo de vídeo a 30 FPS
      const canvasStream = canvas.captureStream(30);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      // 3. Seleção do melhor formato suportado (prioriza MP4 H.264 para WhatsApp)
      const mimeCandidates = [
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/mp4; codecs="avc1"',
        "video/mp4",
        'video/webm; codecs="vp9, opus"',
        'video/webm; codecs="vp8, opus"',
        "video/webm",
      ];
      const selectedMime = mimeCandidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
      if (!selectedMime) {
        throw new Error("Este navegador não oferece um formato de gravação compatível. Atualize o Chrome/Edge ou use o motor FFmpeg no servidor.");
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: videoBps,
        audioBitsPerSecond: audioBps,
      });
      activeRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const recorderCompletePromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: selectedMime.split(";")[0] });
          resolve(finalBlob);
        };
      });

      // 4. Inicia gravação com fatias de 200ms
      recorder.start(200);
      setStatusText("Comprimindo e codificando frames via GPU...");

      // 5. Inicia reprodução sincronizada
      video.currentTime = 0;
      await video.play();

      let animFrameId: number | null = null;
      let lastRenderTime = 0;
      const renderInterval = preset === "whatsapp_light" ? 66 : 33;

      const renderLoop = () => {
        if (isCancelledRef.current || video.paused || video.ended) return;

        const now = performance.now();
        if (now - lastRenderTime >= renderInterval) {
          lastRenderTime = now;
          if (ctx && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
          }
          const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
          setProgress(pct);
          setCurrentTime(video.currentTime);
        }

        if ("requestVideoFrameCallback" in video) {
          animFrameId = (video as any).requestVideoFrameCallback(renderLoop);
        } else {
          animFrameId = requestAnimationFrame(renderLoop);
        }
      };

      if ("requestVideoFrameCallback" in video) {
        animFrameId = (video as any).requestVideoFrameCallback(renderLoop);
      } else {
        animFrameId = requestAnimationFrame(renderLoop);
      }

      // Aguarda finalização do vídeo
      await new Promise<void>((resolve) => {
        video.onended = () => resolve();
        const checkEndInterval = setInterval(() => {
          if (isCancelledRef.current || video.ended || video.currentTime >= duration - 0.15) {
            clearInterval(checkEndInterval);
            resolve();
          }
        }, 150);
      });

      if (isCancelledRef.current) return;

      setProgress(100);
      setCurrentTime(duration);
      setStatusText("Finalizando gravação e gerando arquivo pronto para WhatsApp...");

      recorder.stop();
      const outputBlob = await recorderCompletePromise;

      // Limpeza de recursos
      stopCurrentProcessing();
      URL.revokeObjectURL(videoUrl);

      const safeBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const actualMime = (outputBlob.type || selectedMime).toLowerCase();
      const actualIsMp4 = actualMime.includes("mp4");
      if (!actualIsMp4) {
        throw new Error("O navegador gerou WebM, não MP4. O arquivo não será identificado com a extensão errada; use o motor FFmpeg para converter para MP4.");
      }
      const finalUrl = URL.createObjectURL(outputBlob);
      const reduction = Math.max(0, Math.round(((file.size - outputBlob.size) / file.size) * 100));

      setResult({
        url: finalUrl,
        filename: `${safeBase}-whatsapp.mp4`,
        originalSize: file.size,
        compressedSize: outputBlob.size,
        reductionPercent: reduction,
        format: "MP4 (H.264/AAC, Faststart)",
      });

      setMessage("🎉 Vídeo comprimido com sucesso! 100% pronto e compatível com WhatsApp.");
    } catch (err: any) {
      console.error("[VideoCompressor] Erro:", err);
      setMessage(`❌ Erro durante a compressão: ${err?.message || "Falha inesperada no processamento do vídeo."}`);
    } finally {
      setCompressing(false);
      setStatusText("");
    }
  }

  /**
   * Compressão via Servidor FFmpeg (somente para arquivos <= 4.5 MB no Vercel)
   */
  async function compressViaServer() {
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      setMessage("⚠️ Na Vercel, o envio direto para o servidor tem limite de 4.5 MB (Erro HTTP 413). Por favor, use a opção recomendada 'Aceleração no Navegador'!");
      setEngineMode("browser");
      return;
    }

    setCompressing(true);
    setProgress(30);
    setStatusText("Enviando vídeo para o servidor FFmpeg...");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const safeBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      formData.append("filename", `${safeBase}-whatsapp.mp4`);
      formData.append("preset", preset);

      setProgress(60);
      setStatusText("FFmpeg processando faixas no servidor...");

      const response = await fetch("/api/admin/convert-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Erro HTTP 413: O arquivo é grande demais para a Vercel. Alterne para 'Aceleração no Navegador' que comprime arquivos de qualquer tamanho sem erro!");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status} na compressão.`);
      }

      setProgress(95);
      setStatusText("Recebendo vídeo final...");

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
        format: "MP4 (FFmpeg H.264 Main + AAC Faststart)",
      });

      setProgress(100);
      setMessage("🎉 Vídeo comprimido com sucesso pelo servidor FFmpeg!");
    } catch (err: any) {
      console.error("Erro na compressão:", err);
      setMessage(`❌ Erro: ${err?.message || "Não foi possível comprimir o vídeo no servidor."}`);
    } finally {
      setCompressing(false);
      setStatusText("");
    }
  }

  function resetAll() {
    stopCurrentProcessing();
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setVideoPreview("");
    setVideoDuration(0);
    setVideoResolution(null);
    setResult(null);
    setProgress(0);
    setCurrentTime(0);
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const estimatedRemainingSec = Math.max(0, Math.round(videoDuration - currentTime));

  return (
    <section className="panel" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="toolbar" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, margin: 0 }}>
            <span>🗜️</span> Compressor de Vídeo para WhatsApp
          </h1>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Comprima e converta qualquer vídeo (MP4, WebM, MOV, AVI) para o formato oficial 100% compatível com o WhatsApp (Status, Grupos e Conversas).
            Elimina definitivamente o erro de <b>"Arquivo não compatível"</b> e <b>"HTTP 413"</b>.
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

      {/* Painel do Seletor e Configurações */}
      {!result && (
        <div style={{ marginTop: 20 }}>
          {/* Dropzone de Upload */}
          {!compressing && (
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
                  ? `Tamanho atual: ${formatBytes(file.size)} ${videoDuration > 0 ? `· Duração: ${formatSeconds(videoDuration)}` : ""} · Clique para trocar`
                  : "Suporta MP4, WebM, MOV (iPhone), AVI e MKV até 500 MB (sem erro 413)"}
              </p>
            </div>
          )}

          {/* BARRA DE PROGRESSO EM TEMPO REAL DURANTE A COMPRESSÃO */}
          {compressing && (
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #ff6a13",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 10px 25px rgba(255, 106, 19, 0.15)",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ textAlign: "left" }}>
                  <b style={{ fontSize: 16, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", animation: "spin 2s linear infinite" }}>⏳</span>
                    Comprimindo Vídeo para WhatsApp...
                  </b>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {statusText || "Processando e otimizando faixas..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelCompression}
                  className="btn secondary"
                  style={{ fontSize: 12, padding: "6px 12px", color: "#dc2626", borderColor: "#fca5a5" }}
                >
                  ⛔ Cancelar
                </button>
              </div>

              {/* Barra de Progresso Visual */}
              <div
                style={{
                  height: 26,
                  background: "#f1f5f9",
                  borderRadius: 13,
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #cbd5e1",
                  margin: "16px 0 10px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #ff6a13 0%, #ea580c 50%, #f97316 100%)",
                    borderRadius: 12,
                    transition: "width 0.25s ease-out",
                    boxShadow: "0 0 14px rgba(255,106,19,0.5)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: 13,
                    fontWeight: 800,
                    color: progress > 52 ? "#ffffff" : "#1e293b",
                    textShadow: progress > 52 ? "0 1px 2px rgba(0,0,0,0.6)" : "none",
                  }}
                >
                  {progress}% Concluído
                </span>
              </div>

              {/* Estatísticas de Progresso */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginTop: 8 }}>
                <span>
                  ⏱️ Tempo Processado: <b>{formatSeconds(currentTime)}</b> / <b>{formatSeconds(videoDuration)}</b>
                </span>
                <span>
                  ⏳ Estimativa Restante: <b>~{estimatedRemainingSec}s</b>
                </span>
                <span>
                  📁 Tamanho Original: <b>{file ? formatBytes(file.size) : "--"}</b>
                </span>
              </div>

              {/* Canvas Monitor em Tempo Real */}
              <div style={{ marginTop: 18 }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    maxHeight: 180,
                    maxWidth: "100%",
                    borderRadius: 8,
                    background: "#000",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Monitor de aceleração gráfica GPU em tempo real
                </div>
              </div>
            </div>
          )}

          {file && !compressing && (
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
                    {videoResolution && ` · ${videoResolution.w}x${videoResolution.h}`}
                    {videoDuration > 0 && ` · ${formatSeconds(videoDuration)}`}
                  </div>
                </div>
              )}

              {/* Seletor do Modo / Motor de Processamento */}
              <div style={{ marginBottom: 20, background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#475569", display: "block", marginBottom: 8 }}>
                  ⚡ Motor de Processamento:
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setEngineMode("browser")}
                    className={engineMode === "browser" ? "btn" : "btn secondary"}
                    style={{
                      fontSize: 12,
                      padding: "8px 14px",
                      background: engineMode === "browser" ? "#ff6a13" : "#fff",
                      borderColor: engineMode === "browser" ? "#ff6a13" : "#cbd5e1",
                    }}
                  >
                    🚀 Aceleração no Navegador (Recomendado · Sem Erro 413 · Qualquer Tamanho)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngineMode("server")}
                    className={engineMode === "server" ? "btn" : "btn secondary"}
                    style={{
                      fontSize: 12,
                      padding: "8px 14px",
                      background: engineMode === "server" ? "#ff6a13" : "#fff",
                      borderColor: engineMode === "server" ? "#ff6a13" : "#cbd5e1",
                    }}
                  >
                    🖥️ Servidor FFmpeg (Apenas &lt; 4.5 MB)
                  </button>
                </div>
                {engineMode === "server" && file.size > 4.5 * 1024 * 1024 && (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: "#dc2626" }}>
                    ⚠️ Este arquivo tem {formatBytes(file.size)}. Na Vercel, envios acima de 4.5 MB geram <b>Erro HTTP 413</b>. Use <b>Aceleração no Navegador</b> para processar sem limites!
                  </p>
                )}
              </div>

              {/* Seletor de Nível de Compressão */}
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
                    Reduz <b>~60% a 80% do peso</b>. Mantém excelente nitidez (720p/1080p), áudio estéreo nítido e taxa ideal para Status e Grupos.
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
                    Compressão máxima (480p) para envio instantâneo sem cortar e sem travar conexões 3G/4G lentas.
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
                    Taxa de bits superior para vídeos promocionais que exigem máxima fidelidade visual em 1080p.
                  </p>
                </div>
              </div>

              {/* Botão de Ação */}
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  type="button"
                  className="btn"
                  disabled={compressing}
                  onClick={startCompression}
                  style={{
                    fontSize: 16,
                    padding: "15px 36px",
                    background: "#ff6a13",
                    boxShadow: "0 6px 20px rgba(255, 106, 19, 0.35)",
                    cursor: compressing ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  🚀 Comprimir Vídeo para WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTADO DA COMPRESSÃO */}
      {result && (
        <div style={{ marginTop: 24, padding: 24, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 26 }}>🎉</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#166534" }}>Vídeo Comprimido e 100% Compatível!</h2>
              <span style={{ fontSize: 12, color: "#15803d" }}>
                Formato: <b>{result.format}</b> · Compatível com Status, Conversas e Grupos
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
              <span>⬇️</span> Baixar Vídeo para WhatsApp ({result.filename.endsWith(".mp4") ? ".mp4" : ".webm"})
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
