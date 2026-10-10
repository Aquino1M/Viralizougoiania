"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";

type Props = {
  posts: Post[];
  onBack: () => void;
};

type FeedPost = Pick<Post, "slug" | "title" | "image_url" | "category" | "city" | "created_at" | "updated_at">;

const W = 1080;
const H = 1350;
const REEL_H = 1920;
const DEFAULT_LOGO_POSITION = { x: 0.5, y: 0.615 };
const DEFAULT_TITLE_POSITION = { x: 0.5, y: 0.7 };
const DEFAULT_FEED_TITLE_POSITION = { x: 0.5, y: 0.79 };

type LogoPosition = { x: number; y: number };
type ReelTitleLayout = { lines: string[]; fontSize: number; lineHeight: number; width: number; height: number };
type ReelTextStyle = "standard" | "highlight" | "highlight-dark" | "highlight-yellow";
type ReelFontFamily = "anton" | "bebas" | "montserrat" | "poppins" | "impact" | "georgia";
type ReelTextAnimation = "typewriter" | "pop" | "slide" | "fade" | "static";

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

function getLogoSize(logo: HTMLImageElement, format: "feed" | "reel", multiplier = 1) {
  const maxWidth = format === "reel" ? 600 : 430;
  const maxHeight = format === "reel" ? 145 : 105;
  const scale = Math.min(maxWidth / logo.naturalWidth, maxHeight / logo.naturalHeight, 1) * multiplier;
  return { width: logo.naturalWidth * scale, height: logo.naturalHeight * scale };
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

function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, manualSize = 0, fontFamily: ReelFontFamily = "georgia") {
  // O tamanho escolhido é uma preferência, não pode fazer a manchete ser cortada.
  // Se não couber, reduz até caber mantendo todas as palavras e linhas.
  const preferredSize = manualSize > 0 ? manualSize : 68;
  for (let size = preferredSize; size >= 18; size -= 2) {
    ctx.font = getReelFont(fontFamily, size);
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = size * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.1);
    if (lines.length * lineHeight <= 330) return { size, lines };
  }

  // Último recurso para manchetes excepcionalmente longas: preserva o texto inteiro.
  ctx.font = getReelFont(fontFamily, 18);
  return { size: 18, lines: wrapText(ctx, text, maxWidth) };
}

function getReelFont(font: ReelFontFamily, size: number): string {
  switch (font) {
    case "anton":
      return `900 ${size}px "Anton", Impact, sans-serif`;
    case "bebas":
      return `800 ${Math.round(size * 1.15)}px "Bebas Neue", Impact, sans-serif`;
    case "montserrat":
      return `900 ${size}px "Montserrat", -apple-system, sans-serif`;
    case "poppins":
      return `800 ${size}px "Poppins", -apple-system, sans-serif`;
    case "georgia":
      return `800 ${size}px Georgia, "Times New Roman", serif`;
    case "impact":
    default:
      return `700 ${size}px Impact, "Arial Narrow", sans-serif`;
  }
}

function getReelTitleLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  fontFamily: ReelFontFamily,
  textStyle: ReelTextStyle,
): ReelTitleLayout {
  const text = headline.trim().toLocaleUpperCase("pt-BR") || "NOVO REEL";
  const maxWidth = 940;
  let maxLines = 3;
  let startSize = fontFamily === "bebas" ? 92 : fontFamily === "anton" ? 82 : 74;
  if (textStyle === "standard" && fontFamily === "georgia") {
    maxLines = 4;
    startSize = 72;
  }

  let chosenSize = startSize;
  let chosenLines: string[] = [];

  for (let s = startSize; s >= 18; s -= 2) {
    ctx.font = getReelFont(fontFamily, s);
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = s * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.18);
    if (lines.length <= maxLines && lines.length * lineHeight <= 560) {
      chosenSize = s;
      chosenLines = lines;
      break;
    }
    if (s === 18) {
      // Nunca usar slice(maxLines): isso removia o final de títulos compridos.
      chosenSize = 18;
      chosenLines = lines;
    }
  }

  ctx.font = getReelFont(fontFamily, chosenSize);
  const lineHeight = chosenSize * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.18);
  const lineWidths = chosenLines.map((line) => ctx.measureText(line).width);
  const width = Math.max(...lineWidths, 0);
  const height = chosenLines.length * lineHeight;

  return { lines: chosenLines, fontSize: chosenSize, lineHeight, width, height };
}

function drawReelHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  fontFamily: ReelFontFamily,
  textStyle: ReelTextStyle,
  animation: ReelTextAnimation,
  position: LogoPosition,
  currentTime: number,
  duration: number,
) {
  const layout = getReelTitleLayout(ctx, headline, fontFamily, textStyle);
  if (!layout.lines.length) return;

  const animDuration = Math.min(2.5, Math.max(0.6, duration > 0 ? duration * 0.25 : 2.0));
  const rawProgress = Math.min(1, Math.max(0, currentTime / animDuration));

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  const centerX = position.x * W;
  const centerY = position.y * REEL_H;

  let animAlpha = 1;
  let animScale = 1;
  let animOffsetY = 0;
  let visibleCharCount = layout.lines.join("").length;

  if (animation === "typewriter") {
    visibleCharCount = Math.ceil(layout.lines.join("").length * rawProgress);
  } else if (animation === "pop") {
    if (rawProgress < 0.65) {
      const p = rawProgress / 0.65;
      animScale = 0.5 + 0.58 * Math.sin(p * Math.PI * 0.5);
    } else if (rawProgress < 1) {
      const p = (rawProgress - 0.65) / 0.35;
      animScale = 1.08 - 0.08 * p;
    } else {
      animScale = 1;
    }
  } else if (animation === "slide") {
    animAlpha = Math.min(1, rawProgress * 1.4);
    animOffsetY = (1 - Math.min(1, rawProgress * 1.2)) * 60;
  } else if (animation === "fade") {
    animAlpha = Math.min(1, rawProgress * 1.5);
  }

  ctx.globalAlpha = animAlpha;
  ctx.translate(centerX, centerY + animOffsetY);
  if (animScale !== 1) {
    ctx.scale(animScale, animScale);
  }
  ctx.translate(-centerX, -centerY);

  let charsRemaining = visibleCharCount;
  const linesToDraw = layout.lines.map((line) => {
    if (animation !== "typewriter") return line;
    const count = Math.max(0, Math.min(line.length, charsRemaining));
    charsRemaining -= count;
    return line.slice(0, count);
  });

  let currentY = centerY - layout.height / 2 + layout.lineHeight * 0.5;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < linesToDraw.length; i++) {
    const line = linesToDraw[i];
    if (!line) {
      currentY += layout.lineHeight;
      continue;
    }

    ctx.font = getReelFont(fontFamily, layout.fontSize);
    const lineWidth = ctx.measureText(line).width;

    if (textStyle.startsWith("highlight")) {
      const padX = 22;
      const padY = 12;
      const boxW = lineWidth + padX * 2;
      const boxH = layout.fontSize + padY * 2;
      const boxX = centerX - boxW / 2;
      const boxY = currentY - boxH / 2;

      ctx.save();
      if (textStyle === "highlight-dark") {
        ctx.fillStyle = "rgba(12, 12, 12, 0.96)";
      } else if (textStyle === "highlight-yellow") {
        ctx.fillStyle = "#ffcc00";
      } else {
        ctx.fillStyle = "#ffffff";
      }

      const radius = Math.min(12, boxH / 4);
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
      ctx.restore();

      if (textStyle === "highlight-dark") {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = "#111111";
      }
      ctx.fillText(line, centerX, currentY);
    } else {
      ctx.save();
      ctx.lineWidth = 9;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(line, centerX, currentY);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, centerX, currentY);
      ctx.restore();
    }

    currentY += layout.lineHeight;
  }

  ctx.restore();
}

function drawReelFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  logo: HTMLImageElement | null,
  headline: string,
  handle: string,
  logoPosition: LogoPosition,
  titlePosition: LogoPosition,
  textStyle: ReelTextStyle,
  fontFamily: ReelFontFamily,
  textAnimation: ReelTextAnimation,
  showStrongSceneWarning: boolean,
  logoScale: number,
  handleFontSize: number,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, REEL_H);
  if (video && video.readyState >= 2) drawCover(ctx, video, 0, 0, W, REEL_H);

  const shade = ctx.createLinearGradient(0, 650, 0, REEL_H);
  shade.addColorStop(0, "rgba(0,0,0,.05)");
  shade.addColorStop(0.42, "rgba(0,0,0,.68)");
  shade.addColorStop(1, "rgba(0,0,0,.94)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 600, W, REEL_H - 600);

  if (showStrongSceneWarning) {
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(48, 56, W - 96, 78);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '800 36px Arial, sans-serif';
    ctx.fillText("AVISO: CENAS FORTES", W / 2, 95);
  }

  if (logo && logo.complete && logo.naturalWidth) {
    const { width, height } = getLogoSize(logo, "reel", logoScale / 100);
    ctx.drawImage(logo, logoPosition.x * W - width / 2, logoPosition.y * REEL_H - height / 2, width, height);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 57px Arial, sans-serif";
    ctx.fillText("VIRALIZOU", W / 2 - 22, 1200);
    ctx.fillStyle = "#ff5a1f";
    ctx.font = "900 35px Arial, sans-serif";
    ctx.fillText("GOIÂNIA", W / 2 + 214, 1200);
  }

  const currentTime = video ? video.currentTime : 10;
  const duration = video && Number.isFinite(video.duration) ? video.duration : 10;
  drawReelHeadline(ctx, headline, fontFamily, textStyle, textAnimation, titlePosition, currentTime, duration);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.font = `600 ${handleFontSize}px Arial, sans-serif`;
  ctx.fillText(handle.trim() || "@viralizougoiania", W / 2, 1810);

  ctx.restore();
}

