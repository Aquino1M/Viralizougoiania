"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";

type Props = {
  posts: Post[];
  onBack: () => void;
};

type FeedPost = Pick<Post, "slug" | "title" | "image_url" | "category" | "city" | "created_at" | "updated_at">;

const W = 1080;
const H = 1350;
const REEL_H = 1920;

function slugFromInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://viralizougoiania.vercel.app");
    const parts = url.pathname.split("/").filter(Boolean);
    const noticiaIndex = parts.findIndex((p) => p.toLowerCase() === "noticia");
    if (noticiaIndex >= 0 && parts[noticiaIndex + 1]) return decodeURIComponent(parts[noticiaIndex + 1]);
  } catch {}
  return raw.replace(/^\/+|\/+$/g, "").split("/").pop() || "";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLVideoElement, x: number, y: number, w: number, h: number, vertical = 0) {
  const sourceWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const sourceHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(w / sourceWidth, h / sourceHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = Math.max(0, (sourceWidth - sw) / 2);
  const room = Math.max(0, sourceHeight - sh);
  const sy = Math.min(room, Math.max(0, room / 2 + (vertical / 100) * (room / 2)));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 5) {
  for (let size = 78; size >= 48; size -= 2) {
    ctx.font = `800 ${size}px Georgia, "Times New Roman", serif`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = '800 48px Georgia, "Times New Roman", serif';
  const lines = wrapText(ctx, text, maxWidth);
  return { size: 48, lines: lines.slice(0, maxLines) };
}

function drawReelFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, logo: HTMLImageElement | null, headline: string, handle: string) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, REEL_H);
  if (video && video.readyState >= 2) drawCover(ctx, video, 0, 0, W, REEL_H);

  const shade = ctx.createLinearGradient(0, 650, 0, REEL_H);
  shade.addColorStop(0, "rgba(0,0,0,.05)");
  shade.addColorStop(.42, "rgba(0,0,0,.68)");
  shade.addColorStop(1, "rgba(0,0,0,.94)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 600, W, REEL_H - 600);

  if (logo && logo.complete && logo.naturalWidth) {
    const scale = Math.min(600 / logo.naturalWidth, 145 / logo.naturalHeight, 1);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    ctx.drawImage(logo, (W - width) / 2, 1190 - height / 2, width, height);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 57px Arial, sans-serif";
    ctx.fillText("VIRALIZOU", W / 2 - 22, 1200);
    ctx.fillStyle = "#ff5a1f";
    ctx.font = "900 35px Arial, sans-serif";
    ctx.fillText("GOIÂNIA", W / 2 + 214, 1200);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  const fitted = fitHeadline(ctx, headline.trim() || "Novo Reel", 920, 4);
  ctx.font = `800 ${fitted.size}px Georgia, "Times New Roman", serif`;
  const lineHeight = fitted.size * 1.08;
  let y = 1510 - ((fitted.lines.length - 1) * lineHeight) / 2;
  for (const line of fitted.lines) {
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }

  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.font = "600 33px Arial, sans-serif";
  ctx.fillText(handle.trim() || "@viralizougoiania", W / 2, 1810);
}

export default function SocialFeedCreator({ posts, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [format, setFormat] = useState<"feed" | "reel">("feed");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFileName, setVideoFileName] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [videoExport, setVideoExport] = useState<{ url: string; filename: string; type: string } | null>(null);
  const [articleUrl, setArticleUrl] = useState("");
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [title, setTitle] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [handle, setHandle] = useState("@viralizougoiania");
  const [logoData, setLogoData] = useState("");
  const [imagePosition, setImagePosition] = useState(0);
  const [message, setMessage] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoExport?.url) URL.revokeObjectURL(videoExport.url); }, [videoExport?.url]);
  useEffect(() => () => { audioContextRef.current?.close().catch(() => {}); }, []);

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("viralizou_feed_logo") || "";
      const savedHandle = localStorage.getItem("viralizou_feed_handle") || "";
      if (savedLogo) setLogoData(savedLogo);
      if (savedHandle) setHandle(savedHandle);
    } catch {}
  }, []);

  async function renderCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setRendering(true);
    try {
      canvas.width = W;
      canvas.height = format === "reel" ? REEL_H : H;

      if (format === "reel") {
        if (logoData) {
          try { logoImageRef.current = await loadImage(logoData); }
          catch { logoImageRef.current = null; }
        } else {
          logoImageRef.current = null;
        }
        drawReelFrame(ctx, videoPreviewRef.current, logoImageRef.current, title || selectedPost?.title || "", handle);
        setMessage("");
        return;
      }

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);

      if (selectedPost?.image_url) {
        const img = await loadImage(`/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`);
        drawCover(ctx, img, 0, 0, W, 930, imagePosition);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, W, 930);
        gradient.addColorStop(0, "#172033");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, 930);
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = "700 38px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Selecione uma notícia do portal", W / 2, 465);
      }

      const overlay = ctx.createLinearGradient(0, 690, 0, 1100);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(0.48, "rgba(0,0,0,.74)");
      overlay.addColorStop(1, "#050505");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 650, W, 520);

      // Logo do jornal: personalizada ou marca textual padrão.
      if (logoData) {
        try {
          const logo = await loadImage(logoData);
          logoImageRef.current = logo;
          const maxW = 430;
          const maxH = 105;
          const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
          const lw = logo.naturalWidth * scale;
          const lh = logo.naturalHeight * scale;
          ctx.drawImage(logo, (W - lw) / 2, 820 - lh / 2, lw, lh);
        } catch {
          logoImageRef.current = null;
          setLogoData("");
        }
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 57px Arial, sans-serif";
        ctx.fillText("VIRALIZOU", W / 2 - 22, 838);
        ctx.fillStyle = "#ff5a1f";
        ctx.font = "900 35px Arial, sans-serif";
        ctx.fillText("GOIÂNIA", W / 2 + 214, 838);
      }

      const headline = (title || selectedPost?.title || "Título da notícia").trim();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      const fitted = fitHeadline(ctx, headline, 920, 5);
      ctx.font = `800 ${fitted.size}px Georgia, "Times New Roman", serif`;

      const lineHeight = fitted.size * 1.07;
      const totalHeight = fitted.lines.length * lineHeight;
      let y = Math.min(1015, Math.max(925, 1060 - totalHeight / 2));

      for (const line of fitted.lines) {
        ctx.fillText(line, W / 2, y);
        y += lineHeight;
      }

      if (fitted.lines.length) {
        const originalLines = wrapText(ctx, headline, 920);
        if (originalLines.length > 5) {
          const lastY = y - lineHeight;
          ctx.fillText("…", W / 2 + ctx.measureText(fitted.lines[4]).width / 2 + 18, lastY);
        }
      }

      ctx.fillStyle = "rgba(255,255,255,.94)";
      ctx.font = "600 33px Arial, sans-serif";
      ctx.fillText(handle.trim() || "@viralizougoiania", W / 2, 1300);
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível gerar a arte.");
    } finally {
      setRendering(false);
    }
  }

  useEffect(() => {
    renderCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost?.slug, selectedPost?.updated_at, title, logoData, handle, imagePosition, format]);

  useEffect(() => {
    const video = videoPreviewRef.current;
    if (format !== "reel" || !videoUrl || !video) return;
    let frameId = 0;
    let lastDraw = 0;
    const draw = (time: number) => {
      if (time - lastDraw >= 1000 / 30) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && video.readyState >= 2) drawReelFrame(ctx, video, logoImageRef.current, title || selectedPost?.title || "", handle);
        lastDraw = time;
      }
      frameId = requestAnimationFrame(draw);
    };
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title]);

  async function loadArticle() {
    const slug = slugFromInput(articleUrl);
    if (!slug) {
      setMessage("Cole o link completo de uma notícia do Viralizougoiania.");
      return;
    }

    setLoadingArticle(true);
    setMessage("");

    try {
      // Primeiro tenta a lista já carregada no painel para resposta instantânea.
      const localPost = posts.find((p) => p.slug === slug);
      let post: FeedPost | null = localPost || null;

      // Notícias mais novas podem ainda não estar no lote carregado pelo painel.
      // Nesse caso buscamos diretamente pelo slug no banco.
      if (!post) {
        const response = await fetch(`/api/admin/feed-article?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Notícia não encontrada.");
        }
        post = data.post || null;
      }

      if (!post) throw new Error("Notícia não encontrada.");
      setSelectedPost(post);
      setTitle(post.title);
      setMessage("✅ Notícia carregada. A arte já foi montada abaixo.");
    } catch (err) {
      setSelectedPost(null);
      setMessage(
        err instanceof Error
          ? err.message
          : "Notícia não encontrada. Cole um link /noticia/... que exista no Viralizougoiania.",
      );
    } finally {
      setLoadingArticle(false);
    }
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Escolha uma imagem PNG, JPG, WebP ou SVG para a logo.");
      return;
    }
    if (file.size > 2_500_000) {
      setMessage("A logo deve ter no máximo 2,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setLogoData(value);
      try { localStorage.setItem("viralizou_feed_logo", value); } catch {}
      setMessage("✅ Logo salva neste navegador.");
    };
    reader.readAsDataURL(file);
  }

  function onVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setMessage("Escolha um arquivo de vídeo compatível.");
      return;
    }
    if (file.size > 250_000_000) {
      setMessage("O vídeo deve ter no máximo 250 MB.");
      return;
    }

    setVideoReady(false);
    setVideoFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    setVideoExport(null);
    setFormat("reel");
    setMessage("Carregando o vídeo para a prévia...");
  }

  function removeLogo() {
    setLogoData("");
    try { localStorage.removeItem("viralizou_feed_logo"); } catch {}
  }

  function saveHandle(value: string) {
    setHandle(value);
    try { localStorage.setItem("viralizou_feed_handle", value); } catch {}
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPost) {
      setMessage("Carregue uma notícia antes de baixar.");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `feed-${selectedPost.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function createReel() {
    const canvas = canvasRef.current;
    const video = videoPreviewRef.current;
    if (!videoUrl || !videoFileName || !videoReady || !canvas || !video) {
      setMessage("Carregue um vídeo e aguarde a prévia ficar pronta.");
      return;
    }
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
      setMessage("Seu navegador não oferece gravação da prévia. Use a versão atual do Chrome ou Edge.");
      return;
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      setMessage("Não consegui identificar a duração desse vídeo.");
      return;
    }

    const mimeType = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      "video/mp4",
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      setMessage("Este navegador não oferece um formato de gravação compatível.");
      return;
    }

    setRecording(true);
    setRecordingProgress(0);
    setVideoExport(null);
    setMessage("Gravando a prévia do Reel. Deixe esta aba aberta até terminar.");

    let recorder: MediaRecorder | null = null;
    let canvasStream: MediaStream | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let progressTimer = 0;

    try {
      const duration = Math.min(video.duration, 180);
      video.pause();
      if (video.currentTime > 0) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Não consegui reiniciar o vídeo para gravar.")), 10_000);
          video.addEventListener("seeked", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          video.currentTime = 0;
        });
      }

      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current ||= new AudioContextClass();
        audioSourceRef.current ||= audioContextRef.current.createMediaElementSource(video);
        audioSource = audioSourceRef.current;
        audioDestination = audioContextRef.current.createMediaStreamDestination();
        audioSource.connect(audioDestination);
        await audioContextRef.current.resume();
      }

      canvasStream = canvas.captureStream(30);
      const stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...(audioDestination?.stream.getAudioTracks() || []),
      ]);

      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 });
      const activeRecorder = recorder;
      const blob = await new Promise<Blob>((resolve, reject) => {
        const chunks: Blob[] = [];
        activeRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        activeRecorder.onerror = () => reject(new Error("A gravação do Reel foi interrompida."));
        activeRecorder.onstop = () => {
          const output = new Blob(chunks, { type: activeRecorder.mimeType || mimeType });
          output.size ? resolve(output) : reject(new Error("O vídeo exportado ficou vazio."));
        };
        activeRecorder.start(1000);
        video.muted = false;
        video.play().catch(reject);

        const startedAt = performance.now();
        progressTimer = window.setInterval(() => {
          const progress = Math.min(100, Math.floor(((performance.now() - startedAt) / (duration * 1000)) * 100));
          setRecordingProgress(progress);
          if (progress >= 100 && activeRecorder.state !== "inactive") activeRecorder.stop();
        }, 250);
      });

      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const basename = (selectedPost?.slug || videoFileName.replace(/\.[^.]+$/, "") || "viralizou-reel")
        .replace(/[^a-zA-Z0-9_-]/g, "-") || "viralizou-reel";
      setVideoExport({ url: URL.createObjectURL(blob), filename: `${basename}-reel.${extension}`, type: blob.type });
      setRecordingProgress(100);
      setMessage(`✅ Reel pronto em ${extension.toUpperCase()}. Confira a prévia e baixe o arquivo.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gravar o Reel.");
    } finally {
      window.clearInterval(progressTimer);
      if (recorder?.state !== "inactive") recorder?.stop();
      if (audioDestination) audioSource?.disconnect(audioDestination);
      else audioSource?.disconnect();
      audioDestination?.stream.getTracks().forEach((track) => track.stop());
      canvasStream?.getTracks().forEach((track) => track.stop());
      video.pause();
      video.muted = true;
      video.play().catch(() => {});
      setRecording(false);
    }
  }

  return (
    <section className="panel adminFeedCreator">
      <div className="toolbar">
        <div>
          <h1>🎨 Criador de Post para o Feed</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Monte artes para o Feed ou Reels verticais com sua notícia, marca e vídeo.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      <div className="adminFeedGrid">
        <div className="adminFeedControls">
          <div className="field">
            <label>📐 Formato da publicação</label>
            <div className="adminFeedActions">
              <button type="button" className={format === "feed" ? "btn" : "btn secondary"} onClick={() => setFormat("feed")}>Feed 4:5 · PNG</button>
              <button type="button" className={format === "reel" ? "btn" : "btn secondary"} onClick={() => setFormat("reel")}>Reel 9:16 · Vídeo</button>
            </div>
          </div>

          <div className="field">
            <label>🔗 Link da notícia do Viralizougoiania</label>
            <div className="adminFeedUrlRow">
              <input
                type="url"
                placeholder="https://viralizougoiania.vercel.app/noticia/..."
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); loadArticle(); } }}
              />
              <button type="button" className="btn" onClick={loadArticle} disabled={loadingArticle}>
                {loadingArticle ? "Carregando..." : "Carregar notícia"}
              </button>
            </div>
          </div>

          {format === "reel" && (
            <div className="field">
              <label>🎬 Vídeo para o Reel</label>
              <input type="file" accept="video/*" onChange={onVideoChange} />
              <small>{videoFileName ? `${videoFileName}${videoReady ? " · pronto para prévia" : " · carregando"}` : "Escolha um vídeo de até 250 MB. A exportação usa até 3 minutos."}</small>
            </div>
          )}

          <div className="field">
            <label>📰 Título na arte</label>
            <textarea
              rows={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O título da notícia aparece automaticamente e você pode ajustar antes de baixar."
            />
          </div>

          <div className="field">
            <label>🏷️ Perfil / assinatura</label>
            <input value={handle} onChange={(e) => saveHandle(e.target.value)} placeholder="@viralizougoiania" />
          </div>

          <div className="field">
            <label>🏢 Logo do jornal</label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
            <small>A logo fica salva somente neste navegador do painel. PNG com fundo transparente funciona melhor.</small>
            {logoData && (
              <div className="adminFeedLogoSaved">
                <img src={logoData} alt="Logo escolhida" />
                <button type="button" className="btn secondary" onClick={removeLogo}>Remover logo</button>
              </div>
            )}
          </div>

          <div className="field">
            <label>↕️ Ajuste vertical da foto</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={imagePosition}
              onChange={(e) => setImagePosition(Number(e.target.value))}
            />
          </div>

          {selectedPost && (
            <div className="adminFeedSelected">
              <b>{selectedPost.title}</b>
              <span>{selectedPost.category} • {selectedPost.city}</span>
            </div>
          )}

          <div className="adminFeedActions">
            {format === "feed" && <button type="button" className="btn secondary" disabled={rendering} onClick={renderCard}>
              {rendering ? "Gerando..." : "🔄 Atualizar prévia"}
            </button>}
            {format === "feed" ? (
              <button type="button" className="btn" disabled={!selectedPost || rendering} onClick={downloadPng}>
                ⬇️ Baixar PNG 1080×1350
              </button>
            ) : (
              <button type="button" className="btn" disabled={!videoReady || recording || rendering} onClick={createReel}>
                {recording ? `Gravando ${recordingProgress}%...` : "🎥 Gerar Reel"}
              </button>
            )}
          </div>
          {recording && <progress className="adminFeedRecordingProgress" max={100} value={recordingProgress} />}
        </div>

        <div className="adminFeedPreview">
          <div className="adminFeedCanvasFrame" data-format={format}>
            <canvas ref={canvasRef} width={W} height={H} />
          </div>
          <small>{format === "feed" ? "Formato 4:5 · 1080×1350" : "Formato vertical 9:16 · 1080×1920"}</small>
          {videoExport && (
            <div className="adminFeedVideoResult">
              <video src={videoExport.url} controls playsInline />
              <small>Arquivo gerado: {videoExport.type.includes("mp4") ? "MP4" : "WebM"}</small>
              <a className="btn" href={videoExport.url} download={videoExport.filename}>⬇️ Baixar Reel</a>
            </div>
          )}
        </div>
      </div>
      <video
        ref={videoPreviewRef}
        src={videoUrl || undefined}
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => { setVideoReady(true); renderCard(); }}
        onError={() => { setVideoReady(false); setMessage("Não foi possível abrir esse arquivo de vídeo."); }}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
    </section>
  );
}