export default function SocialFeedCreator({ posts, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const articleImageRef = useRef<{ src: string; image: HTMLImageElement } | null>(null);
  const logoPositionRef = useRef<LogoPosition>(DEFAULT_LOGO_POSITION);
  const titlePositionRef = useRef<LogoPosition>(DEFAULT_TITLE_POSITION);
  const feedTitlePositionRef = useRef<LogoPosition>(DEFAULT_FEED_TITLE_POSITION);
  const logoDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const titleDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);

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
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(DEFAULT_LOGO_POSITION);
  const [titlePosition, setTitlePosition] = useState<LogoPosition>(DEFAULT_TITLE_POSITION);
  const [logoScale, setLogoScale] = useState(100);
  const [handleFontSize, setHandleFontSize] = useState(33);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [reelTextStyle, setReelTextStyle] = useState<ReelTextStyle>("highlight");
  const [reelFontFamily, setReelFontFamily] = useState<ReelFontFamily>("anton");
  const [reelTextAnimation, setReelTextAnimation] = useState<ReelTextAnimation>("typewriter");
  const [showStrongSceneWarning, setShowStrongSceneWarning] = useState(false);
  const [imagePosition, setImagePosition] = useState(0);
  const [feedTitleFontSize, setFeedTitleFontSize] = useState<number>(0); // 0 = automático
  const [feedFontFamily, setFeedFontFamily] = useState<ReelFontFamily>("georgia");
  const [feedTitlePosition, setFeedTitlePosition] = useState<LogoPosition>(DEFAULT_FEED_TITLE_POSITION);
  const [feedTitleOffsetY, setFeedTitleOffsetY] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoExport?.url) URL.revokeObjectURL(videoExport.url); }, [videoExport?.url]);
  useEffect(() => () => { audioContextRef.current?.close().catch(() => {}); }, []);

  // Carrega configurações locais e busca logo salva no Supabase
  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("viralizou_feed_logo") || "";
      const savedHandle = localStorage.getItem("viralizou_feed_handle") || "";
      const savedPosition = JSON.parse(localStorage.getItem("viralizou_feed_logo_position") || "null");
      const savedTitlePosition = JSON.parse(localStorage.getItem("viralizou_reel_title_position") || "null");
      const savedTextStyle = localStorage.getItem("viralizou_reel_text_style") as ReelTextStyle | null;
      const savedFontFamily = localStorage.getItem("viralizou_reel_font_family") as ReelFontFamily | null;
      const savedTextAnim = localStorage.getItem("viralizou_reel_text_animation") as ReelTextAnimation | null;
      const savedWarning = localStorage.getItem("viralizou_reel_strong_scene_warning");
      const savedLogoScale = Number(localStorage.getItem("viralizou_reel_logo_scale"));
      const savedHandleFontSize = Number(localStorage.getItem("viralizou_reel_handle_size"));
      const savedFeedTitleSize = Number(localStorage.getItem("viralizou_feed_title_size") || "0");
      const savedFeedTitleOffsetY = Number(localStorage.getItem("viralizou_feed_title_offset_y") || "0");
      const savedFeedFontFamily = localStorage.getItem("viralizou_feed_font_family") as ReelFontFamily | null;
      const savedFeedTitlePosition = JSON.parse(localStorage.getItem("viralizou_feed_title_position") || "null");

      if (savedLogo) setLogoData(savedLogo);
      if (savedHandle) setHandle(savedHandle);
      if (savedTextStyle) setReelTextStyle(savedTextStyle);
      if (savedFontFamily) setReelFontFamily(savedFontFamily);
      if (savedTextAnim) setReelTextAnimation(savedTextAnim);
      if (savedWarning === "true") setShowStrongSceneWarning(true);
      if (Number.isFinite(savedLogoScale) && savedLogoScale >= 50 && savedLogoScale <= 150) setLogoScale(savedLogoScale);
      if (Number.isFinite(savedHandleFontSize) && savedHandleFontSize >= 18 && savedHandleFontSize <= 72) setHandleFontSize(savedHandleFontSize);
      if (Number.isFinite(savedFeedTitleSize)) setFeedTitleFontSize(savedFeedTitleSize);
      if (Number.isFinite(savedFeedTitleOffsetY)) setFeedTitleOffsetY(savedFeedTitleOffsetY);
      if (savedFeedFontFamily && ["anton", "bebas", "montserrat", "poppins", "impact", "georgia"].includes(savedFeedFontFamily)) setFeedFontFamily(savedFeedFontFamily);
      if (savedFeedTitlePosition && Number.isFinite(savedFeedTitlePosition.x) && Number.isFinite(savedFeedTitlePosition.y)) {
        const position = { x: Math.min(1, Math.max(0, savedFeedTitlePosition.x)), y: Math.min(1, Math.max(0, savedFeedTitlePosition.y)) };
        feedTitlePositionRef.current = position;
        setFeedTitlePosition(position);
      }
      if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
        const position = { x: Math.min(1, Math.max(0, savedPosition.x)), y: Math.min(1, Math.max(0, savedPosition.y)) };
        logoPositionRef.current = position;
        setLogoPosition(position);
      }
      if (savedTitlePosition && Number.isFinite(savedTitlePosition.x) && Number.isFinite(savedTitlePosition.y)) {
        const position = { x: Math.min(1, Math.max(0, savedTitlePosition.x)), y: Math.min(1, Math.max(0, savedTitlePosition.y)) };
        titlePositionRef.current = position;
        setTitlePosition(position);
      }
    } catch {}

    // Sincroniza logo direto do Supabase
    async function fetchSupabaseLogo() {
      try {
        const res = await fetch("/api/admin/feed-logo");
        if (res.ok) {
          const data = await res.json();
          if (data.logo) {
            setLogoData(data.logo);
            try { localStorage.setItem("viralizou_feed_logo", data.logo); } catch {}
          }
        }
      } catch {}
    }
    fetchSupabaseLogo();
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
          try {
            if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
          }
          catch { logoImageRef.current = null; }
        } else {
          logoImageRef.current = null;
        }
        drawReelFrame(
          ctx,
          videoPreviewRef.current,
          logoImageRef.current,
          title || selectedPost?.title || "",
          handle,
          logoPositionRef.current,
          titlePositionRef.current,
          reelTextStyle,
          reelFontFamily,
          reelTextAnimation,
          showStrongSceneWarning,
          logoScale,
          handleFontSize,
        );
        setMessage("");
        return;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      (ctx as any).textRendering = "geometricPrecision";

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);

      if (selectedPost?.image_url) {
        const src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
        const img = articleImageRef.current?.src === src ? articleImageRef.current.image : await loadImage(src);
        articleImageRef.current = { src, image: img };
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

      const headline = (title || selectedPost?.title || "Título da notícia").trim();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      const fitted = fitHeadline(ctx, headline, 920, feedTitleFontSize, feedFontFamily);
      ctx.font = getReelFont(feedFontFamily, fitted.size);

      const lineHeight = fitted.size * 1.1;
      const totalHeight = fitted.lines.length * lineHeight;

      // Base Y centralizada no terço inferior, respeitando margens de segurança
      let startY = feedTitlePosition.y * H - (totalHeight / 2) + feedTitleOffsetY;

      // Garante que a última linha nunca ultrapasse 1235 (o handle @ fica em 1300)
      const maxStartY = 1235 - ((fitted.lines.length - 1) * lineHeight);
      startY = Math.min(maxStartY, Math.max(870, startY));

      // Overlay escuro proporcional à altura do texto para contraste perfeito
      const overlayTop = Math.max(480, startY - 150);
      const overlay = ctx.createLinearGradient(0, overlayTop, 0, 1140);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(0.32, "rgba(0,0,0,.82)");
      overlay.addColorStop(1, "#050505");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, overlayTop, W, H - overlayTop);

      // Logo do jornal sobre o overlay
      if (logoData) {
        try {
          if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
          const logo = logoImageRef.current;
          const { width, height } = getLogoSize(logo, "feed");
          ctx.drawImage(logo, logoPosition.x * W - width / 2, logoPosition.y * H - height / 2, width, height);
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

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = getReelFont(feedFontFamily, fitted.size);

      let lineY = startY;
      for (const line of fitted.lines) {
        ctx.fillText(line, feedTitlePosition.x * W, lineY);
        lineY += lineHeight;
      }

      ctx.fillStyle = "rgba(255,255,255,.94)";
      ctx.font = "600 33px Arial, sans-serif";
      ctx.fillText(handle.trim() || "@viralizougoiania", W / 2, 1300);
      ctx.restore();
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
  }, [selectedPost?.slug, selectedPost?.updated_at, title, logoData, handle, imagePosition, feedTitleFontSize, feedFontFamily, feedTitlePosition.x, feedTitlePosition.y, feedTitleOffsetY, format, logoPosition.x, logoPosition.y, titlePosition.x, titlePosition.y, reelTextStyle, reelFontFamily, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize]);

  // Loop de pré-visualização interativa do Reel
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (format !== "reel" || !videoUrl || !video) return;
    let frameId = 0;
    const draw = () => {
      if (!isRecordingRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && video.readyState >= 2) {
          drawReelFrame(
            ctx,
            video,
            logoImageRef.current,
            title || selectedPost?.title || "",
            handle,
            logoPositionRef.current,
            titlePositionRef.current,
            reelTextStyle,
            reelFontFamily,
            reelTextAnimation,
            showStrongSceneWarning,
            logoScale,
            handleFontSize,
          );
        }
      }
      frameId = requestAnimationFrame(draw);
    };
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title, reelTextStyle, reelFontFamily, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize]);

  async function loadArticle() {
    const slug = slugFromInput(articleUrl);
    if (!slug) {
      setMessage("Cole o link completo de uma notícia do Viralizougoiania.");
      return;
    }

    setLoadingArticle(true);
    setMessage("");

    try {
      const localPost = posts.find((p) => p.slug === slug);
      let post: FeedPost | null = localPost || null;

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

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Escolha uma imagem PNG, JPG, WebP ou SVG para a logo.");
      return;
    }
    if (file.size > 4_000_000) {
      setMessage("A logo deve ter no máximo 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const value = String(reader.result || "");
      setLogoData(value);
      try { localStorage.setItem("viralizou_feed_logo", value); } catch {}
      setMessage("Salvando a logo no Supabase...");
      try {
        const res = await fetch("/api/admin/feed-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo: value }),
        });
        if (res.ok) {
          setMessage("✅ Logo salva no Supabase com sucesso.");
        } else {
          setMessage("✅ Logo salva neste navegador.");
        }
      } catch {
        setMessage("✅ Logo salva neste navegador.");
      }
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

  async function removeLogo() {
    setLogoData("");
    try { localStorage.removeItem("viralizou_feed_logo"); } catch {}
    try {
      await fetch("/api/admin/feed-logo", { method: "DELETE" });
      setMessage("Logo removida do Supabase e do navegador.");
    } catch {
      setMessage("Logo removida deste navegador.");
    }
  }

  function saveHandle(value: string) {
    setHandle(value);
    try { localStorage.setItem("viralizou_feed_handle", value); } catch {}
  }

  function saveFeedTitleSize(value: number) {
    setFeedTitleFontSize(value);
    try { localStorage.setItem("viralizou_feed_title_size", String(value)); } catch {}
  }

  function saveFeedTitleOffsetY(value: number) {
    setFeedTitleOffsetY(value);
    try { localStorage.setItem("viralizou_feed_title_offset_y", String(value)); } catch {}
  }

  function saveReelLogoScale(value: number) {
    setLogoScale(value);
    try { localStorage.setItem("viralizou_reel_logo_scale", String(value)); } catch {}
    const logo = logoImageRef.current;
    if (!logo?.naturalWidth) return;
    const { width, height } = getLogoSize(logo, "reel", value / 100);
    const position = {
      x: Math.min(1 - width / (2 * W), Math.max(width / (2 * W), logoPositionRef.current.x)),
      y: Math.min(1 - height / (2 * REEL_H), Math.max(height / (2 * REEL_H), logoPositionRef.current.y)),
    };
    logoPositionRef.current = position;
    setLogoPosition(position);
    try { localStorage.setItem("viralizou_feed_logo_position", JSON.stringify(position)); } catch {}
  }

  function saveReelHandleSize(value: number) {
    setHandleFontSize(value);
    try { localStorage.setItem("viralizou_reel_handle_size", String(value)); } catch {}
  }

  function chooseReelTextStyle(style: ReelTextStyle) {
    setReelTextStyle(style);
    try { localStorage.setItem("viralizou_reel_text_style", style); } catch {}
  }

  function chooseReelFontFamily(font: ReelFontFamily) {
    setReelFontFamily(font);
    try { localStorage.setItem("viralizou_reel_font_family", font); } catch {}
  }

  function chooseReelTextAnimation(anim: ReelTextAnimation) {
    setReelTextAnimation(anim);
    try { localStorage.setItem("viralizou_reel_text_animation", anim); } catch {}
  }

  function toggleStrongSceneWarning(enabled: boolean) {
    setShowStrongSceneWarning(enabled);
    try { localStorage.setItem("viralizou_reel_strong_scene_warning", String(enabled)); } catch {}
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

  function centerLogo() {
    const position = { x: 0.5, y: 0.5 };
    logoPositionRef.current = position;
    setLogoPosition(position);
    try { localStorage.setItem("viralizou_feed_logo_position", JSON.stringify(position)); } catch {}
  }

  function onPreviewPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (format === "reel") {
      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        const layout = getReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelTextStyle);
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * W;
        const y = ((event.clientY - rect.top) / rect.height) * REEL_H;
        const centerX = titlePositionRef.current.x * W;
        const centerY = titlePositionRef.current.y * REEL_H;
        if (x >= centerX - layout.width / 2 - 20 && x <= centerX + layout.width / 2 + 20 && y >= centerY - layout.height / 2 - 20 && y <= centerY + layout.height / 2 + 20) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          titleDragRef.current = { pointerId: event.pointerId, offsetX: x / W - titlePositionRef.current.x, offsetY: y / REEL_H - titlePositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    if (format === "feed") {
      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        const fitted = fitHeadline(ctx, (title || selectedPost?.title || "Título da notícia").trim(), 920, feedTitleFontSize, feedFontFamily);
        ctx.font = getReelFont(feedFontFamily, fitted.size);
        const width = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width), 0);
        const height = fitted.lines.length * fitted.size * 1.1;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * W;
        const y = ((event.clientY - rect.top) / rect.height) * H;
        const centerX = feedTitlePositionRef.current.x * W;
        const centerY = feedTitlePositionRef.current.y * H;
        if (x >= centerX - width / 2 - 24 && x <= centerX + width / 2 + 24 && y >= centerY - height / 2 - 24 && y <= centerY + height / 2 + 24) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          titleDragRef.current = { pointerId: event.pointerId, offsetX: x / W - feedTitlePositionRef.current.x, offsetY: y / H - feedTitlePositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    const logo = logoImageRef.current;
    if (!logoData || !logo?.naturalWidth) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const canvasHeight = format === "reel" ? REEL_H : H;
    const y = ((event.clientY - rect.top) / rect.height) * canvasHeight;
    const { width, height } = getLogoSize(logo, format, format === "reel" ? logoScale / 100 : 1);
    const centerX = logoPositionRef.current.x * W;
    const centerY = logoPositionRef.current.y * canvasHeight;
    if (x < centerX - width / 2 || x > centerX + width / 2 || y < centerY - height / 2 || y > centerY + height / 2) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    logoDragRef.current = { pointerId: event.pointerId, offsetX: x / W - logoPositionRef.current.x, offsetY: y / canvasHeight - logoPositionRef.current.y };
    setDraggingLogo(true);
  }

  function onPreviewPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const titleDrag = titleDragRef.current;
    if (titleDrag?.pointerId === event.pointerId) {
      const ctx = event.currentTarget.getContext("2d");
      const rect = event.currentTarget.getBoundingClientRect();
      if (format === "reel") {
        const layout = ctx ? getReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelTextStyle) : { width: 0, height: 0 };
        const position = {
          x: Math.min(1 - layout.width / (2 * W), Math.max(layout.width / (2 * W), (event.clientX - rect.left) / rect.width - titleDrag.offsetX)),
          y: Math.min(1 - layout.height / (2 * REEL_H), Math.max(layout.height / (2 * REEL_H), (event.clientY - rect.top) / rect.height - titleDrag.offsetY)),
        };
        titlePositionRef.current = position;
        setTitlePosition(position);
      } else if (ctx) {
        const fitted = fitHeadline(ctx, (title || selectedPost?.title || "Título da notícia").trim(), 920, feedTitleFontSize, feedFontFamily);
        ctx.font = getReelFont(feedFontFamily, fitted.size);
        const width = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width), 0);
        const height = fitted.lines.length * fitted.size * 1.1;
        const position = {
          x: Math.min(1 - width / (2 * W), Math.max(width / (2 * W), (event.clientX - rect.left) / rect.width - titleDrag.offsetX)),
          y: Math.min(1 - height / (2 * H), Math.max(height / (2 * H), (event.clientY - rect.top) / rect.height - titleDrag.offsetY)),
        };
        feedTitlePositionRef.current = position;
        setFeedTitlePosition(position);
      }
      return;
    }

    const drag = logoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const logo = logoImageRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasHeight = format === "reel" ? REEL_H : H;
    const { width, height } = logo ? getLogoSize(logo, format, format === "reel" ? logoScale / 100 : 1) : { width: 0, height: 0 };
    const position = {
      x: Math.min(1 - width / (2 * W), Math.max(width / (2 * W), (event.clientX - rect.left) / rect.width - drag.offsetX)),
      y: Math.min(1 - height / (2 * canvasHeight), Math.max(height / (2 * canvasHeight), (event.clientY - rect.top) / rect.height - drag.offsetY)),
    };
    logoPositionRef.current = position;
    setLogoPosition(position);
  }

  function onPreviewPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (titleDragRef.current?.pointerId === event.pointerId) {
      titleDragRef.current = null;
      setDraggingLogo(false);
      try {
        const key = format === "reel" ? "viralizou_reel_title_position" : "viralizou_feed_title_position";
        const position = format === "reel" ? titlePositionRef.current : feedTitlePositionRef.current;
        localStorage.setItem(key, JSON.stringify(position));
      } catch {}
    } else if (logoDragRef.current?.pointerId === event.pointerId) {
      logoDragRef.current = null;
      setDraggingLogo(false);
      try { localStorage.setItem("viralizou_feed_logo_position", JSON.stringify(logoPositionRef.current)); } catch {}
    } else {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  // GRAVAÇÃO E EXPORTAÇÃO DEFINITIVA DO REEL COM ÁUDIO SINCRONIZADO
  async function createReel() {
    const canvas = canvasRef.current;
    const video = videoPreviewRef.current;
    if (!videoUrl || !videoFileName || !videoReady || !canvas || !video) {
      setMessage("Carregue um vídeo e aguarde a prévia ficar pronta.");
      return;
    }
    if (isRecordingRef.current) return;
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

    isRecordingRef.current = true;
    setRecording(true);
    setRecordingProgress(0);
    setVideoExport(null);
    setMessage("Gravando o Reel com áudio perfeitamente sincronizado. Aguarde até o final...");

    let recorder: MediaRecorder | null = null;
    let canvasStream: MediaStream | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let progressTimer = 0;
    let safetyTimeout = 0;
    let frameCallbackId: number | null = null;
    let animFrameId: number | null = null;

    try {
      const duration = Math.min(video.duration, 180);

      // 1. Pausa e desativa loop para evitar repetição de áudio no final
      video.pause();
      video.loop = false;

      // 2. Garante posicionamento no início exato (t = 0)
      if (video.currentTime > 0) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Não consegui reiniciar o vídeo para gravar.")), 8000);
          video.addEventListener("seeked", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          video.currentTime = 0;
        });
      }

      // 3. Pipeline único e exclusivo de Áudio via Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let audioTrack: MediaStreamTrack | null = null;

      if (AudioContextClass) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        if (!audioSourceRef.current) {
          audioSourceRef.current = audioCtx.createMediaElementSource(video);
        }
        audioSource = audioSourceRef.current;

        // Desconecta qualquer rota anterior para evitar sinais duplicados / eco / volume dobrado
        audioSource.disconnect();

        // Conecta ao nó de destino da gravação (NUNCA conecta aos alto-falantes durante a exportação)
        audioDestination = audioCtx.createMediaStreamDestination();
        audioSource.connect(audioDestination);

        const tracks = audioDestination.stream.getAudioTracks();
        if (tracks.length > 0) {
          audioTrack = tracks[0];
        }
      }

      // Desmuta para alimentar a decodificação do Web Audio
      video.muted = false;
      video.volume = 1;

      // 4. Captura stream do Canvas
      canvasStream = canvas.captureStream(30);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
        audioBitsPerSecond: 192_000,
      });
      const activeRecorder = recorder;

      // 5. Renderização sincronizada com os frames decodificados do vídeo
      const drawFrameSync = () => {
        if (!isRecordingRef.current) return;
        const ctx = canvas.getContext("2d");
        if (ctx && video.readyState >= 2) {
          drawReelFrame(
            ctx,
            video,
            logoImageRef.current,
            title || selectedPost?.title || "",
            handle,
            logoPositionRef.current,
            titlePositionRef.current,
            reelTextStyle,
            reelFontFamily,
            reelTextAnimation,
            showStrongSceneWarning,
            logoScale,
            handleFontSize,
          );
        }
        if ("requestVideoFrameCallback" in video) {
          frameCallbackId = (video as any).requestVideoFrameCallback(drawFrameSync);
        } else {
          animFrameId = requestAnimationFrame(drawFrameSync);
        }
      };

      const blob = await new Promise<Blob>((resolve, reject) => {
        const chunks: Blob[] = [];
        activeRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        activeRecorder.onerror = () => reject(new Error("A gravação do Reel foi interrompida."));
        activeRecorder.onstop = () => {
          const output = new Blob(chunks, { type: activeRecorder.mimeType || mimeType });
          output.size ? resolve(output) : reject(new Error("O vídeo exportado ficou vazio."));
        };

        const stopRecordingGracefully = () => {
          if (activeRecorder.state !== "inactive") {
            activeRecorder.stop();
          }
        };

        // Encerramento exato no evento 'ended' do vídeo
        video.addEventListener("ended", stopRecordingGracefully, { once: true });

        // Timer de segurança
        safetyTimeout = window.setTimeout(stopRecordingGracefully, (duration + 1.2) * 1000);

        activeRecorder.start(250);
        drawFrameSync();

        video.play().catch(reject);

        progressTimer = window.setInterval(() => {
          if (duration > 0) {
            const currentProgress = Math.min(100, Math.floor((video.currentTime / duration) * 100));
            setRecordingProgress(currentProgress);
            if (video.currentTime >= duration && activeRecorder.state !== "inactive") {
              stopRecordingGracefully();
            }
          }
        }, 150);
      });

      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const basename = (selectedPost?.slug || videoFileName.replace(/\.[^.]+$/, "") || "viralizou-reel")
        .replace(/[^a-zA-Z0-9_-]/g, "-") || "viralizou-reel";

      setVideoExport({
        url: URL.createObjectURL(blob),
        filename: `${basename}-reel.${extension}`,
        type: blob.type,
      });
      setRecordingProgress(100);
      setMessage(`✅ Reel pronto em ${extension.toUpperCase()}! Áudio e vídeo perfeitamente sincronizados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gravar o Reel.");
    } finally {
      isRecordingRef.current = false;
      window.clearInterval(progressTimer);
      window.clearTimeout(safetyTimeout);

      if (frameCallbackId && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(frameCallbackId);
      }
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }

      if (recorder?.state !== "inactive") {
        try { recorder?.stop(); } catch {}
      }

      if (audioSource) {
        try { audioSource.disconnect(); } catch {}
      }
      if (audioDestination) {
        try {
          audioDestination.stream.getTracks().forEach((track) => track.stop());
        } catch {}
      }
      if (canvasStream) {
        try {
          canvasStream.getTracks().forEach((track) => track.stop());
        } catch {}
      }

      video.pause();
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;

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
              <small>{videoFileName ? `${videoFileName}${videoReady ? " · pronto para prévia" : " · carregando"}` : "Escolha um vídeo de até 250 MB. O áudio original será mantido com sincronia perfeita."}</small>

              <label style={{ marginTop: 12 }}>🔤 Fonte do título</label>
              <div className="adminFeedActions" role="group" aria-label="Fonte do título do Reel">
                <button type="button" className={reelFontFamily === "anton" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("anton")}>Anton (Viral)</button>
                <button type="button" className={reelFontFamily === "bebas" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("bebas")}>Bebas Neue</button>
                <button type="button" className={reelFontFamily === "montserrat" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("montserrat")}>Montserrat</button>
                <button type="button" className={reelFontFamily === "poppins" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("poppins")}>Poppins</button>
                <button type="button" className={reelFontFamily === "impact" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("impact")}>Impact</button>
                <button type="button" className={reelFontFamily === "georgia" ? "btn" : "btn secondary"} onClick={() => chooseReelFontFamily("georgia")}>Georgia</button>
              </div>

              <label style={{ marginTop: 12 }}>✨ Estilo visual do título</label>
              <div className="adminFeedActions" role="group" aria-label="Estilo do título do Reel">
                <button type="button" className={reelTextStyle === "highlight" ? "btn" : "btn secondary"} aria-pressed={reelTextStyle === "highlight"} onClick={() => chooseReelTextStyle("highlight")}>Faixa branca</button>
                <button type="button" className={reelTextStyle === "highlight-dark" ? "btn" : "btn secondary"} aria-pressed={reelTextStyle === "highlight-dark"} onClick={() => chooseReelTextStyle("highlight-dark")}>Faixa preta</button>
                <button type="button" className={reelTextStyle === "highlight-yellow" ? "btn" : "btn secondary"} aria-pressed={reelTextStyle === "highlight-yellow"} onClick={() => chooseReelTextStyle("highlight-yellow")}>Faixa amarela</button>
                <button type="button" className={reelTextStyle === "standard" ? "btn" : "btn secondary"} aria-pressed={reelTextStyle === "standard"} onClick={() => chooseReelTextStyle("standard")}>Texto c/ contorno</button>
              </div>

              <label style={{ marginTop: 12 }}>🎥 Animação do título</label>
              <div className="adminFeedActions" role="group" aria-label="Animação do título do Reel">
                <button type="button" className={reelTextAnimation === "typewriter" ? "btn" : "btn secondary"} onClick={() => chooseReelTextAnimation("typewriter")}>⌨️ Digitando</button>
                <button type="button" className={reelTextAnimation === "pop" ? "btn" : "btn secondary"} onClick={() => chooseReelTextAnimation("pop")}>💥 Impacto (Pop)</button>
                <button type="button" className={reelTextAnimation === "slide" ? "btn" : "btn secondary"} onClick={() => chooseReelTextAnimation("slide")}>⬆️ Deslizar</button>
                <button type="button" className={reelTextAnimation === "fade" ? "btn" : "btn secondary"} onClick={() => chooseReelTextAnimation("fade")}>✨ Surgir (Fade)</button>
                <button type="button" className={reelTextAnimation === "static" ? "btn" : "btn secondary"} onClick={() => chooseReelTextAnimation("static")}>📌 Fixo</button>
              </div>

              <label className="adminFeedWarningOption" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={showStrongSceneWarning} onChange={(event) => toggleStrongSceneWarning(event.target.checked)} />
                Exibir aviso “Cenas fortes” no Reel
              </label>
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
            {format === "reel" && <small>Arraste o título na prévia para escolher onde ele aparece.</small>}
          </div>

          <div className="field">
            <label>🏷️ Perfil / assinatura</label>
            <input value={handle} onChange={(e) => saveHandle(e.target.value)} placeholder="@viralizougoiania" />
          </div>

          <div className="field">
            <label>🏢 Logo do jornal</label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
            <small>A logo é salva automaticamente no <b>Supabase</b> e neste navegador. PNG com fundo transparente funciona melhor.</small>
            {logoData && (
              <>
                <div className="adminFeedLogoSaved">
                  <img src={logoData} alt="Logo escolhida" />
                  <button type="button" className="btn secondary" onClick={removeLogo}>Remover logo</button>
                </div>
                <div className="adminFeedActions">
                  <button type="button" className="btn secondary" onClick={centerLogo}>🎯 Centralizar logo</button>
                  <small>Arraste a logo na prévia. A posição fica salva no painel.</small>
                </div>
              </>
            )}
          </div>

          {format === "feed" ? (
            <>
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

              <div className="field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🔤 Tamanho da legenda / título</span>
                  <b>{feedTitleFontSize === 0 ? "Automático" : `${feedTitleFontSize}px`}</b>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="range"
                    min="0"
                    max="68"
                    step="2"
                    value={feedTitleFontSize}
                    onChange={(e) => saveFeedTitleSize(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  {feedTitleFontSize !== 0 && (
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 8px", fontSize: "11px", whiteSpace: "nowrap" }}
                      onClick={() => saveFeedTitleSize(0)}
                    >
                      Resetar Auto
                    </button>
                  )}
                </div>
                <small>Evita cortar o texto da manchete no rodapé. Em automático, o tamanho se ajusta sozinho.</small>
              </div>

              <div className="field">
                <label>🔠 Fonte da manchete</label>
                <select
                  value={feedFontFamily}
                  onChange={(event) => {
                    const next = event.target.value as ReelFontFamily;
                    setFeedFontFamily(next);
                    try { localStorage.setItem("viralizou_feed_font_family", next); } catch {}
                  }}
                >
                  <option value="georgia">Georgia · Editorial</option>
                  <option value="anton">Anton · Viral</option>
                  <option value="bebas">Bebas Neue</option>
                  <option value="montserrat">Montserrat</option>
                  <option value="poppins">Poppins</option>
                  <option value="impact">Impact</option>
                </select>
              </div>

              <div className="field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>↕️ Posição vertical da legenda</span>
                  <b>{feedTitleOffsetY > 0 ? `+${feedTitleOffsetY}px` : `${feedTitleOffsetY}px`}</b>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={feedTitleOffsetY}
                    onChange={(e) => saveFeedTitleOffsetY(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  {feedTitleOffsetY !== 0 && (
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 8px", fontSize: "11px", whiteSpace: "nowrap" }}
                      onClick={() => saveFeedTitleOffsetY(0)}
                    >
                      Resetar
                    </button>
                  )}
                </div>
                <small>Ajusta a altura da legenda para cima ou para baixo.</small>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>🔎 Tamanho da logo · {logoScale}%</label>
                <input type="range" min="50" max="150" step="5" value={logoScale} disabled={!logoData} onChange={(e) => saveReelLogoScale(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>🔠 Tamanho do texto do @ · {handleFontSize}px</label>
                <input type="range" min="18" max="72" value={handleFontSize} onChange={(e) => saveReelHandleSize(Number(e.target.value))} />
              </div>
            </>
          )}

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
            <canvas
              ref={canvasRef}
              width={W}
              height={format === "reel" ? REEL_H : H}
              onPointerDown={onPreviewPointerDown}
              onPointerMove={onPreviewPointerMove}
              onPointerUp={onPreviewPointerUp}
              onPointerCancel={onPreviewPointerUp}
              style={{ cursor: logoData || format === "reel" ? (draggingLogo ? "grabbing" : "grab") : "default", touchAction: "none" }}
            />
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
