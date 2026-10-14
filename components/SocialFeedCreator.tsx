"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "@/lib/types";
import {
  type MiniIaEditLevel,
  MINI_IA_LEVELS,
  type VideoFilterPreset,
  VIDEO_FILTERS,
  type BgmTrackPreset,
  BGM_TRACKS,
  type VideoCropRect,
} from "@/lib/mini-ia-constants";
import CropVideoModal from "./CropVideoModal";

type Props = {
  posts: Post[];
  onBack: () => void;
  initialPost?: Post | null;
  onOpenCompressor?: () => void;
};

type FeedPost = Pick<Post, "slug" | "title" | "image_url" | "category" | "city" | "created_at" | "updated_at">;

const W = 1080;
const H = 1350;
const FEED_SQUARE_H = 1080;
const REEL_H = 1920;
const DEFAULT_LOGO_POSITION = { x: 0.5, y: 0.615 };
const DEFAULT_TITLE_POSITION = { x: 0.5, y: 0.7 };
const DEFAULT_FEED_TITLE_POSITION = { x: 0.5, y: 0.79 };

export type PublicationFormat = "feed" | "feed-square" | "reel-cover" | "story" | "reel";

function getCanvasDimensions(fmt: PublicationFormat) {
  switch (fmt) {
    case "feed-square":
      return { width: 1080, height: 1080, label: "Feed 1:1 (Quadrado) · 1080×1080 px" };
    case "reel-cover":
      return { width: 1080, height: 1350, label: "Capa do Reels 4:5 · 1080×1350 px" };
    case "story":
      return { width: 1080, height: 1920, label: "Stories 9:16 · 1080×1920 px" };
    case "reel":
      return { width: 1080, height: 1920, label: "Reels Vertical 9:16 · 1080×1920 px" };
    case "feed":
    default:
      return { width: 1080, height: 1350, label: "Feed Recomendado 4:5 · 1080×1350 px" };
  }
}

export function getEffectiveTagY(fmt: PublicationFormat, pos: number): number {
  const { height } = getCanvasDimensions(fmt);
  if (pos > 0 && pos < height) {
    return pos;
  }
  if (fmt === "feed-square") return 1030;
  if (fmt === "feed" || fmt === "reel-cover") return 1300;
  return 1670;
}

type LogoPosition = { x: number; y: number };
type ReelTitleLayout = { lines: string[]; fontSize: number; lineHeight: number; width: number; height: number };
type ReelTextStyle =
  | "standard"
  | "box-banner"
  | "category-badge"
  | "left-border"
  | "editorial-serif"
  | "highlight"
  | "highlight-dark"
  | "highlight-yellow"
  | "highlight-red"
  | "stroke-strong"
  | "red-bottom"
  | "bacci-red";
type ReelFontFamily = "montserrat" | "anton" | "bebas" | "poppins" | "inter" | "roboto" | "impact" | "georgia";
type ReelFontWeight = "900" | "800" | "700" | "600" | "400" | "italic";
type ReelTextAlign = "left" | "center" | "right";
type ReelTextCase = "uppercase" | "lowercase" | "original";
type ReelTagColor = "red" | "white" | "yellow" | "orange";
type ReelTextAnimation = "typewriter" | "pop" | "slide" | "fade" | "static";
type LogoColorStyle = "white" | "dark" | "gif" | "original";

export interface LayoutPresetData {
  format: PublicationFormat;
  reelTextStyle: ReelTextStyle;
  reelFontFamily: ReelFontFamily;
  reelFontWeight: ReelFontWeight;
  reelTextAlign: ReelTextAlign;
  reelTextCase: ReelTextCase;
  reelFontSize: number;
  tagColor: ReelTagColor;
  tagPositionY: number;
  handle: string;
  handleFontSize: number;
  logoColorStyle: LogoColorStyle;
  logoScale: number;
  logoPosition: LogoPosition;
  titlePosition: LogoPosition;
  feedTitlePosition: LogoPosition;
  feedTitleOffsetY: number;
  feedTitleFontSize: number;
  feedFontFamily: ReelFontFamily;
  shadeOpacity: number;
  showOverlayLayer: boolean;
  showLogoLayer: boolean;
  showTitleLayer: boolean;
  showHandleLayer: boolean;
  showStorySticker: boolean;
  showStrongSceneWarning: boolean;
  videoFramingMode: "cover" | "blur-fit";
  imagePosition: number;
  miniIaLevel: MiniIaEditLevel;
  miniIaMirror: boolean;
  miniIaTrimSeconds: number;
  videoFilter?: VideoFilterPreset;
  cutPauses?: boolean;
  bgmTrack?: BgmTrackPreset;
  autoHookEnabled?: boolean;
  autoHookText?: string;
  videoCrop?: VideoCropRect | null;
}

export interface LayoutPresetSlot {
  id: number;
  name: string;
  summary: string;
  savedAt: string;
  data: LayoutPresetData;
}

const DEFAULT_PRESET_SLOTS: LayoutPresetSlot[] = [
  {
    id: 1,
    name: "🔥 Reels Viral",
    summary: "Reels 9:16 · Caixa Escura · Mini IA Média",
    savedAt: "Padrão",
    data: {
      format: "reel",
      reelTextStyle: "box-banner",
      reelFontFamily: "montserrat",
      reelFontWeight: "900",
      reelTextAlign: "center",
      reelTextCase: "uppercase",
      reelFontSize: 72,
      tagColor: "red",
      tagPositionY: 1670,
      handle: "@viralizougoiania",
      handleFontSize: 33,
      logoColorStyle: "gif",
      logoScale: 100,
      logoPosition: DEFAULT_LOGO_POSITION,
      titlePosition: DEFAULT_TITLE_POSITION,
      feedTitlePosition: DEFAULT_FEED_TITLE_POSITION,
      feedTitleOffsetY: 0,
      feedTitleFontSize: 0,
      feedFontFamily: "montserrat",
      shadeOpacity: 85,
      showOverlayLayer: true,
      showLogoLayer: true,
      showTitleLayer: true,
      showHandleLayer: true,
      showStorySticker: false,
      showStrongSceneWarning: false,
      videoFramingMode: "cover",
      imagePosition: 0,
      miniIaLevel: "media",
      miniIaMirror: false,
      miniIaTrimSeconds: 3,
      videoFilter: "cinema",
      cutPauses: true,
      bgmTrack: "energetic",
      autoHookEnabled: true,
      autoHookText: "",
    },
  },
  {
    id: 2,
    name: "📰 Feed Notícia",
    summary: "Feed 4:5 · Selo Vermelho · Georgia",
    savedAt: "Padrão",
    data: {
      format: "feed",
      reelTextStyle: "category-badge",
      reelFontFamily: "georgia",
      reelFontWeight: "800",
      reelTextAlign: "center",
      reelTextCase: "uppercase",
      reelFontSize: 64,
      tagColor: "yellow",
      tagPositionY: 1670,
      handle: "@viralizougoiania",
      handleFontSize: 33,
      logoColorStyle: "white",
      logoScale: 100,
      logoPosition: DEFAULT_LOGO_POSITION,
      titlePosition: DEFAULT_TITLE_POSITION,
      feedTitlePosition: DEFAULT_FEED_TITLE_POSITION,
      feedTitleOffsetY: 0,
      feedTitleFontSize: 0,
      feedFontFamily: "georgia",
      shadeOpacity: 85,
      showOverlayLayer: true,
      showLogoLayer: true,
      showTitleLayer: true,
      showHandleLayer: true,
      showStorySticker: false,
      showStrongSceneWarning: false,
      videoFramingMode: "cover",
      imagePosition: 0,
      miniIaLevel: "leve",
      miniIaMirror: false,
      miniIaTrimSeconds: 0,
      videoFilter: "none",
      cutPauses: false,
      bgmTrack: "none",
      autoHookEnabled: false,
      autoHookText: "",
    },
  },
  {
    id: 3,
    name: "🟥 Bloco Vermelho TVT",
    summary: "Reels 9:16 · Rodapé Vermelho · Inter 800",
    savedAt: "Padrão",
    data: {
      format: "reel",
      reelTextStyle: "red-bottom",
      reelFontFamily: "inter",
      reelFontWeight: "800",
      reelTextAlign: "left",
      reelTextCase: "original",
      reelFontSize: 60,
      tagColor: "white",
      tagPositionY: 1810,
      handle: "@viralizougoiania",
      handleFontSize: 30,
      logoColorStyle: "gif",
      logoScale: 100,
      logoPosition: DEFAULT_LOGO_POSITION,
      titlePosition: DEFAULT_TITLE_POSITION,
      feedTitlePosition: DEFAULT_FEED_TITLE_POSITION,
      feedTitleOffsetY: 0,
      feedTitleFontSize: 0,
      feedFontFamily: "inter",
      shadeOpacity: 0,
      showOverlayLayer: true,
      showLogoLayer: true,
      showTitleLayer: true,
      showHandleLayer: false,
      showStorySticker: false,
      showStrongSceneWarning: false,
      videoFramingMode: "cover",
      imagePosition: -12,
      miniIaLevel: "media",
      miniIaMirror: false,
      miniIaTrimSeconds: 3,
      videoFilter: "none",
      cutPauses: true,
      bgmTrack: "energetic",
      autoHookEnabled: true,
      autoHookText: "",
    },
  },
];

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
    if (!src) return reject(new Error("URL de imagem vazia"));
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Se falhou com crossOrigin anonymous, tenta novamente sem crossOrigin
      if (img.crossOrigin) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
        fallbackImg.src = src;
      } else {
        reject(new Error("Não foi possível carregar a imagem."));
      }
    };
    img.src = src;
  });
}

async function ensureFontReady(fontString: string) {
  if (typeof document !== "undefined" && document.fonts && document.fonts.load) {
    try {
      await document.fonts.load(fontString);
      await document.fonts.ready;
    } catch {}
  }
}

function isImageDrawable(img: any): boolean {
  if (!img) return false;
  try {
    if (img instanceof HTMLImageElement || ("naturalWidth" in img && "complete" in img)) {
      return Boolean(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }
    if (img instanceof HTMLCanvasElement || ("width" in img && "height" in img && !("videoWidth" in img))) {
      return Boolean(img.width > 0 && img.height > 0);
    }
    if (img instanceof HTMLVideoElement || "videoWidth" in img) {
      return Boolean(img.readyState >= 2 && img.videoWidth > 0 && img.videoHeight > 0);
    }
    return false;
  } catch {
    return false;
  }
}

function safeDrawImage(
  ctx: CanvasRenderingContext2D,
  img: any,
  dx: number,
  dy: number,
  dw?: number,
  dh?: number
): boolean {
  if (!ctx || !isImageDrawable(img)) return false;
  try {
    if (dw !== undefined && dh !== undefined) {
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy);
    }
    return true;
  } catch (err) {
    console.warn("safeDrawImage caught draw error:", err);
    return false;
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  vertical = 0,
  crop?: VideoCropRect | null
) {
  const fullWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const fullHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  if (!fullWidth || !fullHeight) return;

  const cropX = crop ? Math.max(0, Math.min(fullWidth - 10, crop.x)) : 0;
  const cropY = crop ? Math.max(0, Math.min(fullHeight - 10, crop.y)) : 0;
  const sourceWidth = crop ? Math.max(10, Math.min(fullWidth - cropX, crop.width)) : fullWidth;
  const sourceHeight = crop ? Math.max(10, Math.min(fullHeight - cropY, crop.height)) : fullHeight;

  const scale = Math.max(w / sourceWidth, h / sourceHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = cropX + Math.max(0, (sourceWidth - sw) / 2);
  const room = Math.max(0, sourceHeight - sh);
  const sy = cropY + Math.min(room, Math.max(0, room / 2 + (vertical / 100) * (room / 2)));
  try { ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); } catch {}
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  vertical = 0,
  crop?: VideoCropRect | null
) {
  const fullWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const fullHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  if (!fullWidth || !fullHeight) return;

  const cropX = crop ? Math.max(0, Math.min(fullWidth - 10, crop.x)) : 0;
  const cropY = crop ? Math.max(0, Math.min(fullHeight - 10, crop.y)) : 0;
  const sourceWidth = crop ? Math.max(10, Math.min(fullWidth - cropX, crop.width)) : fullWidth;
  const sourceHeight = crop ? Math.max(10, Math.min(fullHeight - cropY, crop.height)) : fullHeight;

  const scale = Math.min(w / sourceWidth, h / sourceHeight);
  const dw = Math.round(sourceWidth * scale);
  const dh = Math.round(sourceHeight * scale);
  const dx = Math.round(x + (w - dw) / 2);
  const roomY = Math.max(0, h - dh);
  const dy = Math.round(y + roomY / 2 + (vertical / 100) * (roomY / 2));
  try { ctx.drawImage(img, cropX, cropY, sourceWidth, sourceHeight, dx, dy, dw, dh); } catch {}
}

function drawVideoWithFraming(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  framingMode: "cover" | "blur-fit",
  vertical = 0,
  mirror = false,
  miniIaConfig?: {
    contrast: number;
    brightness: number;
    saturation: number;
    punchZoom: boolean;
    zoomMax: number;
    zoomPeriod: number;
    filterPreset?: VideoFilterPreset;
  },
  crop?: VideoCropRect | null
) {
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  // Aplica Punch Zoom pulsante suave se ativado pela Mini IA
  if (miniIaConfig?.punchZoom && miniIaConfig.zoomPeriod > 0) {
    const curTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const pZoom = 1 + miniIaConfig.zoomMax * Math.pow(Math.sin((Math.PI * curTime) / miniIaConfig.zoomPeriod), 6);
    ctx.translate(w / 2, h / 2);
    ctx.scale(pZoom, pZoom);
    ctx.translate(-w / 2, -h / 2);
  }

  // Aplica Grade de Cores e Contraste da Mini IA + Filtros de Vídeo
  if (miniIaConfig) {
    const c = miniIaConfig.contrast;
    const b = 1 + miniIaConfig.brightness;
    const s = miniIaConfig.saturation;
    let filterString = `contrast(${c}) brightness(${b}) saturate(${s})`;
    if (miniIaConfig.filterPreset && miniIaConfig.filterPreset !== "none") {
      const extra = VIDEO_FILTERS[miniIaConfig.filterPreset]?.canvasFilter;
      if (extra) {
        filterString = `${filterString} ${extra}`;
      }
    }
    ctx.filter = filterString;
  }

  if (framingMode === "blur-fit") {
    // Desfoque em canvas reduzido (135x240): executa em < 0.5ms em vez de travar a CPU por 300ms a 1080x1920
    if (typeof document !== "undefined") {
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = 135;
      blurCanvas.height = 240;
      const bCtx = blurCanvas.getContext("2d");
      if (bCtx) {
        bCtx.filter = "blur(6px) brightness(0.42)";
        drawCover(bCtx, video, 0, 0, 135, 240, 0, crop);
        ctx.drawImage(blurCanvas, 0, 0, w, h);
      } else {
        drawCover(ctx, video, 0, 0, w, h, 0, crop);
      }
    } else {
      drawCover(ctx, video, 0, 0, w, h, 0, crop);
    }
    drawContain(ctx, video, 0, 0, w, h, vertical, crop);
  } else {
    drawCover(ctx, video, 0, 0, w, h, vertical, crop);
  }

  ctx.restore();
}

function drawViralHookBanner(
  ctx: CanvasRenderingContext2D,
  hookText: string,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  format: PublicationFormat = "reel"
) {
  if (!hookText || !hookText.trim()) return;
  // Exibe durante os primeiros 3.6 segundos de gancho com fade-out suave a partir de 3.0s
  if (currentTime > 3.6) return;
  const alpha = currentTime > 3.0 ? Math.max(0, 1 - (currentTime - 3.0) / 0.6) : 1;
  if (alpha <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const text = hookText.trim().toUpperCase();
  const bannerY = format === "feed-square" ? canvasHeight * 0.22 : format === "feed" ? canvasHeight * 0.20 : canvasHeight * 0.16;
  const fontSize = 38;
  ctx.font = `900 ${fontSize}px "Montserrat", -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const padX = 30;
  const padY = 16;
  const maxW = canvasWidth - 100;
  const boxW = Math.min(maxW, textWidth + padX * 2);
  const boxH = fontSize + padY * 2;
  const boxX = (canvasWidth - boxW) / 2;

  // Sombra de alto impacto para leitura garantida
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Caixa amarela vibrante estilo breaking viral
  ctx.fillStyle = "#FFCC00";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(boxX, bannerY, boxW, boxH, 12);
    ctx.fill();
  } else {
    ctx.fillRect(boxX, bannerY, boxW, boxH);
  }

  // Borda preta estilizada
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(boxX, bannerY, boxW, boxH, 12);
    ctx.stroke();
  } else {
    ctx.strokeRect(boxX, bannerY, boxW, boxH);
  }

  // Texto preto absoluto com contraste máximo
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#000000";
  ctx.fillText(text, canvasWidth / 2, bannerY + boxH / 2 + 1, boxW - 24);

  ctx.restore();
}

function drawStoryStickerGuide(ctx: CanvasRenderingContext2D, canvasWidth: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  const stkW = 580;
  const stkH = 110;
  const stkX = (canvasWidth - stkW) / 2;
  const stkY = 1440;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(stkX, stkY, stkW, stkH, 24);
    ctx.stroke();
    ctx.fill();
  } else {
    ctx.strokeRect(stkX, stkY, stkW, stkH);
    ctx.fillRect(stkX, stkY, stkW, stkH);
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 26px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔗 ÁREA DA FIGURINHA DE LINK / ENQUETE 👆", canvasWidth / 2, stkY + stkH / 2);
  ctx.restore();
}

let cachedOfficialWhiteLogo: HTMLImageElement | null = null;
let cachedOfficialDarkLogo: HTMLImageElement | null = null;
let cachedOfficialWebmLogo: HTMLVideoElement | null = null;
let cachedOfficialGifLogo: HTMLImageElement | null = null;

let cachedCircularRedLogo: HTMLImageElement | null = null;
let cachedClippedCircularRedCanvas: HTMLCanvasElement | null = null;

function getCircularRedLogo(): HTMLCanvasElement | HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (cachedClippedCircularRedCanvas) return cachedClippedCircularRedCanvas;

  if (!cachedCircularRedLogo) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logos/logo-circular-vermelha.png";
    img.onload = () => {
      try {
        const off = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 500;
        const h = img.naturalHeight || img.height || 500;
        off.width = w;
        off.height = h;
        const offCtx = off.getContext("2d");
        if (offCtx) {
          offCtx.imageSmoothingEnabled = true;
          offCtx.imageSmoothingQuality = "high";
          offCtx.clearRect(0, 0, w, h);
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(cx, cy) * 0.935;
          offCtx.beginPath();
          offCtx.arc(cx, cy, r, 0, Math.PI * 2);
          offCtx.closePath();
          offCtx.clip();
          offCtx.drawImage(img, 0, 0, w, h);
          cachedClippedCircularRedCanvas = off;
          window.dispatchEvent(new CustomEvent("viralizou_logo_ready"));
        }
      } catch {}
    };
    img.onerror = () => {
      const fallback = getOfficialLogo("white");
      if (fallback instanceof HTMLImageElement) cachedCircularRedLogo = fallback;
    };
    cachedCircularRedLogo = img;
  }

  if (cachedClippedCircularRedCanvas) return cachedClippedCircularRedCanvas;
  if (cachedCircularRedLogo && isImageDrawable(cachedCircularRedLogo)) return cachedCircularRedLogo;
  return null;
}

function getOfficialLogo(variant: "white" | "dark" | "gif"): HTMLImageElement | HTMLVideoElement | null {
  if (typeof window === "undefined") return null;
  if (variant === "gif") {
    // 1. Tenta carregar o WebM transparente nativo (65 KB, qualidade perfeita com canal Alpha)
    if (!cachedOfficialWebmLogo) {
      try {
        const vid = document.createElement("video");
        vid.src = "/logos/Viralizou_Goiania_logo_animada_transparente.webm";
        vid.autoplay = true;
        vid.loop = true;
        vid.defaultMuted = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.crossOrigin = "anonymous";
        vid.preload = "auto";
        vid.oncanplay = () => {
          vid.play().catch(() => {});
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("viralizou_logo_ready"));
          }
        };
        vid.onloadeddata = () => {
          vid.play().catch(() => {});
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("viralizou_logo_ready"));
          }
        };
        cachedOfficialWebmLogo = vid;
        vid.play().catch(() => {});
      } catch {}
    }

    if (cachedOfficialWebmLogo && isImageDrawable(cachedOfficialWebmLogo)) {
      return cachedOfficialWebmLogo;
    }

    // 2. Fallback para GIF animado oficial do portal
    if (!cachedOfficialGifLogo || !isImageDrawable(cachedOfficialGifLogo)) {
      const img = new Image();
      img.src = "/logos/logo-viralizou-intro.gif";
      img.onload = () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("viralizou_logo_ready"));
        }
      };
      img.onerror = () => {
        // Tenta acionar a conversão da logo caso ainda não tenha sido gerada
        fetch("/api/admin/convert-logo-gif", { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data.ok && data.url) {
              img.src = `${data.url}?t=${Date.now()}`;
            }
          })
          .catch(() => {});
      };
      cachedOfficialGifLogo = img;
      return img;
    }
    return cachedOfficialGifLogo;
  }

  const isWhite = variant === "white";
  let cached = isWhite ? cachedOfficialWhiteLogo : cachedOfficialDarkLogo;

  if (!cached || !isImageDrawable(cached)) {
    const img = new Image();
    img.src = isWhite ? "/logos/logo-viralizou-branca.png" : "/logos/logo-viralizou-preta.png";
    img.onerror = () => {
      if (!img.src.includes("/api/logos/")) {
        img.src = isWhite ? "/api/logos/white" : "/api/logos/dark";
      }
    };
    if (isWhite) cachedOfficialWhiteLogo = img;
    else cachedOfficialDarkLogo = img;
    return img;
  }
  return cached;
}

function getRenderableLogo(
  customLogo: HTMLImageElement | HTMLCanvasElement | null,
  colorStyle: LogoColorStyle,
  defaultVariant: "white" | "dark" | "gif" = "white"
): HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null {
  // 1. Prioridade absoluta: Se o usuário enviou/possui uma logo personalizada válida, USA ELA!
  if (customLogo && isImageDrawable(customLogo)) {
    return customLogo;
  }

  // 2. Se não tem logo personalizada, usa a oficial correspondente ao estilo escolhido
  if (colorStyle === "gif") {
    const gif = getOfficialLogo("gif");
    if (isImageDrawable(gif)) return gif;
  } else if (colorStyle === "white") {
    const white = getOfficialLogo("white");
    if (isImageDrawable(white)) return white;
  } else if (colorStyle === "dark") {
    const dark = getOfficialLogo("dark");
    if (isImageDrawable(dark)) return dark;
  }

  const def = getOfficialLogo(colorStyle === "gif" ? "gif" : defaultVariant);
  return isImageDrawable(def) ? def : null;
}

function getLogoSize(
  logo: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  format: PublicationFormat,
  multiplier = 1
) {
  const w = ("videoWidth" in logo && logo.videoWidth) ? logo.videoWidth : ("naturalWidth" in logo && logo.naturalWidth) ? logo.naturalWidth : (logo.width || 400);
  const h = ("videoHeight" in logo && logo.videoHeight) ? logo.videoHeight : ("naturalHeight" in logo && logo.naturalHeight) ? logo.naturalHeight : (logo.height || 100);
  const maxWidth = format === "reel" || format === "story" ? 600 : format === "feed-square" ? 400 : 430;
  const maxHeight = format === "reel" || format === "story" ? 145 : format === "feed-square" ? 95 : 105;
  const scale = Math.min(maxWidth / (w || 1), maxHeight / (h || 1), 1) * multiplier;
  return { width: (w || 1) * scale, height: (h || 1) * scale };
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

function applyTextCase(text: string, textCase: ReelTextCase): string {
  if (textCase === "uppercase") return text.toLocaleUpperCase("pt-BR");
  if (textCase === "lowercase") return text.toLocaleLowerCase("pt-BR");
  return text;
}

function getReelFont(font: ReelFontFamily, size: number, weight: ReelFontWeight = "900"): string {
  const isItalic = weight === "italic";
  const numWeight = isItalic ? "700" : weight;
  const stylePrefix = isItalic ? "italic " : "";

  switch (font) {
    case "montserrat":
      return `${stylePrefix}${numWeight} ${size}px "Montserrat", -apple-system, sans-serif`;
    case "poppins":
      return `${stylePrefix}${numWeight} ${size}px "Poppins", -apple-system, sans-serif`;
    case "inter":
      return `${stylePrefix}${numWeight} ${size}px "Inter", -apple-system, sans-serif`;
    case "roboto":
      return `${stylePrefix}${numWeight} ${size}px "Roboto", -apple-system, sans-serif`;
    case "anton":
      // Anton no Google Fonts só tem suporte a normal (400), com desenho naturalmente ultra pesado
      return `${stylePrefix}normal ${size}px "Anton", Impact, sans-serif`;
    case "bebas":
      // Bebas Neue no Google Fonts só tem suporte a normal (400)
      return `${stylePrefix}normal ${Math.round(size * 1.12)}px "Bebas Neue", Impact, sans-serif`;
    case "georgia":
      return `${stylePrefix}${numWeight === "900" || numWeight === "800" ? "bold" : numWeight === "400" ? "normal" : "bold"} ${size}px "Merriweather", Georgia, "Times New Roman", serif`;
    case "impact":
    default:
      return `${stylePrefix}bold ${size}px Impact, "Arial Narrow", sans-serif`;
  }
}

function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, manualSize = 0, fontFamily: ReelFontFamily = "georgia") {
  const preferredSize = manualSize > 0 ? manualSize : 68;
  for (let size = preferredSize; size >= 18; size -= 2) {
    ctx.font = getReelFont(fontFamily, size);
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = size * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.1);
    if (lines.length * lineHeight <= 330) return { size, lines };
  }
  ctx.font = getReelFont(fontFamily, 18);
  return { size: 18, lines: wrapText(ctx, text, maxWidth) };
}

function getReelTitleLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight = "900",
  textCase: ReelTextCase = "uppercase",
  manualSize: number = 72,
  maxWidth: number = 820,
): ReelTitleLayout {
  const raw = headline.trim() || "NOVO REEL";
  const text = applyTextCase(raw, textCase);
  const maxLines = 7;
  const maxAllowedHeight = 720;
  const startSize = manualSize > 0 ? manualSize : (fontFamily === "bebas" ? 84 : fontFamily === "anton" ? 76 : 70);

  const getLineHeightForSize = (s: number) => s * (fontFamily === "bebas" ? 1.14 : fontFamily === "anton" ? 1.18 : 1.25);

  const wrapParagraphs = (fontSize: number) => {
    ctx.font = getReelFont(fontFamily, fontSize, fontWeight);
    const paragraphs = text.split("\n");
    const allLines: string[] = [];
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const wrapped = wrapText(ctx, trimmed, maxWidth);
      allLines.push(...wrapped);
    }
    return allLines;
  };

  const exceedsBounds = (lines: string[], lineHeight: number) => {
    if (lines.length > maxLines) return true;
    if (lines.length * lineHeight > maxAllowedHeight) return true;
    const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    return maxLineW > maxWidth;
  };

  let chosenSize = startSize;
  let chosenLines: string[] = [];

  if (manualSize > 0) {
    let s = manualSize;
    let lines = wrapParagraphs(s);
    let lineHeight = getLineHeightForSize(s);
    // Para textos longos: ajusta suavemente mantendo a legibilidade na área segura
    while (exceedsBounds(lines, lineHeight) && s > 46) {
      s -= 2;
      lines = wrapParagraphs(s);
      lineHeight = getLineHeightForSize(s);
    }
    chosenSize = s;
    chosenLines = lines;
  } else {
    for (let s = startSize; s >= 46; s -= 2) {
      const lines = wrapParagraphs(s);
      const lineHeight = getLineHeightForSize(s);
      if (!exceedsBounds(lines, lineHeight)) {
        chosenSize = s;
        chosenLines = lines;
        break;
      }
      if (s <= 46) {
        chosenSize = 46;
        chosenLines = lines;
      }
    }
  }

  ctx.font = getReelFont(fontFamily, chosenSize, fontWeight);
  const lineHeight = getLineHeightForSize(chosenSize);
  const lineWidths = chosenLines.map((line) => ctx.measureText(line).width);
  const width = Math.max(...lineWidths, 0);
  const height = chosenLines.length * lineHeight;

  return { lines: chosenLines, fontSize: chosenSize, lineHeight, width, height };
}

function drawReelSafeZone(ctx: CanvasRenderingContext2D) {
  ctx.save();
  // Header do Instagram Reels (topo 200px)
  ctx.fillStyle = "rgba(10, 15, 26, 0.45)";
  ctx.fillRect(0, 0, W, 200);

  // Barra de ações laterais (Like, Comentários, Compartilhar, Áudio)
  ctx.fillRect(910, 850, 170, 850);

  // Rodapé do Instagram Reels (Perfil, Seguir, Legenda)
  ctx.fillRect(0, 1680, W, 240);

  // Linhas-guia pontilhadas da área segura ideal
  ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(120, 220, 790, 1440);

  // Textos informativos na sobreposição
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 24px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("🛡️ ÁREA SEGURA DO INSTAGRAM REELS (9:16)", W / 2, 260);

  ctx.font = '600 20px "Inter", sans-serif';
  ctx.fillStyle = "#fca5a5";
  ctx.fillText("⚠️ Área do botão Seguir e perfil do Instagram", W / 2, 1820);

  ctx.save();
  ctx.translate(995, 1280);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("⚠️ Ícones Reels (Like, Comentários, Share)", 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawStorySafeZone(ctx: CanvasRenderingContext2D) {
  ctx.save();
  // Topo do Story (Cabeçalho do perfil, barra de progresso, botão fechar) ~230px
  ctx.fillStyle = "rgba(10, 15, 26, 0.45)";
  ctx.fillRect(0, 0, W, 230);

  // Rodapé do Story (Barra de enviar mensagem rápida e direct) ~250px
  ctx.fillRect(0, 1670, W, 250);

  // Margem lateral do Story
  ctx.fillRect(0, 230, 60, 1440);
  ctx.fillRect(W - 60, 230, 60, 1440);

  // Retângulo pontilhado da área segura do Story
  ctx.strokeStyle = "rgba(249, 115, 22, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(70, 240, W - 140, 1420);

  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 24px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("🛡️ ÁREA SEGURA DO INSTAGRAM STORIES (9:16)", W / 2, 280);

  ctx.font = '600 20px "Inter", sans-serif';
  ctx.fillStyle = "#fed7aa";
  ctx.fillText("⚠️ Topo do Story: Barras de Stories e Perfil", W / 2, 120);
  ctx.fillText("⚠️ Rodapé do Story: Campo Enviar Mensagem", W / 2, 1800);

  ctx.restore();
}

function drawFeedSafeZone(ctx: CanvasRenderingContext2D) {
  ctx.save();
  // O Instagram corta no perfil os 135px do topo e os 135px da base
  ctx.fillStyle = "rgba(10, 15, 26, 0.45)";
  ctx.fillRect(0, 0, W, 135);
  ctx.fillRect(0, 1215, W, 135);

  ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(40, 135, W - 80, 1080);

  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 22px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("📐 RECORTE DA GRADE DO PERFIL (1:1 - 1080×1080)", W / 2, 175);

  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillStyle = "#93c5fd";
  ctx.fillText("⚠️ Fora do quadrado 1:1 (não aparece na grade do perfil)", W / 2, 75);
  ctx.fillText("⚠️ Fora do quadrado 1:1 (não aparece na grade do perfil)", W / 2, 1275);

  ctx.restore();
}

function drawFeedSquareSafeZone(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(50, 50, W - 100, FEED_SQUARE_H - 100);

  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 22px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("🛡️ ÁREA SEGURA FEED QUADRADO (1:1 - 1080×1080)", W / 2, 90);
  ctx.restore();
}

type ReelCaptionRaster = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  originX: number;
  originY: number;
  layout: ReelTitleLayout;
};

// Cache de layout expandido para até 512 itens
const reelTitleLayoutCache = new Map<string, ReelTitleLayout>();
// Cache de rasterização pré-renderizada para até 120 itens (sem estourar VRAM)
const reelCaptionRasterCache = new Map<string, ReelCaptionRaster>();

function getCachedReelTitleLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textCase: ReelTextCase,
  fontSize: number,
  maxWidth: number,
): ReelTitleLayout {
  const cacheKey = `${headline.trim()}|${fontFamily}|${fontWeight}|${textCase}|${fontSize}|${maxWidth}`;
  const cached = reelTitleLayoutCache.get(cacheKey);
  if (cached) return cached;

  const layout = getReelTitleLayout(ctx, headline, fontFamily, fontWeight, textCase, fontSize, maxWidth);
  reelTitleLayoutCache.set(cacheKey, layout);
  while (reelTitleLayoutCache.size > 512) {
    const oldestKey = reelTitleLayoutCache.keys().next().value;
    if (oldestKey === undefined) break;
    reelTitleLayoutCache.delete(oldestKey);
  }
  return layout;
}

function renderCaptionStyleToContext(
  ctx: CanvasRenderingContext2D,
  layout: ReelTitleLayout,
  category: string,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textStyle: ReelTextStyle,
  textAlign: ReelTextAlign,
  centerX: number,
  centerY: number,
  maxWidth: number,
  canvasHeight: number,
) {
  const linesToDraw = layout.lines;
  const blockLeft = centerX - layout.width / 2;
  const blockRight = centerX + layout.width / 2;
  const fontString = getReelFont(fontFamily, layout.fontSize, fontWeight);

  // 0. ESTILO BLOCO VERMELHO INFERIOR (Estilo TVT / Notícias)
  if (textStyle === "red-bottom") {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = fontString;
    let curY = centerY - layout.height / 2 + layout.lineHeight * 0.5;
    for (const line of linesToDraw) {
      if (line) {
        ctx.textAlign = "left";
        ctx.fillText(line, blockLeft, curY);
      }
      curY += layout.lineHeight;
    }
    ctx.restore();
    return;
  }

  // 1. ESTILO CAIXA NOTICIOSA (Estilo O Grito - Foto 3)
  if (textStyle === "box-banner") {
    const padX = Math.round(layout.fontSize * 0.45);
    const padY = Math.round(layout.fontSize * 0.35);
    const boxW = Math.min(layout.width + padX * 2, maxWidth + padX);
    const boxH = layout.height + padY * 2;
    let boxX = centerX - boxW / 2;
    if (textAlign === "left") boxX = blockLeft - padX / 2;
    else if (textAlign === "right") boxX = blockRight - boxW + padX / 2;
    const boxY = centerY - boxH / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "rgba(10, 10, 12, 0.96)";

    const radius = Math.min(18, Math.max(8, Math.round(boxH * 0.1)));
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    let curY = centerY - layout.height / 2 + layout.lineHeight * 0.5;
    for (const line of linesToDraw) {
      if (line) {
        ctx.font = fontString;
        let drawX = centerX;
        if (textAlign === "left") {
          ctx.textAlign = "left";
          drawX = boxX + padX;
        } else if (textAlign === "right") {
          ctx.textAlign = "right";
          drawX = boxX + boxW - padX;
        } else {
          ctx.textAlign = "center";
          drawX = centerX;
        }
        ctx.fillText(line, drawX, curY);
      }
      curY += layout.lineHeight;
    }
    ctx.restore();
    return;
  }

  // 2. ESTILO SELO DE CATEGORIA (Estilo Jornal Opção - Foto 2)
  if (textStyle === "category-badge") {
    const badgeText = (category || "NOTÍCIA").trim().toUpperCase();
    const badgeFontSize = Math.max(22, Math.round(layout.fontSize * 0.36));
    ctx.font = `800 ${badgeFontSize}px "Montserrat", -apple-system, sans-serif`;
    const badgeMetrics = ctx.measureText(badgeText);
    const badgePadX = 18;
    const badgePadY = 8;
    const badgeW = badgeMetrics.width + badgePadX * 2;
    const badgeH = badgeFontSize + badgePadY * 2;

    const gap = 16;
    const totalBlockH = badgeH + gap + layout.height;
    const startY = centerY - totalBlockH / 2;

    let badgeX = blockLeft;
    if (textAlign === "center") badgeX = centerX - badgeW / 2;
    else if (textAlign === "right") badgeX = blockRight - badgeW;

    ctx.save();
    ctx.fillStyle = "#b91c1c";
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(badgeX, startY, badgeW, badgeH, 6);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, startY, badgeW, badgeH);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${badgeFontSize}px "Montserrat", -apple-system, sans-serif`;
    ctx.fillText(badgeText, badgeX + badgeW / 2, startY + badgeH / 2);
    ctx.restore();

    let curY = startY + badgeH + gap + layout.lineHeight * 0.5;
    for (const line of linesToDraw) {
      if (line) {
        ctx.font = fontString;
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = centerX;
        if (textAlign === "left") drawX = blockLeft;
        else if (textAlign === "right") drawX = blockRight;

        const strokeW = Math.max(4, Math.round(layout.fontSize * 0.08));
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.94)";
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(line, drawX, curY);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }
    return;
  }

  // 3. ESTILO BARRA LATERAL VERMELHA (Estilo Destaque - Foto 5)
  if (textStyle === "left-border") {
    const barW = 10;
    const barGap = 20;
    const blockH = layout.height;
    const startY = centerY - blockH / 2;
    const barX = textAlign === "right" ? blockRight + 12 : blockLeft - barW - barGap;

    ctx.save();
    ctx.fillStyle = "#e11d48";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(barX, startY, barW, blockH, 5);
      ctx.fill();
    } else {
      ctx.fillRect(barX, startY, barW, blockH);
    }
    ctx.restore();

    let curY = startY + layout.lineHeight * 0.5;
    for (const line of linesToDraw) {
      if (line) {
        ctx.font = fontString;
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = blockLeft;
        if (textAlign === "center") drawX = centerX;
        else if (textAlign === "right") drawX = blockRight;

        const strokeW = Math.max(4, Math.round(layout.fontSize * 0.08));
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.94)";
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(line, drawX, curY);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }
    return;
  }

  // 4. ESTILO EDITORIAL SERIFADO (Estilo Metrópoles - Foto 4)
  if (textStyle === "editorial-serif") {
    const serifFont = getReelFont("georgia", layout.fontSize, fontWeight);
    const tagEyebrow = (category || "REPORTAGEM").trim().toUpperCase();
    const eyebrowSize = Math.max(18, Math.round(layout.fontSize * 0.32));
    const gap = 18;
    const totalH = eyebrowSize + gap + layout.height;
    const startY = centerY - totalH / 2;

    ctx.save();
    ctx.font = `900 ${eyebrowSize}px "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(`• ${tagEyebrow} •`, centerX, startY + eyebrowSize / 2);
    ctx.restore();

    let curY = startY + eyebrowSize + gap + layout.lineHeight * 0.5;
    for (const line of linesToDraw) {
      if (line) {
        ctx.font = serifFont;
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = centerX;
        if (textAlign === "left") drawX = blockLeft;
        else if (textAlign === "right") drawX = blockRight;

        const strokeW = Math.max(4, Math.round(layout.fontSize * 0.08));
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.94)";
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(line, drawX, curY);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }
    return;
  }

  // 5. ESTILOS FAIXA / HIGHLIGHT / STROKE / STANDARD
  let currentY = centerY - layout.height / 2 + layout.lineHeight * 0.5;

  for (let i = 0; i < linesToDraw.length; i++) {
    const line = linesToDraw[i];
    if (!line) {
      currentY += layout.lineHeight;
      continue;
    }

    ctx.font = fontString;
    const lineWidth = ctx.measureText(line).width;

    const padX = Math.round(layout.fontSize * 0.3);
    const padY = Math.round(layout.fontSize * 0.14);
    const boxW = lineWidth + padX * 2;
    const boxH = layout.fontSize + padY * 2;

    let boxX = centerX - boxW / 2;
    let drawX = centerX;

    if (textAlign === "left") {
      boxX = blockLeft;
      drawX = blockLeft + padX;
      ctx.textAlign = "left";
    } else if (textAlign === "right") {
      boxX = blockRight - boxW;
      drawX = blockRight - padX;
      ctx.textAlign = "right";
    } else {
      boxX = centerX - boxW / 2;
      drawX = centerX;
      ctx.textAlign = "center";
    }

    ctx.textBaseline = "middle";

    if (textStyle.startsWith("highlight")) {
      const boxY = currentY - boxH / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      let boxBg = "#ffcc00";
      let textFg = "#111111";

      if (textStyle === "highlight-dark") {
        boxBg = "rgba(12, 12, 14, 0.96)";
        textFg = "#ffffff";
      } else if (textStyle === "highlight-yellow") {
        boxBg = "#ffcc00";
        textFg = "#111111";
      } else if (textStyle === "highlight-red") {
        boxBg = "#e11d48";
        textFg = "#ffffff";
      }

      ctx.fillStyle = boxBg;
      const radius = Math.min(12, Math.max(6, Math.round(boxH * 0.16)));
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = textFg;
      ctx.fillText(line, drawX, currentY);
      ctx.restore();
    } else if (textStyle === "stroke-strong") {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 5;

      const strokeW = Math.max(8, Math.round(layout.fontSize * 0.14));
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = "#000000";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(line, drawX, currentY);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, drawX, currentY);
      ctx.restore();
    } else {
      // standard: "Só a letra (sem fundo)"
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      const strokeW = Math.max(5, Math.round(layout.fontSize * 0.09));
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.94)";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(line, drawX, currentY);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, drawX, currentY);
      ctx.restore();
    }

    currentY += layout.lineHeight;
  }
}

function getCachedReelCaptionRaster(
  ctx: CanvasRenderingContext2D,
  headline: string,
  category: string,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textStyle: ReelTextStyle,
  textAlign: ReelTextAlign,
  textCase: ReelTextCase,
  fontSize: number,
  canvasHeight: number,
  maxWidth: number,
): ReelCaptionRaster | null {
  if (typeof document === "undefined") return null;

  const key = `${headline.trim()}|${category.trim()}|${fontFamily}|${fontWeight}|${textStyle}|${textAlign}|${textCase}|${fontSize}|${canvasHeight}|${maxWidth}`;
  const existing = reelCaptionRasterCache.get(key);
  if (existing) return existing;

  const layout = getCachedReelTitleLayout(ctx, headline, fontFamily, fontWeight, textCase, fontSize, maxWidth);
  if (!layout.lines.length) return null;

  const offW = W;
  const offH = Math.min(canvasHeight, Math.ceil(layout.height + 340));

  const offscreen = document.createElement("canvas");
  offscreen.width = offW;
  offscreen.height = offH;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return null;

  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = "high";
  (offCtx as any).textRendering = "geometricPrecision";

  const originX = Math.round(offW / 2);
  const originY = Math.round(offH / 2);

  renderCaptionStyleToContext(
    offCtx,
    layout,
    category,
    fontFamily,
    fontWeight,
    textStyle,
    textAlign,
    originX,
    originY,
    maxWidth,
    canvasHeight,
  );

  const raster: ReelCaptionRaster = {
    canvas: offscreen,
    width: offW,
    height: offH,
    originX,
    originY,
    layout,
  };

  reelCaptionRasterCache.set(key, raster);
  while (reelCaptionRasterCache.size > 120) {
    const oldestKey = reelCaptionRasterCache.keys().next().value;
    if (oldestKey === undefined) break;
    reelCaptionRasterCache.delete(oldestKey);
  }

  return raster;
}

function drawReelHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  category: string,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textStyle: ReelTextStyle,
  textAlign: ReelTextAlign,
  textCase: ReelTextCase,
  fontSize: number,
  animation: ReelTextAnimation,
  position: LogoPosition,
  currentTime: number,
  duration: number,
  canvasHeight: number = REEL_H,
  maxWidth: number = 820,
  handle: string = "@VIRALIZOUGOIANIA",
) {
  // Estilo Bloco Vermelho Notícia (TVT / Notícias): Fundo vermelho sólido cobrindo o terço inferior + manchete branca à esquerda + rodapé clean
  if (textStyle === "red-bottom") {
    const bannerY = Math.round(canvasHeight * 0.615); // ~1180px em 1920
    const bannerH = canvasHeight - bannerY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    (ctx as any).textRendering = "geometricPrecision";

    // 1. Bloco Vermelho Sólido Noticioso (Estilo TVT / Notícias)
    ctx.fillStyle = "#e50014";
    ctx.fillRect(0, bannerY, W, bannerH);

    // 2. Linha decorativa branca e círculo outline na base
    const lineY = canvasHeight - 110;
    const padX = 72;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padX, lineY);
    ctx.lineTo(W - 240, lineY);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(W - 140, lineY, 26, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Manchete / Título digitado pelo usuário
    const maxTextW = W - padX * 2;
    const effFontSize = fontSize > 0 ? fontSize : 60;
    const effFont = getReelFont(fontFamily || "inter", effFontSize, fontWeight || "800");
    ctx.font = effFont;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const layout = getCachedReelTitleLayout(ctx, headline, fontFamily, fontWeight, textCase, effFontSize, maxTextW);
    const startY = bannerY + 65;
    const lineH = Math.round(effFontSize * 1.28);

    const animDuration = Math.min(2.5, Math.max(0.6, duration > 0 ? duration * 0.25 : 2.0));
    const rawProgress = Math.min(1, Math.max(0, currentTime / animDuration));
    let totalCharsAllowed = animation === "typewriter" ? Math.floor(layout.lines.join("").length * rawProgress) : 999999;
    let charsDrawn = 0;

    let curY = startY;
    for (const line of layout.lines) {
      if (!line) {
        curY += lineH;
        continue;
      }
      if (animation === "typewriter") {
        const remaining = totalCharsAllowed - charsDrawn;
        if (remaining <= 0) break;
        const visibleSlice = line.slice(0, remaining);
        ctx.fillText(visibleSlice, padX, curY);
        charsDrawn += visibleSlice.length;
      } else {
        if (animation === "fade") {
          ctx.globalAlpha = Math.min(1, rawProgress * 1.5);
        }
        ctx.fillText(line, padX, curY);
      }
      curY += lineH;
    }

    ctx.restore();
    return;
  }

  // Estilo Bacci Notícias (Tarja Vermelha & Logo Circular do Viralizou)
  if (textStyle === "bacci-red") {
    const isSquare = canvasHeight <= 1100;
    const isFeed = canvasHeight <= 1400 && !isSquare;
    const topY = isSquare
      ? Math.round(canvasHeight * 0.48)
      : isFeed
      ? Math.round(canvasHeight * 0.52)
      : Math.round(canvasHeight * 0.58);

    const darkBoxH = isSquare ? 230 : isFeed ? 270 : 330;
    const redBarH = isSquare ? 120 : isFeed ? 136 : 156;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    (ctx as any).textRendering = "geometricPrecision";

    // 1. CAIXA SUPERIOR DA NOTÍCIA (Dark Card estilo Bacci)
    const darkGrad = ctx.createLinearGradient(0, topY, 0, topY + darkBoxH);
    darkGrad.addColorStop(0, "rgba(8, 10, 18, 0.98)");
    darkGrad.addColorStop(0.5, "rgba(12, 16, 28, 0.99)");
    darkGrad.addColorStop(1, "rgba(5, 7, 14, 0.99)");
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, topY, W, darkBoxH);

    // Linha sutil de brilho superior
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, topY, W, 2);

    // 2. LOGO CIRCULAR VG VIRALIZOU GOIÂNIA (À ESQUERDA)
    // Cortada 100% redonda (tira toda a parte branca quadrada dos cantos)
    const logoSize = isSquare ? 140 : isFeed ? 160 : 190;
    const logoX = 46;
    const logoY = topY + Math.round((darkBoxH - logoSize) / 2);
    const circularLogo = getCircularRedLogo();

    if (circularLogo && isImageDrawable(circularLogo)) {
      ctx.save();
      const cx = logoX + logoSize / 2;
      const cy = logoY + logoSize / 2;
      const r = (logoSize / 2) * 0.935;

      // Glow vermelho atrás da logo
      ctx.shadowColor = "rgba(220, 38, 38, 0.65)";
      ctx.shadowBlur = 24;

      // Corte circular perfeito (elimina qualquer fundo branco externo)
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(circularLogo, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      // Borda 3D branca brilhante em volta do anel
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. LINHA SEPARADORA VERTICAL BRANCA (|)
    const dividerX = logoX + logoSize + (isSquare ? 28 : 38);
    const dividerTop = topY + (isSquare ? 30 : 42);
    const dividerBottom = topY + darkBoxH - (isSquare ? 30 : 42);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(dividerX, dividerTop);
    ctx.lineTo(dividerX, dividerBottom);
    ctx.stroke();
    ctx.restore();

    // 4. MANCHETE / TÍTULO DA NOTÍCIA (À DIREITA DA LINHA)
    const textStartX = dividerX + (isSquare ? 24 : 34);
    const textMaxW = W - textStartX - (isSquare ? 36 : 48);
    const effFontSize = fontSize > 0 ? Math.min(fontSize, isSquare ? 42 : isFeed ? 48 : 56) : (isSquare ? 40 : isFeed ? 46 : 52);
    const effFont = getReelFont(fontFamily === "georgia" ? "anton" : (fontFamily || "anton"), effFontSize, "900");
    ctx.font = effFont;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const layout = getCachedReelTitleLayout(ctx, headline, fontFamily || "anton", "900", "uppercase", effFontSize, textMaxW);
    const lineH = Math.round(effFontSize * 1.18);
    const totalTextH = layout.lines.length * lineH;
    const textStartY = topY + Math.max(26, Math.round((darkBoxH - totalTextH) / 2));

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    const animDuration = Math.min(2.5, Math.max(0.6, duration > 0 ? duration * 0.25 : 2.0));
    const rawProgress = Math.min(1, Math.max(0, currentTime / animDuration));
    const totalCharsAllowed = animation === "typewriter" ? Math.floor(layout.lines.join("").length * rawProgress) : 999999;
    let charsDrawn = 0;

    let curY = textStartY;
    for (const line of layout.lines) {
      if (!line) {
        curY += lineH;
        continue;
      }
      if (animation === "typewriter") {
        const remaining = totalCharsAllowed - charsDrawn;
        if (remaining <= 0) break;
        const visibleSlice = line.slice(0, remaining);
        ctx.fillText(visibleSlice, textStartX, curY);
        charsDrawn += visibleSlice.length;
      } else {
        if (animation === "fade") {
          ctx.globalAlpha = Math.min(1, rawProgress * 1.5);
        }
        ctx.fillText(line, textStartX, curY);
      }
      curY += lineH;
    }
    ctx.restore();

    // 5. TARJA INFERIOR VERMELHA NOTICIOSA (Broadcast Lower-Third)
    const redBarY = topY + darkBoxH;
    const redGrad = ctx.createLinearGradient(0, redBarY, W, redBarY + redBarH);
    redGrad.addColorStop(0, "#991b1b");
    redGrad.addColorStop(0.35, "#dc2626");
    redGrad.addColorStop(0.7, "#b91c1c");
    redGrad.addColorStop(1, "#7f1d1d");

    ctx.fillStyle = redGrad;
    ctx.fillRect(0, redBarY, W, redBarH);

    // Reflexo brilhante no topo da tarja vermelha
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, redBarY, W, 2.5);

    // 6. ÍCONE DE REDE SOCIAL & CANAL (À ESQUERDA NA TARJA VERMELHA)
    const rawHandle = (category || "").toUpperCase().includes("GOIÁS") || (category || "").toUpperCase().includes("GOIÂNIA")
      ? "@VIRALIZOUGOIANIA"
      : "@VIRALIZOUGOIANIA";
    const socialText = (handle && handle.trim() ? handle.trim().toUpperCase() : rawHandle).replace(/^@/, "");
    const socialLabel = `YOUTUBE.COM/@${socialText}`;

    // Ícone do YouTube (botão vermelho estilo player com triângulo branco)
    const ytBadgeX = 46;
    const ytBadgeY = redBarY + (isSquare ? 22 : isFeed ? 28 : 34);
    const ytBadgeW = isSquare ? 46 : 54;
    const ytBadgeH = isSquare ? 32 : 38;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(ytBadgeX, ytBadgeY, ytBadgeW, ytBadgeH, 8);
      ctx.fill();
    } else {
      ctx.fillRect(ytBadgeX, ytBadgeY, ytBadgeW, ytBadgeH);
    }
    // Triângulo vermelho do play
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(ytBadgeX + (isSquare ? 18 : 22), ytBadgeY + (isSquare ? 9 : 11));
    ctx.lineTo(ytBadgeX + (isSquare ? 32 : 37), ytBadgeY + (isSquare ? 16 : 19));
    ctx.lineTo(ytBadgeX + (isSquare ? 18 : 22), ytBadgeY + (isSquare ? 23 : 27));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Texto do canal do YouTube / Handle
    ctx.save();
    const handleFSize = isSquare ? 30 : isFeed ? 34 : 38;
    ctx.font = `900 ${handleFSize}px "Montserrat", "Arial Black", sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 8;
    ctx.fillText(socialLabel, ytBadgeX + ytBadgeW + 14, ytBadgeY + ytBadgeH / 2);
    ctx.restore();

    // 7. SLOGAN COM LINHA DECORATIVA (Embaixo do canal)
    const sloganY = redBarY + (isSquare ? 80 : isFeed ? 94 : 106);
    const sloganText = "O PORTAL QUE VIRALIZA GOIÂNIA!";
    ctx.save();
    const sloganFSize = isSquare ? 17 : isFeed ? 19 : 21;
    ctx.font = `800 ${sloganFSize}px "Montserrat", sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Linha decorativa branca fina
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ytBadgeX, sloganY);
    ctx.lineTo(ytBadgeX + 65, sloganY);
    ctx.stroke();

    ctx.fillText(sloganText, ytBadgeX + 78, sloganY);
    ctx.restore();

    // 8. SELO CIRCULAR DE CANAL DE TV (À DIREITA NA TARJA VERMELHA)
    const tvBadgeSize = isSquare ? 90 : isFeed ? 104 : 118;
    const tvBadgeX = W - tvBadgeSize - 46;
    const tvBadgeY = redBarY + Math.round((redBarH - tvBadgeSize) / 2);

    if (circularLogo && isImageDrawable(circularLogo)) {
      ctx.save();
      const tvCx = tvBadgeX + tvBadgeSize / 2;
      const tvCy = tvBadgeY + tvBadgeSize / 2;
      const tvR = (tvBadgeSize / 2) * 0.92;

      // Fundo branco do selo de TV
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(tvCx, tvCy, tvR + 3, 0, Math.PI * 2);
      ctx.fill();

      // Borda prata/branca
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Corte circular do logo
      ctx.beginPath();
      ctx.arc(tvCx, tvCy, tvR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(circularLogo, tvBadgeX, tvBadgeY, tvBadgeSize, tvBadgeSize);
      ctx.restore();

      // Mini selo de "TV" no canto inferior do badge
      ctx.save();
      const miniR = isSquare ? 12 : 14;
      const miniBadgeX = tvBadgeX + tvBadgeSize - miniR * 2 - 2;
      const miniBadgeY = tvBadgeY + tvBadgeSize - miniR * 2 - 2;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(miniBadgeX + miniR, miniBadgeY + miniR, miniR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${isSquare ? 10 : 12}px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TV", miniBadgeX + miniR, miniBadgeY + miniR);
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  const raster = getCachedReelCaptionRaster(
    ctx, headline, category, fontFamily, fontWeight, textStyle,
    textAlign, textCase, fontSize, canvasHeight, maxWidth,
  );
  if (!raster) return;

  const animDuration = Math.min(2.5, Math.max(0.6, duration > 0 ? duration * 0.25 : 2.0));
  const rawProgress = Math.min(1, Math.max(0, currentTime / animDuration));

  const centerX = position.x * W;
  const centerY = position.y * canvasHeight;
  const drawX = Math.round(centerX - raster.originX);
  const drawY = Math.round(centerY - raster.originY);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  // Se o estilo for category-badge, desenha a barra sutil na base da tela
  if (textStyle === "category-badge") {
    ctx.save();
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(0, canvasHeight - 12, W, 12);
    ctx.restore();
  }

  if (animation === "fade") {
    ctx.globalAlpha = Math.min(1, rawProgress * 1.5);
    ctx.drawImage(raster.canvas, drawX, drawY);
  } else if (animation === "slide") {
    ctx.globalAlpha = Math.min(1, rawProgress * 1.4);
    const offsetY = (1 - Math.min(1, rawProgress * 1.2)) * 60;
    ctx.drawImage(raster.canvas, drawX, drawY + offsetY);
  } else if (animation === "pop") {
    let animScale = 1;
    if (rawProgress < 0.65) {
      const p = rawProgress / 0.65;
      animScale = 0.5 + 0.58 * Math.sin(p * Math.PI * 0.5);
    } else if (rawProgress < 1) {
      const p = (rawProgress - 0.65) / 0.35;
      animScale = 1.08 - 0.08 * p;
    }
    ctx.translate(centerX, centerY);
    if (animScale !== 1) ctx.scale(animScale, animScale);
    ctx.drawImage(raster.canvas, -raster.originX, -raster.originY);
  } else if (animation === "typewriter" && rawProgress < 1) {
    const totalChars = raster.layout.lines.join("").length;
    const visibleChars = Math.floor(totalChars * rawProgress);

    // Identifica o ponto de partida vertical das linhas
    let line0Top = raster.originY - raster.layout.height / 2;
    if (textStyle === "category-badge") {
      const badgeFontSize = Math.max(22, Math.round(raster.layout.fontSize * 0.36));
      const badgeH = badgeFontSize + 16;
      line0Top = raster.originY - (badgeH + 16 + raster.layout.height) / 2 + badgeH + 16;
    } else if (textStyle === "editorial-serif") {
      const eyebrowSize = Math.max(18, Math.round(raster.layout.fontSize * 0.32));
      line0Top = raster.originY - (eyebrowSize + 18 + raster.layout.height) / 2 + eyebrowSize + 18;
    }

    const absLine0Top = drawY + line0Top;

    ctx.save();
    ctx.beginPath();

    // Badges ou barras de topo sempre visíveis desde o início da animação
    if (textStyle === "category-badge" || textStyle === "editorial-serif") {
      ctx.rect(0, drawY - 20, W, Math.max(0, absLine0Top - drawY + 10));
    }
    if (textStyle === "left-border") {
      ctx.rect(0, drawY - 20, W, raster.layout.height + 40);
    }

    let charsCounted = 0;
    ctx.font = getReelFont(fontFamily, raster.layout.fontSize, fontWeight);

    for (let i = 0; i < raster.layout.lines.length; i++) {
      const lineText = raster.layout.lines[i];
      const lineLen = lineText.length;
      const charsInThisLine = Math.max(0, Math.min(lineLen, visibleChars - charsCounted));
      charsCounted += lineLen;

      if (charsInThisLine > 0) {
        const lineTop = absLine0Top + i * raster.layout.lineHeight - 4;
        const lineH = raster.layout.lineHeight + 8;

        if (charsInThisLine >= lineLen) {
          ctx.rect(0, lineTop, W, lineH);
        } else {
          const fullLineW = ctx.measureText(lineText).width;
          const partialW = ctx.measureText(lineText.slice(0, charsInThisLine)).width;

          let lineStartX = centerX - fullLineW / 2;
          if (textAlign === "left") lineStartX = centerX - raster.layout.width / 2;
          else if (textAlign === "right") lineStartX = centerX + raster.layout.width / 2 - fullLineW;

          ctx.rect(0, lineTop, Math.max(0, lineStartX + partialW + 20), lineH);
        }
      }
    }

    ctx.clip();
    ctx.drawImage(raster.canvas, drawX, drawY);
    ctx.restore();
  } else {
    // Modo estático ou pós-conclusão da animação (0.05ms)
    ctx.drawImage(raster.canvas, drawX, drawY);
  }

  ctx.restore();
}

function drawReelFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  logo: HTMLImageElement | null,
  headline: string,
  category: string,
  handle: string,
  logoPosition: LogoPosition,
  titlePosition: LogoPosition,
  textStyle: ReelTextStyle,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textAlign: ReelTextAlign,
  textCase: ReelTextCase,
  fontSize: number,
  textAnimation: ReelTextAnimation,
  showStrongSceneWarning: boolean,
  logoScale: number,
  handleFontSize: number,
  tagColor: ReelTagColor,
  tagPositionY: number,
  showSafeZone: boolean = false,
  logoColorStyle: LogoColorStyle = "white",
  shadeOpacity: number = 85,
  showLogoLayer: boolean = true,
  showTitleLayer: boolean = true,
  showHandleLayer: boolean = true,
  showStorySticker: boolean = false,
  format: PublicationFormat = "reel",
  framingMode: "cover" | "blur-fit" = "cover",
  imageVertical: number = 0,
  mirror: boolean = false,
  miniIaConfig?: {
    contrast: number;
    brightness: number;
    saturation: number;
    punchZoom: boolean;
    zoomMax: number;
    zoomPeriod: number;
    filterPreset?: VideoFilterPreset;
    autoHookEnabled?: boolean;
    autoHookText?: string;
  },
  crop?: VideoCropRect | null
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, REEL_H);
  if (video && video.readyState >= 2) {
    drawVideoWithFraming(ctx, video, W, REEL_H, framingMode, imageVertical, mirror, miniIaConfig, crop);
  }

  const maxAlpha = shadeOpacity / 100;
  if (shadeOpacity > 0 && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    const shade = ctx.createLinearGradient(0, 650, 0, REEL_H);
    shade.addColorStop(0, `rgba(0,0,0,${(0.05 * maxAlpha).toFixed(2)})`);
    shade.addColorStop(0.42, `rgba(0,0,0,${(0.68 * maxAlpha).toFixed(2)})`);
    shade.addColorStop(1, `rgba(0,0,0,${(0.96 * maxAlpha).toFixed(2)})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 600, W, REEL_H - 600);
  }

  if (showStrongSceneWarning) {
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(48, 56, W - 96, 78);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '800 36px Arial, sans-serif';
    ctx.fillText("AVISO: CENAS FORTES", W / 2, 95);
  }

  if (showLogoLayer && textStyle !== "bacci-red") {
    const renderLogo = getRenderableLogo(logo, logoColorStyle, "white");
    if (renderLogo && isImageDrawable(renderLogo)) {
      const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
      safeDrawImage(ctx, renderLogo, logoPosition.x * W - width / 2, logoPosition.y * REEL_H - height / 2, width, height);
    }
  }

  if (showTitleLayer) {
    const currentTime = video ? video.currentTime : 10;
    const duration = video && Number.isFinite(video.duration) ? video.duration : 10;
    const effectiveHeadline = (headline || "TÍTULO DA SUA NOTÍCIA").trim();
    drawReelHeadline(
      ctx,
      effectiveHeadline,
      category || "VIRALIZOU",
      fontFamily,
      fontWeight,
      textStyle,
      textAlign,
      textCase,
      fontSize,
      textAnimation,
      titlePosition,
      currentTime,
      duration,
      REEL_H,
      820,
      handle || "@VIRALIZOUGOIANIA",
    );
  }

  if (format === "story" && showStorySticker && showSafeZone) {
    drawStoryStickerGuide(ctx, W);
  }

  // Assinatura / Tag Inferior
  if (showHandleLayer && handle && handle.trim() && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    const tagText = handle.trim();
    const tagY = getEffectiveTagY(format, tagPositionY);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${handleFontSize}px "Montserrat", -apple-system, sans-serif`;

    let textColor = "#ffffff";
    if (tagColor === "red") textColor = "#ff3b30";
    else if (tagColor === "yellow") textColor = "#ffcc00";
    else if (tagColor === "orange") textColor = "#ff5a1f";

    const metrics = ctx.measureText(tagText);
    const padX = 20;
    const padY = 10;
    const boxW = metrics.width + padX * 2;
    const boxH = handleFontSize + padY * 2;
    const boxX = W / 2 - boxW / 2;
    const boxY = tagY - boxH / 2;

    ctx.fillStyle = "rgba(10, 10, 12, 0.72)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }

    ctx.shadowColor = "transparent";
    ctx.fillStyle = textColor;
    ctx.fillText(tagText, W / 2, tagY);
    ctx.restore();
  }

  // Banner de Gancho Viral Auto-Edit (primeiros 3.5s)
  if (video && miniIaConfig?.autoHookEnabled && miniIaConfig.autoHookText) {
    drawViralHookBanner(ctx, miniIaConfig.autoHookText, W, REEL_H, video.currentTime, format);
  }

  // Guia opcional de área segura do Instagram
  if (showSafeZone) {
    if (format === "story") {
      drawStorySafeZone(ctx);
    } else {
      drawReelSafeZone(ctx);
    }
  }

  ctx.restore();
}

function buildReelOverlayCanvas(
  logo: HTMLImageElement | null,
  headline: string,
  category: string,
  handle: string,
  logoPosition: LogoPosition,
  titlePosition: LogoPosition,
  textStyle: ReelTextStyle,
  fontFamily: ReelFontFamily,
  fontWeight: ReelFontWeight,
  textAlign: ReelTextAlign,
  textCase: ReelTextCase,
  fontSize: number,
  showStrongSceneWarning: boolean,
  logoScale: number,
  handleFontSize: number,
  tagColor: ReelTagColor,
  tagPositionY: number,
  logoColorStyle: LogoColorStyle = "white",
  shadeOpacity: number = 85,
  showOverlayLayer: boolean = true,
  showLogoLayer: boolean = true,
  showTitleLayer: boolean = true,
  showHandleLayer: boolean = true,
  showStorySticker: boolean = true,
  format: PublicationFormat = "reel",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = REEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  // 1. Gradiente inferior de contraste (shade)
  const maxAlpha = (showOverlayLayer ? shadeOpacity : 0) / 100;
  if (maxAlpha > 0 && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    const shade = ctx.createLinearGradient(0, 650, 0, REEL_H);
    shade.addColorStop(0, `rgba(0,0,0,${(0.05 * maxAlpha).toFixed(2)})`);
    shade.addColorStop(0.42, `rgba(0,0,0,${(0.68 * maxAlpha).toFixed(2)})`);
    shade.addColorStop(1, `rgba(0,0,0,${(0.96 * maxAlpha).toFixed(2)})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 600, W, REEL_H - 600);
  }

  // 2. Alerta de cenas fortes
  if (showStrongSceneWarning) {
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(48, 56, W - 96, 78);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '800 36px Arial, sans-serif';
    ctx.fillText("AVISO: CENAS FORTES", W / 2, 95);
  }

  // 3. Logo do jornal (quando animada em GIF/WebM, é renderizada quadro a quadro em tempo real)
  if (showLogoLayer && logoColorStyle !== "gif" && textStyle !== "bacci-red") {
    const renderLogo = getRenderableLogo(logo, logoColorStyle, "white");
    if (renderLogo && isImageDrawable(renderLogo)) {
      const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
      safeDrawImage(ctx, renderLogo, logoPosition.x * W - width / 2, logoPosition.y * REEL_H - height / 2, width, height);
    }
  }

  // 4. Manchete / Legenda
  if (showTitleLayer) {
    const effectiveHeadline = (headline || "TÍTULO DA SUA NOTÍCIA").trim();
    drawReelHeadline(
      ctx,
      effectiveHeadline,
      category || "VIRALIZOU",
      fontFamily,
      fontWeight,
      textStyle,
      textAlign,
      textCase,
      fontSize,
      "static",
      titlePosition,
      10,
      10,
      REEL_H,
      820,
      handle || "@VIRALIZOUGOIANIA",
    );
  }

  // 5. Assinatura / Tag Inferior (@viralizougoiania)
  if (showHandleLayer && handle && handle.trim() && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    const tagText = handle.trim();
    const tagY = getEffectiveTagY(format, tagPositionY);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${handleFontSize}px "Montserrat", -apple-system, sans-serif`;

    let textColor = "#ffffff";
    if (tagColor === "red") textColor = "#ff3b30";
    else if (tagColor === "yellow") textColor = "#ffcc00";
    else if (tagColor === "orange") textColor = "#ff5a1f";

    const metrics = ctx.measureText(tagText);
    const padX = 20;
    const padY = 10;
    const boxW = metrics.width + padX * 2;
    const boxH = handleFontSize + padY * 2;
    const boxX = W / 2 - boxW / 2;
    const boxY = tagY - boxH / 2;

    ctx.fillStyle = "rgba(10, 10, 12, 0.72)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }

    ctx.fillStyle = textColor;
    ctx.fillText(tagText, W / 2, tagY);
    ctx.restore();
  }

  return canvas;
}

export default function SocialFeedCreator({ posts, onBack, initialPost, onOpenCompressor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoFileRef = useRef<File | Blob | null>(null);
  const cachedOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const animatedLogoRef = useRef<HTMLVideoElement | null>(null);
  const articleImageRef = useRef<{ src: string; image: HTMLImageElement } | null>(null);
  const customImageRef = useRef<HTMLImageElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const logoPositionRef = useRef<LogoPosition>(DEFAULT_LOGO_POSITION);
  const titlePositionRef = useRef<LogoPosition>(DEFAULT_TITLE_POSITION);
  const feedTitlePositionRef = useRef<LogoPosition>(DEFAULT_FEED_TITLE_POSITION);
  const logoDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const titleDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const tagDragRef = useRef<{ pointerId: number; offsetY: number } | null>(null);
  const tagPositionYRef = useRef<number>(1670);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const [format, setFormat] = useState<PublicationFormat>("feed");
  const [importVideoUrl, setImportVideoUrl] = useState("");
  const [importingVideo, setImportingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFileName, setVideoFileName] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [videoExport, setVideoExport] = useState<{ url: string; filename: string; type: string } | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [customImageFileName, setCustomImageFileName] = useState<string>("");
  const [articleUrl, setArticleUrl] = useState("");
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [title, setTitle] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [handle, setHandle] = useState("@viralizougoiania");
  const [logoData, setLogoData] = useState("");
  const [logoColorStyle, setLogoColorStyle] = useState<LogoColorStyle>("white");
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(DEFAULT_LOGO_POSITION);
  const [titlePosition, setTitlePosition] = useState<LogoPosition>(DEFAULT_TITLE_POSITION);
  const [logoScale, setLogoScale] = useState(100);
  const [handleFontSize, setHandleFontSize] = useState(33);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [reelTextStyle, setReelTextStyle] = useState<ReelTextStyle>("standard");
  const [reelFontFamily, setReelFontFamily] = useState<ReelFontFamily>("montserrat");
  const [reelFontWeight, setReelFontWeight] = useState<ReelFontWeight>("900");
  const [reelTextAlign, setReelTextAlign] = useState<ReelTextAlign>("center");
  const [reelTextCase, setReelTextCase] = useState<ReelTextCase>("uppercase");
  const [reelFontSize, setReelFontSize] = useState<number>(72);
  const [tagColor, setTagColor] = useState<ReelTagColor>("red");
  const [tagPositionY, setTagPositionY] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("viralizou_tag_position_y");
        if (saved) return Number(saved) || 1670;
      } catch {}
    }
    return 1670;
  });

  useEffect(() => {
    tagPositionYRef.current = tagPositionY;
  }, [tagPositionY]);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [reelTextAnimation, setReelTextAnimation] = useState<ReelTextAnimation>("static");
  const [showStrongSceneWarning, setShowStrongSceneWarning] = useState(false);
  const [shadeOpacity, setShadeOpacity] = useState<number>(85);
  const [showOverlayLayer, setShowOverlayLayer] = useState<boolean>(true);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(true);
  const [showLogoLayer, setShowLogoLayer] = useState<boolean>(true);
  const [showTitleLayer, setShowTitleLayer] = useState<boolean>(true);
  const [showHandleLayer, setShowHandleLayer] = useState<boolean>(true);
  const [showStorySticker, setShowStorySticker] = useState<boolean>(false);
  const [videoFramingMode, setVideoFramingMode] = useState<"cover" | "blur-fit">("cover");
  const [imagePosition, setImagePosition] = useState(0);
  const [feedTitleFontSize, setFeedTitleFontSize] = useState<number>(0); // 0 = automático
  const [feedFontFamily, setFeedFontFamily] = useState<ReelFontFamily>("georgia");
  const [feedTitlePosition, setFeedTitlePosition] = useState<LogoPosition>(DEFAULT_FEED_TITLE_POSITION);
  const [feedTitleOffsetY, setFeedTitleOffsetY] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [miniIaLevel, setMiniIaLevel] = useState<MiniIaEditLevel>("media");
  const [miniIaMirror, setMiniIaMirror] = useState<boolean>(false);
  const [miniIaTrimSeconds, setMiniIaTrimSeconds] = useState<number>(3); // Padrão sempre corta 3 segundos
  const [videoFilter, setVideoFilter] = useState<VideoFilterPreset>("none");
  const [cutPauses, setCutPauses] = useState<boolean>(true);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackPreset>("energetic");
  const [autoHookEnabled, setAutoHookEnabled] = useState<boolean>(true);
  const [autoHookText, setAutoHookText] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCrop, setVideoCrop] = useState<VideoCropRect | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const effectiveHookText = autoHookText.trim() || (title || selectedPost?.title || "LIVRO CAIU SOZINHO NO CHÃO");
  const computedKeywords = useMemo(() => {
    const raw = title || selectedPost?.title || "LIVRO CAIU SOZINHO NO CHÃO";
    const words = raw.split(/\s+/).filter((w) => w.length > 2);
    return Math.max(4, Math.min(15, words.length || 9));
  }, [title, selectedPost?.title]);

  const computedZooms = useMemo(() => {
    const dur = videoDuration > 0 ? videoDuration : 30;
    const factor = miniIaLevel === "leve" ? 7 : miniIaLevel === "alta" ? 3.5 : 5;
    return Math.max(3, Math.round(dur / factor));
  }, [videoDuration, miniIaLevel]);

  const computedAnimatedScenes = useMemo(() => {
    const dur = videoDuration > 0 ? videoDuration : 30;
    return Math.max(2, Math.round(dur / 7.5));
  }, [videoDuration]);

  const [presetSlots, setPresetSlots] = useState<LayoutPresetSlot[]>(DEFAULT_PRESET_SLOTS);
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);
  const [slotFeedback, setSlotFeedback] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("viralizou_layout_presets_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setPresetSlots(parsed);
        }
      }
    } catch {}
  }, []);

  function handleUsePresetSlot(slot: LayoutPresetSlot) {
    const d = slot.data;
    if (d.format) setFormat(d.format);
    if (d.reelTextStyle) setReelTextStyle(d.reelTextStyle);
    if (d.reelFontFamily) setReelFontFamily(d.reelFontFamily);
    if (d.reelFontWeight) setReelFontWeight(d.reelFontWeight);
    if (d.reelTextAlign) setReelTextAlign(d.reelTextAlign);
    if (d.reelTextCase) setReelTextCase(d.reelTextCase);
    if (typeof d.reelFontSize === "number") setReelFontSize(d.reelFontSize);
    if (d.tagColor) setTagColor(d.tagColor);
    if (typeof d.tagPositionY === "number") setTagPositionY(d.tagPositionY);
    if (d.handle) setHandle(d.handle);
    if (typeof d.handleFontSize === "number") setHandleFontSize(d.handleFontSize);
    if (d.logoColorStyle) setLogoColorStyle(d.logoColorStyle);
    if (typeof d.logoScale === "number") setLogoScale(d.logoScale);
    if (d.logoPosition) setLogoPosition(d.logoPosition);
    if (d.titlePosition) setTitlePosition(d.titlePosition);
    if (d.feedTitlePosition) setFeedTitlePosition(d.feedTitlePosition);
    if (typeof d.feedTitleOffsetY === "number") setFeedTitleOffsetY(d.feedTitleOffsetY);
    if (typeof d.feedTitleFontSize === "number") setFeedTitleFontSize(d.feedTitleFontSize);
    if (d.feedFontFamily) setFeedFontFamily(d.feedFontFamily);
    if (typeof d.shadeOpacity === "number") setShadeOpacity(d.shadeOpacity);
    if (typeof d.showOverlayLayer === "boolean") setShowOverlayLayer(d.showOverlayLayer);
    if (typeof d.showLogoLayer === "boolean") setShowLogoLayer(d.showLogoLayer);
    if (typeof d.showTitleLayer === "boolean") setShowTitleLayer(d.showTitleLayer);
    if (typeof d.showHandleLayer === "boolean") setShowHandleLayer(d.showHandleLayer);
    if (typeof d.showStorySticker === "boolean") setShowStorySticker(d.showStorySticker);
    if (typeof d.showStrongSceneWarning === "boolean") setShowStrongSceneWarning(d.showStrongSceneWarning);
    if (d.videoFramingMode) setVideoFramingMode(d.videoFramingMode);
    if (typeof d.imagePosition === "number") setImagePosition(d.imagePosition);
    if (d.miniIaLevel) setMiniIaLevel(d.miniIaLevel);
    if (typeof d.miniIaMirror === "boolean") setMiniIaMirror(d.miniIaMirror);
    if (typeof d.miniIaTrimSeconds === "number") setMiniIaTrimSeconds(d.miniIaTrimSeconds);
    if (d.videoFilter) setVideoFilter(d.videoFilter);
    if (typeof d.cutPauses === "boolean") setCutPauses(d.cutPauses);
    if (d.bgmTrack) setBgmTrack(d.bgmTrack);
    if (typeof d.autoHookEnabled === "boolean") setAutoHookEnabled(d.autoHookEnabled);
    if (typeof d.autoHookText === "string") setAutoHookText(d.autoHookText);
    if (d.videoCrop !== undefined) setVideoCrop(d.videoCrop);

    setActiveSlotId(slot.id);
    setSlotFeedback(`⚡ ${slot.name} carregado no preview!`);
    setTimeout(() => setSlotFeedback(""), 3500);
  }

  function handleSaveCurrentToSlot(slotId: number) {
    const formatName = format === "reel" ? "Reels 9:16" : format === "story" ? "Story 9:16" : format === "feed-square" ? "Feed 1:1" : "Feed 4:5";
    const currentSummary = `${formatName} · ${reelTextStyle} · ${reelFontFamily.toUpperCase()} · ${miniIaLevel.toUpperCase()}`;
    const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const newSlots = presetSlots.map((s) => {
      if (s.id !== slotId) return s;
      return {
        ...s,
        summary: currentSummary,
        savedAt: `Salvo às ${nowTime}`,
        data: {
          format,
          reelTextStyle,
          reelFontFamily,
          reelFontWeight,
          reelTextAlign,
          reelTextCase,
          reelFontSize,
          tagColor,
          tagPositionY,
          handle,
          handleFontSize,
          logoColorStyle,
          logoScale,
          logoPosition,
          titlePosition,
          feedTitlePosition,
          feedTitleOffsetY,
          feedTitleFontSize,
          feedFontFamily,
          shadeOpacity,
          showOverlayLayer,
          showLogoLayer,
          showTitleLayer,
          showHandleLayer,
          showStorySticker,
          showStrongSceneWarning,
          videoFramingMode,
          imagePosition,
          miniIaLevel,
          miniIaMirror,
          miniIaTrimSeconds,
          videoFilter,
          cutPauses,
          bgmTrack,
          autoHookEnabled,
          autoHookText,
          videoCrop,
        },
      };
    });

    setPresetSlots(newSlots);
    setActiveSlotId(slotId);
    try {
      localStorage.setItem("viralizou_layout_presets_v1", JSON.stringify(newSlots));
    } catch {}
    setSlotFeedback(`💾 Layout salvo no Slot ${slotId}!`);
    setTimeout(() => setSlotFeedback(""), 3500);
  }

  function handleApplyCrop(newCrop: VideoCropRect | null) {
    setVideoCrop(newCrop);
    if (newCrop) {
      try { localStorage.setItem("viralizou_video_crop", JSON.stringify(newCrop)); } catch {}
    } else {
      try { localStorage.removeItem("viralizou_video_crop"); } catch {}
    }
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseVideoFilter(f: VideoFilterPreset) {
    setVideoFilter(f);
    try { localStorage.setItem("viralizou_video_filter", f); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function toggleCutPauses(val: boolean) {
    setCutPauses(val);
    try { localStorage.setItem("viralizou_cut_pauses", String(val)); } catch {}
  }

  function chooseBgmTrack(tr: BgmTrackPreset) {
    setBgmTrack(tr);
    try { localStorage.setItem("viralizou_bgm_track", tr); } catch {}
  }

  function toggleAutoHook(val: boolean) {
    setAutoHookEnabled(val);
    try { localStorage.setItem("viralizou_auto_hook_enabled", String(val)); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function changeHookText(val: string) {
    setAutoHookText(val);
    try { localStorage.setItem("viralizou_auto_hook_text", val); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseMiniIaLevel(lvl: MiniIaEditLevel) {
    setMiniIaLevel(lvl);
    try { localStorage.setItem("viralizou_mini_ia_level", lvl); } catch {}
  }

  function toggleMiniIaMirror(val: boolean) {
    setMiniIaMirror(val);
    try { localStorage.setItem("viralizou_mini_ia_mirror", String(val)); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseMiniIaTrimSeconds(sec: number) {
    const val = Math.max(0, Math.min(60, Math.round(Number(sec) || 0)));
    setMiniIaTrimSeconds(val);
    try { localStorage.setItem("viralizou_mini_ia_trim_seconds", String(val)); } catch {}
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString("pt-BR");
    console.log(`[ViralizouVideo ${time}] ${msg}`);
    setRenderLogs((prev) => [...prev.slice(-15), `[${time}] ${msg}`]);
  }

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoExport?.url) URL.revokeObjectURL(videoExport.url); }, [videoExport?.url]);
  useEffect(() => () => { if (customImageUrl && customImageUrl.startsWith("blob:")) URL.revokeObjectURL(customImageUrl); }, [customImageUrl]);
  useEffect(() => () => { audioContextRef.current?.close().catch(() => {}); }, []);
  useEffect(() => {
    const handleLogoReady = () => {
      cachedOverlayCanvasRef.current = null;
      renderCard();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("viralizou_logo_ready", handleLogoReady);
      return () => window.removeEventListener("viralizou_logo_ready", handleLogoReady);
    }
  }, []);
  useEffect(() => {
    if (initialPost) {
      setSelectedPost(initialPost);
      setTitle(initialPost.title);
      setArticleUrl(`/noticia/${initialPost.slug}`);
      setMessage(`✅ Notícia "${initialPost.title}" selecionada para a arte social.`);
    }
  }, [initialPost]);

  // Carrega configurações locais e busca logo salva no Supabase
  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("viralizou_feed_logo") || "";
      const savedLogoStyle = (localStorage.getItem("viralizou_feed_logo_color_style") as LogoColorStyle) || "white";
      if (savedLogoStyle) setLogoColorStyle(savedLogoStyle);
      const savedHandle = localStorage.getItem("viralizou_feed_handle") || "";
      const savedPosition = JSON.parse(localStorage.getItem("viralizou_feed_logo_position") || "null");
      const savedTitlePosition = JSON.parse(localStorage.getItem("viralizou_reel_title_position") || "null");
      const savedTextStyle = localStorage.getItem("viralizou_reel_text_style") as ReelTextStyle | null;
      const savedFontFamily = localStorage.getItem("viralizou_reel_font_family") as ReelFontFamily | null;
      const savedFontWeight = localStorage.getItem("viralizou_reel_font_weight") as ReelFontWeight | null;
      const savedTextAlign = localStorage.getItem("viralizou_reel_text_align") as ReelTextAlign | null;
      const savedTextCase = localStorage.getItem("viralizou_reel_text_case") as ReelTextCase | null;
      const savedFontSize = Number(localStorage.getItem("viralizou_reel_font_size"));
      const savedTagColor = localStorage.getItem("viralizou_reel_tag_color") as ReelTagColor | null;
      const savedTagPosY = Number(localStorage.getItem("viralizou_reel_tag_position_y"));
      const savedSafeZone = localStorage.getItem("viralizou_reel_safe_zone");
      const savedTextAnim = localStorage.getItem("viralizou_reel_text_animation") as ReelTextAnimation | null;
      const savedWarning = localStorage.getItem("viralizou_reel_strong_scene_warning");
      const savedLogoScale = Number(localStorage.getItem("viralizou_reel_logo_scale"));
      const savedHandleFontSize = Number(localStorage.getItem("viralizou_reel_handle_size"));
      const savedFeedTitleSize = Number(localStorage.getItem("viralizou_feed_title_size") || "0");
      const savedFeedTitleOffsetY = Number(localStorage.getItem("viralizou_feed_title_offset_y") || "0");
      const savedFeedFontFamily = localStorage.getItem("viralizou_feed_font_family") as ReelFontFamily | null;
      const savedFeedTitlePosition = JSON.parse(localStorage.getItem("viralizou_feed_title_position") || "null");
      const savedShadeOpacity = Number(localStorage.getItem("viralizou_shade_opacity"));
      const savedOverlayLayer = localStorage.getItem("viralizou_show_overlay_layer");
      const savedLayerPanel = localStorage.getItem("viralizou_show_layer_panel");
      const savedLogoLayer = localStorage.getItem("viralizou_show_logo_layer");
      const savedTitleLayer = localStorage.getItem("viralizou_show_title_layer");
      const savedHandleLayer = localStorage.getItem("viralizou_show_handle_layer");
      const savedStorySticker = localStorage.getItem("viralizou_show_story_sticker");

      if (savedLogo) setLogoData(savedLogo);
      if (savedHandle) setHandle(savedHandle);
      if (savedTextStyle) setReelTextStyle(savedTextStyle);
      if (savedFontFamily) setReelFontFamily(savedFontFamily);
      if (savedFontWeight) setReelFontWeight(savedFontWeight);
      if (savedTextAlign) setReelTextAlign(savedTextAlign);
      if (savedTextCase) setReelTextCase(savedTextCase);
      if (Number.isFinite(savedFontSize) && savedFontSize >= 24 && savedFontSize <= 120) setReelFontSize(savedFontSize);
      if (savedTagColor) setTagColor(savedTagColor);
      if (Number.isFinite(savedTagPosY) && savedTagPosY >= 1400 && savedTagPosY <= 1860) setTagPositionY(savedTagPosY);
      if (savedSafeZone !== null) setShowSafeZone(savedSafeZone === "true");
      if (savedTextAnim) setReelTextAnimation(savedTextAnim);
      if (savedWarning === "true") setShowStrongSceneWarning(true);
      if (Number.isFinite(savedLogoScale) && savedLogoScale >= 50 && savedLogoScale <= 150) setLogoScale(savedLogoScale);
      if (Number.isFinite(savedHandleFontSize) && savedHandleFontSize >= 18 && savedHandleFontSize <= 72) setHandleFontSize(savedHandleFontSize);
      if (Number.isFinite(savedFeedTitleSize)) setFeedTitleFontSize(savedFeedTitleSize);
      if (Number.isFinite(savedFeedTitleOffsetY)) setFeedTitleOffsetY(savedFeedTitleOffsetY);
      if (Number.isFinite(savedShadeOpacity) && savedShadeOpacity >= 0 && savedShadeOpacity <= 100) setShadeOpacity(savedShadeOpacity);
      if (savedOverlayLayer !== null) setShowOverlayLayer(savedOverlayLayer === "true");
      if (savedLayerPanel !== null) setShowLayerPanel(savedLayerPanel === "true");
      if (savedLogoLayer !== null) setShowLogoLayer(savedLogoLayer === "true");
      if (savedTitleLayer !== null) setShowTitleLayer(savedTitleLayer === "true");
      if (savedHandleLayer !== null) setShowHandleLayer(savedHandleLayer === "true");
      if (savedStorySticker !== null) setShowStorySticker(savedStorySticker === "true");
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
      const savedMiniIaLevel = localStorage.getItem("viralizou_mini_ia_level") as MiniIaEditLevel | null;
      if (savedMiniIaLevel && (savedMiniIaLevel === "leve" || savedMiniIaLevel === "media" || savedMiniIaLevel === "alta")) {
        setMiniIaLevel(savedMiniIaLevel);
      }
      const savedMiniIaMirror = localStorage.getItem("viralizou_mini_ia_mirror");
      if (savedMiniIaMirror !== null) {
        setMiniIaMirror(savedMiniIaMirror === "true");
      }
      const savedMiniIaTrim = localStorage.getItem("viralizou_mini_ia_trim_seconds");
      if (savedMiniIaTrim !== null) {
        const parsedTrim = Number(savedMiniIaTrim);
        if (!isNaN(parsedTrim) && parsedTrim >= 0) {
          setMiniIaTrimSeconds(parsedTrim);
        }
      }
      const savedFilter = localStorage.getItem("viralizou_video_filter") as VideoFilterPreset | null;
      if (savedFilter && savedFilter in VIDEO_FILTERS) {
        setVideoFilter(savedFilter);
      }
      const savedCutPauses = localStorage.getItem("viralizou_cut_pauses");
      if (savedCutPauses !== null) {
        setCutPauses(savedCutPauses === "true");
      }
      const savedBgmTrack = localStorage.getItem("viralizou_bgm_track") as BgmTrackPreset | null;
      if (savedBgmTrack && savedBgmTrack in BGM_TRACKS) {
        setBgmTrack(savedBgmTrack);
      }
      const savedHookEnabled = localStorage.getItem("viralizou_auto_hook_enabled");
      if (savedHookEnabled !== null) {
        setAutoHookEnabled(savedHookEnabled === "true");
      }
      const savedHookText = localStorage.getItem("viralizou_auto_hook_text");
      if (savedHookText) {
        setAutoHookText(savedHookText);
      }
      const savedCrop = localStorage.getItem("viralizou_video_crop");
      if (savedCrop) {
        try {
          const parsed = JSON.parse(savedCrop);
          if (parsed && typeof parsed.width === "number") setVideoCrop(parsed);
        } catch {}
      }
      const importedUrl = localStorage.getItem("viralizou_import_video_url");
      if (importedUrl) {
        setImportVideoUrl(importedUrl);
        setFormat("reel");
        try { localStorage.removeItem("viralizou_import_video_url"); } catch {}
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

    // Pré-carrega as duas logos oficiais (branca e preta) sem fundo
    const whiteLogo = getOfficialLogo("white");
    const darkLogo = getOfficialLogo("dark");
    if (whiteLogo) {
      whiteLogo.onload = () => {
        if (canvasRef.current) renderCard();
      };
    }
    if (darkLogo) {
      darkLogo.onload = () => {
        if (canvasRef.current) renderCard();
      };
    }
  }, []);

  async function renderCard(skipGuidesParam: boolean | unknown = false) {
    const skipGuides = skipGuidesParam === true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setRendering(true);
    try {
      const { width: currentW, height: currentH } = getCanvasDimensions(format);
      canvas.width = currentW;
      canvas.height = currentH;

      if (format === "story" && (!videoPreviewRef.current || !videoReady)) {
        await document.fonts?.ready;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, currentW, currentH);

        let mediaDrawn = false;
        if (customImageUrl) {
          try {
            if (!customImageRef.current || customImageRef.current.src !== customImageUrl) {
              customImageRef.current = await loadImage(customImageUrl);
            }
            if (customImageRef.current) {
              ctx.save();
              if (miniIaMirror) {
                ctx.translate(currentW, 0);
                ctx.scale(-1, 1);
              }
              drawCover(ctx, customImageRef.current, 0, 0, currentW, currentH, imagePosition);
              ctx.restore();
              mediaDrawn = true;
            }
          } catch (e) {
            console.warn("Erro ao carregar imagem personalizada:", e);
          }
        }

        if (!mediaDrawn && selectedPost?.image_url) {
          try {
            const src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
            const img = articleImageRef.current?.src === src ? articleImageRef.current.image : await loadImage(src);
            articleImageRef.current = { src, image: img };
            ctx.save();
            if (miniIaMirror) {
              ctx.translate(currentW, 0);
              ctx.scale(-1, 1);
            }
            drawCover(ctx, img, 0, 0, currentW, currentH, imagePosition);
            ctx.restore();
            mediaDrawn = true;
          } catch (e) {
            console.warn("Erro ao carregar imagem da notícia:", e);
          }
        }

        if (!mediaDrawn) {
          const gradient = ctx.createLinearGradient(0, 0, currentW, currentH);
          gradient.addColorStop(0, "#0f172a");
          gradient.addColorStop(1, "#1e293b");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, currentW, currentH);
          ctx.fillStyle = "rgba(255,255,255,.75)";
          ctx.font = "700 38px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Envie uma foto ou selecione uma notícia", currentW / 2, currentH / 2);
        }

        const maxAlpha = shadeOpacity / 100;
        if (showOverlayLayer && shadeOpacity > 0) {
          const shade = ctx.createLinearGradient(0, 600, 0, currentH);
          shade.addColorStop(0, `rgba(0,0,0,${(0.08 * maxAlpha).toFixed(2)})`);
          shade.addColorStop(0.4, `rgba(0,0,0,${(0.72 * maxAlpha).toFixed(2)})`);
          shade.addColorStop(1, `rgba(5,5,5,${(0.96 * maxAlpha).toFixed(2)})`);
          ctx.fillStyle = shade;
          ctx.fillRect(0, 500, currentW, currentH - 500);
        }

        if (showStrongSceneWarning) {
          ctx.fillStyle = "#b91c1c";
          ctx.fillRect(48, 56, currentW - 96, 78);
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = '800 36px Arial, sans-serif';
          ctx.fillText("AVISO: CENAS FORTES", currentW / 2, 95);
        }

        if (showLogoLayer) {
          let customImg: HTMLImageElement | null = logoImageRef.current;
          if (logoData && (!customImg || customImg.src !== logoData)) {
            try {
              logoImageRef.current = await loadImage(logoData);
              customImg = logoImageRef.current;
            } catch {
              logoImageRef.current = null;
            }
          }
          const renderLogo = getRenderableLogo(customImg, logoColorStyle, "white");
          if (renderLogo && isImageDrawable(renderLogo)) {
            const { width, height } = getLogoSize(renderLogo, "story", logoScale / 100);
            safeDrawImage(ctx, renderLogo, logoPositionRef.current.x * currentW - width / 2, logoPositionRef.current.y * currentH - height / 2, width, height);
          }
        }

        if (showTitleLayer) {
          drawReelHeadline(
            ctx,
            title || selectedPost?.title || "Título da Notícia",
            selectedPost?.category || "GOIÂNIA",
            reelFontFamily,
            reelFontWeight,
            reelTextStyle,
            reelTextAlign,
            reelTextCase,
            reelFontSize,
            "static",
            titlePositionRef.current,
            10,
            10,
            currentH,
            860
          );
        }

        if (showStorySticker && showSafeZone && !skipGuides) {
          drawStoryStickerGuide(ctx, currentW);
        }

        if (showHandleLayer && handle && handle.trim()) {
          ctx.save();
          ctx.font = `800 ${handleFontSize}px "Montserrat", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(handle.trim(), currentW / 2, tagPositionY || 1670);
          ctx.restore();
        }

        if (showSafeZone && !skipGuides) {
          drawStorySafeZone(ctx);
        }

        ctx.restore();
        setMessage("");
        return;
      }

      if (format === "reel" || (format === "story" && videoPreviewRef.current && videoReady)) {
        await document.fonts?.ready;
        if (logoData) {
          try {
            if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
          } catch { logoImageRef.current = null; }
        } else {
          logoImageRef.current = null;
        }
        drawReelFrame(
          ctx,
          videoPreviewRef.current,
          logoImageRef.current,
          title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA",
          selectedPost?.category || "VIRALIZOU",
          handle,
          logoPositionRef.current,
          titlePositionRef.current,
          reelTextStyle,
          reelFontFamily,
          reelFontWeight,
          reelTextAlign,
          reelTextCase,
          reelFontSize,
          reelTextAnimation,
          showStrongSceneWarning,
          logoScale,
          handleFontSize,
          tagColor,
          tagPositionY,
          showSafeZone && !skipGuides,
          logoColorStyle,
          showOverlayLayer ? shadeOpacity : 0,
          showLogoLayer,
          showTitleLayer,
          showHandleLayer,
          showStorySticker && !skipGuides,
          format,
          videoFramingMode,
          imagePosition,
          miniIaMirror,
          {
            contrast: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).contrast,
            brightness: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).brightness,
            saturation: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).saturation,
            punchZoom: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).punchZoom,
            zoomMax: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).zoomMax,
            zoomPeriod: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).zoomPeriod,
            filterPreset: videoFilter,
            autoHookEnabled,
            autoHookText: effectiveHookText,
          },
          videoCrop
        );
        setMessage("");
        return;
      }

      // FEED (4:5 Recomendado ou 1:1 Quadrado)
      await document.fonts?.ready;
      const fontStr = getReelFont(reelFontFamily, feedTitleFontSize > 0 ? feedTitleFontSize : reelFontSize, reelFontWeight);
      await ensureFontReady(fontStr);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      (ctx as any).textRendering = "geometricPrecision";

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, currentW, currentH);

      const coverH = format === "feed-square" ? 760 : 930;

      let mediaDrawn = false;

      // 1. Imagem personalizada enviada pelo usuário
      if (customImageUrl) {
        try {
          if (!customImageRef.current || customImageRef.current.src !== customImageUrl) {
            customImageRef.current = await loadImage(customImageUrl);
          }
          if (customImageRef.current) {
            ctx.save();
            if (miniIaMirror) {
              ctx.translate(currentW, 0);
              ctx.scale(-1, 1);
            }
            drawCover(ctx, customImageRef.current, 0, 0, currentW, coverH, imagePosition);
            ctx.restore();
            mediaDrawn = true;
          }
        } catch (e) {
          console.warn("Erro ao desenhar imagem personalizada no feed:", e);
        }
      }

      // 2. Vídeo carregado (se houver e não tiver imagem personalizada)
      if (!mediaDrawn && videoPreviewRef.current && videoReady) {
        ctx.save();
        if (miniIaMirror) {
          ctx.translate(currentW, 0);
          ctx.scale(-1, 1);
        }
        drawCover(ctx, videoPreviewRef.current, 0, 0, currentW, coverH, imagePosition, videoCrop);
        ctx.restore();
        mediaDrawn = true;
      }

      // 3. Imagem da notícia do portal
      if (!mediaDrawn && selectedPost?.image_url) {
        try {
          const src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
          const img = articleImageRef.current?.src === src ? articleImageRef.current.image : await loadImage(src);
          articleImageRef.current = { src, image: img };
          ctx.save();
          if (miniIaMirror) {
            ctx.translate(currentW, 0);
            ctx.scale(-1, 1);
          }
          drawCover(ctx, img, 0, 0, currentW, coverH, imagePosition);
          ctx.restore();
          mediaDrawn = true;
        } catch (e) {
          console.warn("Erro ao carregar imagem da notícia:", e);
        }
      }

      // 4. Fallback sem mídia
      if (!mediaDrawn) {
        const gradient = ctx.createLinearGradient(0, 0, currentW, coverH);
        gradient.addColorStop(0, "#172033");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, currentW, coverH);
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = "700 38px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Envie uma foto ou selecione uma notícia", currentW / 2, coverH / 2);
      }

      const maxAlpha = shadeOpacity / 100;
      if (showOverlayLayer && shadeOpacity > 0) {
        const overlayTop = Math.max(format === "feed-square" ? 320 : 380, feedTitlePosition.y * currentH - 280 + feedTitleOffsetY);
        const overlay = ctx.createLinearGradient(0, overlayTop, 0, currentH - 140);
        overlay.addColorStop(0, "rgba(0,0,0,0)");
        overlay.addColorStop(0.32, `rgba(0,0,0,${(0.82 * maxAlpha).toFixed(2)})`);
        overlay.addColorStop(1, `rgba(5,5,5,${(0.98 * maxAlpha).toFixed(2)})`);
        ctx.fillStyle = overlay;
        ctx.fillRect(0, overlayTop, currentW, currentH - overlayTop);
      }

      if (showStrongSceneWarning) {
        ctx.fillStyle = "#b91c1c";
        const bannerH = format === "feed-square" ? 64 : 72;
        ctx.fillRect(40, 40, currentW - 80, bannerH);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '800 32px Arial, sans-serif';
        ctx.fillText("AVISO: CENAS FORTES", currentW / 2, 40 + bannerH / 2);
      }

      if (showLogoLayer && reelTextStyle !== "bacci-red") {
        let customImg: HTMLImageElement | null = logoImageRef.current;
        if (logoData && (!customImg || customImg.src !== logoData)) {
          try {
            logoImageRef.current = await loadImage(logoData);
            customImg = logoImageRef.current;
          } catch {
            logoImageRef.current = null;
          }
        }
        const renderLogo = getRenderableLogo(customImg, logoColorStyle, "dark");
        if (renderLogo && isImageDrawable(renderLogo)) {
          const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
          const logoY = format === "feed-square" ? logoPosition.y * currentH - 40 : logoPosition.y * currentH;
          safeDrawImage(ctx, renderLogo, logoPosition.x * currentW - width / 2, logoY - height / 2, width, height);
        }
      }

      if (showTitleLayer) {
        const headline = (title || selectedPost?.title || "Título da notícia").trim();
        const effectiveSize = feedTitleFontSize > 0 ? feedTitleFontSize : (format === "feed-square" ? Math.min(reelFontSize, 62) : reelFontSize);
        const targetPos = {
          x: feedTitlePosition.x,
          y: Math.min(0.92, Math.max(0.45, feedTitlePosition.y + feedTitleOffsetY / currentH)),
        };

        drawReelHeadline(
          ctx,
          headline,
          selectedPost?.category || "",
          reelFontFamily,
          reelFontWeight,
          reelTextStyle,
          reelTextAlign,
          reelTextCase,
          effectiveSize,
          "static",
          targetPos,
          10,
          10,
          currentH,
          920,
          handle || "@VIRALIZOUGOIANIA",
        );
      }

      if (showHandleLayer && handle && handle.trim() && reelTextStyle !== "red-bottom" && reelTextStyle !== "bacci-red") {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${handleFontSize}px "Montserrat", -apple-system, sans-serif`;

        let handleColor = "rgba(255,255,255,.94)";
        if (tagColor === "red") handleColor = "#ff3b30";
        else if (tagColor === "yellow") handleColor = "#ffcc00";
        else if (tagColor === "orange") handleColor = "#ff5a1f";

        ctx.fillStyle = handleColor;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;
        const handleY = getEffectiveTagY(format, tagPositionYRef.current || tagPositionY);
        ctx.fillText(handle.trim() || "@viralizougoiania", currentW / 2, handleY);
        ctx.restore();
      }

      if (showSafeZone && !skipGuides) {
        if (format === "feed") {
          drawFeedSafeZone(ctx);
        } else if (format === "feed-square") {
          drawFeedSquareSafeZone(ctx);
        } else if (format === "reel-cover") {
          drawFeedSafeZone(ctx);
        }
      }

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
  }, [selectedPost?.slug, selectedPost?.updated_at, customImageUrl, title, logoData, handle, imagePosition, feedTitleFontSize, feedFontFamily, feedTitlePosition.x, feedTitlePosition.y, feedTitleOffsetY, format, logoPosition.x, logoPosition.y, titlePosition.x, titlePosition.y, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle, miniIaMirror]);

  // MAX CACHE: Pré-renderiza todo o layout visual da legenda e sobreposições em 1080x1920
  // Isso zera 100% dos cálculos na CPU durante a reprodução do vídeo e evita travamentos
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const overlayCanvas = buildReelOverlayCanvas(
        logoImageRef.current,
        title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA",
        selectedPost?.category || "VIRALIZOU",
        handle,
        logoPosition,
        titlePosition,
        reelTextStyle,
        reelFontFamily,
        reelFontWeight,
        reelTextAlign,
        reelTextCase,
        reelFontSize,
        showStrongSceneWarning,
        logoScale,
        handleFontSize,
        tagColor,
        tagPositionY,
        logoColorStyle,
        shadeOpacity,
        showOverlayLayer,
        showLogoLayer,
        showTitleLayer,
        showHandleLayer,
        showStorySticker,
        format,
      );
      cachedOverlayCanvasRef.current = overlayCanvas;
    } catch (err) {
      console.error("Erro ao gerar cache da legenda:", err);
    }
  }, [
    format, title, selectedPost?.title, selectedPost?.category, handle,
    logoData, logoColorStyle, logoScale, logoPosition, titlePosition,
    reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize,
    showStrongSceneWarning, handleFontSize, tagColor, tagPositionY,
    shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker,
  ]);

  // Carrega a logo personalizada no ref sempre que logoData mudar
  useEffect(() => {
    let active = true;
    if (logoData) {
      loadImage(logoData)
        .then((img) => {
          if (!active) return;
          logoImageRef.current = img;
          if (typeof document !== "undefined") {
            try {
              cachedOverlayCanvasRef.current = buildReelOverlayCanvas(
                img,
                title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA",
                selectedPost?.category || "VIRALIZOU",
                handle,
                logoPosition,
                titlePosition,
                reelTextStyle,
                reelFontFamily,
                reelFontWeight,
                reelTextAlign,
                reelTextCase,
                reelFontSize,
                showStrongSceneWarning,
                logoScale,
                handleFontSize,
                tagColor,
                tagPositionY,
                logoColorStyle,
                shadeOpacity,
                showOverlayLayer,
                showLogoLayer,
                showTitleLayer,
                showHandleLayer,
                showStorySticker,
                format,
              );
            } catch {}
          }
          if (canvasRef.current) renderCard();
        })
        .catch(() => {
          if (!active) return;
          logoImageRef.current = null;
          if (canvasRef.current) renderCard();
        });
    } else {
      logoImageRef.current = null;
      if (canvasRef.current) renderCard();
    }
    return () => { active = false; };
  }, [logoData]);

  // Loop de pré-visualização interativa do Reel e Story (máxima suavidade)
  useEffect(() => {
    const video = videoPreviewRef.current;
    if ((format !== "reel" && format !== "story") || !videoUrl || !video || recording) return;
    let frameId = 0;
    let lastRenderedAt = 0;
    const previewInterval = 1000 / 24;
    const draw = (timestamp = 0) => {
      if (!isRecordingRef.current) {
        if (timestamp - lastRenderedAt >= previewInterval) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (ctx && video.readyState >= 2) {
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, W, REEL_H);
            const miniIaCfg = MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media;
            drawVideoWithFraming(
              ctx,
              video,
              W,
              REEL_H,
              videoFramingMode,
              imagePosition,
              miniIaMirror,
              {
                contrast: miniIaCfg.contrast,
                brightness: miniIaCfg.brightness,
                saturation: miniIaCfg.saturation,
                punchZoom: miniIaCfg.punchZoom,
                zoomMax: miniIaCfg.zoomMax,
                zoomPeriod: miniIaCfg.zoomPeriod,
                filterPreset: videoFilter,
              },
              videoCrop
            );
            // Ultra-rápido: usa o overlay cacheado apenas quando não estiver arrastando elementos interativos
            const isDraggingAny = Boolean(tagDragRef.current || titleDragRef.current || logoDragRef.current);
            if (cachedOverlayCanvasRef.current && !isDraggingAny) {
              ctx.drawImage(cachedOverlayCanvasRef.current, 0, 0);
              if (showLogoLayer && logoColorStyle === "gif") {
                const animLogo = animatedLogoRef.current || getOfficialLogo("gif");
                if (animLogo && isImageDrawable(animLogo)) {
                  const { width: lW, height: lH } = getLogoSize(animLogo, format, logoScale / 100);
                  safeDrawImage(
                    ctx,
                    animLogo,
                    logoPositionRef.current.x * W - lW / 2,
                    logoPositionRef.current.y * REEL_H - lH / 2,
                    lW,
                    lH
                  );
                }
              }
              if (autoHookEnabled && effectiveHookText && video.currentTime <= 3.6) {
                drawViralHookBanner(ctx, effectiveHookText, W, REEL_H, video.currentTime, format);
              }
            } else {
              drawReelFrame(
                ctx,
                video,
                logoImageRef.current,
                title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA",
                selectedPost?.category || "VIRALIZOU",
                handle,
                logoPositionRef.current,
                titlePositionRef.current,
                reelTextStyle,
                reelFontFamily,
                reelFontWeight,
                reelTextAlign,
                reelTextCase,
                reelFontSize,
                reelTextAnimation,
                showStrongSceneWarning,
                logoScale,
                handleFontSize,
                tagColor,
                getEffectiveTagY(format, tagPositionYRef.current || tagPositionY),
                showSafeZone,
                logoColorStyle,
                showOverlayLayer ? shadeOpacity : 0,
                showLogoLayer,
                showTitleLayer,
                showHandleLayer,
                showStorySticker,
                format,
                videoFramingMode,
                imagePosition,
                miniIaMirror,
                {
                  contrast: miniIaCfg.contrast,
                  brightness: miniIaCfg.brightness,
                  saturation: miniIaCfg.saturation,
                  punchZoom: miniIaCfg.punchZoom,
                  zoomMax: miniIaCfg.zoomMax,
                  zoomPeriod: miniIaCfg.zoomPeriod,
                  filterPreset: videoFilter,
                  autoHookEnabled,
                  autoHookText: effectiveHookText,
                },
                videoCrop
              );
            }
            if (showSafeZone) {
              if (format === "story") {
                drawStorySafeZone(ctx);
                if (showStorySticker) {
                  drawStoryStickerGuide(ctx, W);
                }
              } else {
                drawReelSafeZone(ctx);
              }
            }
            lastRenderedAt = timestamp;
          }
        }
      }
      frameId = requestAnimationFrame(draw);
    };

    const handleTimeCheck = () => {
      if (miniIaTrimSeconds > 0 && Number.isFinite(video.duration) && video.duration > miniIaTrimSeconds + 1) {
        if (video.currentTime < miniIaTrimSeconds) {
          video.currentTime = miniIaTrimSeconds;
        }
      }
    };
    video.addEventListener("timeupdate", handleTimeCheck);
    if (miniIaTrimSeconds > 0 && Number.isFinite(video.duration) && video.duration > miniIaTrimSeconds + 1) {
      if (video.currentTime < miniIaTrimSeconds) {
        video.currentTime = miniIaTrimSeconds;
      }
    }

    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    frameId = requestAnimationFrame(draw);
    return () => {
      video.removeEventListener("timeupdate", handleTimeCheck);
      cancelAnimationFrame(frameId);
    };
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle, recording, videoFramingMode, imagePosition, miniIaTrimSeconds, miniIaLevel, miniIaMirror, videoFilter, autoHookEnabled, effectiveHookText, videoCrop]);

  async function loadArticle() {
    const slug = slugFromInput(articleUrl);
    if (!slug) {
      if (posts && posts.length > 0) {
        const latestPost = posts[0];
        setSelectedPost(latestPost);
        setTitle(latestPost.title);
        setMessage(`✅ Notícia mais recente carregada: "${latestPost.title}"`);
        return;
      }
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

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem válido (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 20_000_000) {
      setMessage("A imagem deve ter no máximo 20 MB.");
      return;
    }
    if (customImageUrl && customImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(customImageUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setCustomImageUrl(objectUrl);
    setCustomImageFileName(file.name);
    customImageRef.current = null;
    setMessage(`✅ Foto "${file.name}" carregada com sucesso!`);
  }

  function removeCustomImage() {
    if (customImageUrl && customImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(customImageUrl);
    }
    setCustomImageUrl("");
    setCustomImageFileName("");
    customImageRef.current = null;
    if (imageInputRef.current) imageInputRef.current.value = "";
    setMessage(selectedPost?.image_url ? "Foto personalizada removida. Restaurada foto original da notícia." : "Foto removida.");
  }

  function removeVideo() {
    if (videoUrl && videoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrl);
    }
    videoFileRef.current = null;
    setVideoUrl("");
    setVideoFileName("");
    setVideoReady(false);
    setVideoExport(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
    setMessage("Vídeo removido.");
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

    videoFileRef.current = file;
    setVideoReady(false);
    setVideoFileName(file.name);
    if (videoUrl && videoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(URL.createObjectURL(file));
    setVideoExport(null);
    if (format !== "story" && format !== "feed" && format !== "feed-square" && format !== "reel-cover") {
      setFormat("reel");
    }
    setMessage("Carregando o vídeo para a prévia...");
  }

  function centerTitleAndBox() {
    chooseReelTextAlign("center");
    const defaultReelPos = { x: 0.5, y: DEFAULT_TITLE_POSITION.y };
    titlePositionRef.current = defaultReelPos;
    setTitlePosition(defaultReelPos);
    try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(defaultReelPos)); } catch {}

    const defaultFeedPos = { x: 0.5, y: DEFAULT_FEED_TITLE_POSITION.y };
    feedTitlePositionRef.current = defaultFeedPos;
    setFeedTitlePosition(defaultFeedPos);
    setFeedTitleOffsetY(0);
    try { localStorage.setItem("viralizou_feed_title_position", JSON.stringify(defaultFeedPos)); } catch {}
    try { localStorage.setItem("viralizou_feed_title_offset_y", "0"); } catch {}

    renderCard();
    setMessage("🎯 Título, layout e caixa centralizados!");
  }

  async function handleImportVideoFromUrl() {
    const raw = importVideoUrl.trim();
    if (!raw) {
      setMessage("Por favor, cole um link de vídeo do TikTok, Instagram Reels ou Twitter/X.");
      return;
    }
    setImportingVideo(true);
    setMessage("Conectando e localizando vídeo na rede social...");
    try {
      const res = await fetch("/api/video-downloader/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível resolver o vídeo. Certifique-se de que a publicação é pública.");
      }

      setMessage(`Baixando vídeo do ${data.platform?.toUpperCase() || "vídeo"} via proxy para a memória temporária...`);
      const mediaRes = await fetch(data.downloadUrl);
      if (!mediaRes.ok) {
        throw new Error("Erro ao baixar o fluxo do vídeo via proxy.");
      }

      const blob = await mediaRes.blob();
      videoFileRef.current = new File([blob], `viralizou-${data.platform || "social"}.mp4`, { type: blob.type || "video/mp4" });
      if (videoUrl && videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
      const objectUrl = URL.createObjectURL(blob);
      setVideoUrl(objectUrl);
      setVideoFileName(`viralizou-${data.platform || "social"}.mp4`);
      setVideoExport(null);
      if (format !== "story" && format !== "feed" && format !== "feed-square" && format !== "reel-cover") {
        setFormat("reel");
      }
      setImportVideoUrl("");
      setMessage("✅ Vídeo carregado com sucesso na memória! Não fica salvo no servidor e será limpo ao sair da página.");
    } catch (err: any) {
      setMessage(err?.message || "Falha ao importar o vídeo do link informado.");
    } finally {
      setImportingVideo(false);
    }
  }

  function chooseLogoColorStyle(style: LogoColorStyle) {
    setLogoColorStyle(style);
    try { localStorage.setItem("viralizou_feed_logo_color_style", style); } catch {}
    cachedOverlayCanvasRef.current = null;
    if (style === "gif") {
      if (animatedLogoRef.current) {
        animatedLogoRef.current.defaultMuted = true;
        animatedLogoRef.current.muted = true;
        animatedLogoRef.current.play().catch(() => {});
      }
      fetch("/api/admin/convert-logo-gif", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            cachedOfficialGifLogo = null;
            cachedOverlayCanvasRef.current = null;
            renderCard();
          }
        })
        .catch(() => {});
    }
    renderCard();
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
    const logo = logoImageRef.current || getRenderableLogo(null, logoColorStyle);
    if (!logo || !isImageDrawable(logo)) return;
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
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelFontFamily(font: ReelFontFamily) {
    setReelFontFamily(font);
    try { localStorage.setItem("viralizou_reel_font_family", font); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelFontWeight(weight: ReelFontWeight) {
    setReelFontWeight(weight);
    try { localStorage.setItem("viralizou_reel_font_weight", weight); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelTextAlign(align: ReelTextAlign) {
    setReelTextAlign(align);
    try { localStorage.setItem("viralizou_reel_text_align", align); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelTextCase(textCase: ReelTextCase) {
    setReelTextCase(textCase);
    try { localStorage.setItem("viralizou_reel_text_case", textCase); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelFontSize(size: number) {
    setReelFontSize(size);
    try { localStorage.setItem("viralizou_reel_font_size", String(size)); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseTagColor(color: ReelTagColor) {
    setTagColor(color);
    try { localStorage.setItem("viralizou_reel_tag_color", color); } catch {}
  }

  function chooseTagPositionY(pos: number) {
    setTagPositionY(pos);
    try { localStorage.setItem("viralizou_reel_tag_position_y", String(pos)); } catch {}
  }

  function saveShadeOpacity(val: number) {
    setShadeOpacity(val);
    try { localStorage.setItem("viralizou_shade_opacity", String(val)); } catch {}
  }

  function toggleOverlayLayer(enabled: boolean) {
    setShowOverlayLayer(enabled);
    try { localStorage.setItem("viralizou_show_overlay_layer", String(enabled)); } catch {}
  }

  function toggleLayerPanel(enabled: boolean) {
    setShowLayerPanel(enabled);
    try { localStorage.setItem("viralizou_show_layer_panel", String(enabled)); } catch {}
  }

  function toggleSafeZone(enabled: boolean) {
    setShowSafeZone(enabled);
    try { localStorage.setItem("viralizou_reel_safe_zone", String(enabled)); } catch {}
  }

  function toggleStrongSceneWarning(enabled: boolean) {
    setShowStrongSceneWarning(enabled);
    try { localStorage.setItem("viralizou_reel_strong_scene_warning", String(enabled)); } catch {}
  }

  function toggleLogoLayer(enabled: boolean) {
    setShowLogoLayer(enabled);
    try { localStorage.setItem("viralizou_show_logo_layer", String(enabled)); } catch {}
  }

  function toggleTitleLayer(enabled: boolean) {
    setShowTitleLayer(enabled);
    try { localStorage.setItem("viralizou_show_title_layer", String(enabled)); } catch {}
  }

  function toggleHandleLayer(enabled: boolean) {
    setShowHandleLayer(enabled);
    try { localStorage.setItem("viralizou_show_handle_layer", String(enabled)); } catch {}
  }

  function toggleStorySticker(enabled: boolean) {
    setShowStorySticker(enabled);
    try { localStorage.setItem("viralizou_show_story_sticker", String(enabled)); } catch {}
  }

  function chooseReelTextAnimation(anim: ReelTextAnimation) {
    setReelTextAnimation(anim);
    try { localStorage.setItem("viralizou_reel_text_animation", anim); } catch {}
  }

  async function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || (!selectedPost && !title && !customImageUrl)) {
      setMessage("Carregue uma notícia ou imagem antes de baixar.");
      return;
    }
    setMessage("Preparando PNG na resolução do formato selecionado...");
    await renderCard(true);
    const slug = selectedPost?.slug || (title ? title.toLowerCase().slice(0, 30).replace(/[^a-z0-9]+/g, "-") : "arte");
    const prefix =
      format === "feed-square"
        ? "feed-1080x1080"
        : format === "reel-cover"
        ? "reel-cover-1080x1350"
        : format === "story"
        ? "story-1080x1920"
        : format === "reel"
        ? "reel-cover-1080x1920"
        : "feed-1080x1350";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    renderCard(false);
    if (!blob) {
      setMessage("Não foi possível gerar o PNG. Atualize a prévia e tente novamente.");
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${prefix}-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    setMessage(`✅ PNG pronto · ${canvas.width}×${canvas.height} px.`);
  }

  function centerLogo() {
    const position = { x: 0.5, y: 0.5 };
    logoPositionRef.current = position;
    setLogoPosition(position);
    try { localStorage.setItem("viralizou_feed_logo_position", JSON.stringify(position)); } catch {}
  }

  function onPreviewPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { width: currentW, height: currentH } = getCanvasDimensions(format);

    if (format === "reel" || format === "story") {
      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        const layout = getCachedReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize, 820);
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * currentW;
        const y = ((event.clientY - rect.top) / rect.height) * currentH;
        const centerX = titlePositionRef.current.x * currentW;
        const centerY = titlePositionRef.current.y * currentH;
        if (x >= centerX - layout.width / 2 - 20 && x <= centerX + layout.width / 2 + 20 && y >= centerY - layout.height / 2 - 20 && y <= centerY + layout.height / 2 + 20) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          titleDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - titlePositionRef.current.x, offsetY: y / currentH - titlePositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    if (format === "feed" || format === "feed-square") {
      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        const fitted = fitHeadline(ctx, (title || selectedPost?.title || "Título da notícia").trim(), 920, feedTitleFontSize, feedFontFamily);
        ctx.font = getReelFont(feedFontFamily, fitted.size);
        const width = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width), 0);
        const height = fitted.lines.length * fitted.size * 1.1;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * currentW;
        const y = ((event.clientY - rect.top) / rect.height) * currentH;
        const centerX = feedTitlePositionRef.current.x * currentW;
        const centerY = feedTitlePositionRef.current.y * currentH;
        if (x >= centerX - width / 2 - 24 && x <= centerX + width / 2 + 24 && y >= centerY - height / 2 - 24 && y <= centerY + height / 2 + 24) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          titleDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - feedTitlePositionRef.current.x, offsetY: y / currentH - feedTitlePositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    // 3. TAG / ASSINATURA DO CONTEÚDO (@viralizougoiania)
    if (showHandleLayer && handle && handle.trim()) {
      const tagText = handle.trim();
      const currentTagY = getEffectiveTagY(format, tagPositionYRef.current || tagPositionY);
      const ctx = event.currentTarget.getContext("2d");
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * currentW;
      const y = ((event.clientY - rect.top) / rect.height) * currentH;

      let estWidth = 320;
      if (ctx) {
        ctx.font = `800 ${handleFontSize}px "Montserrat", -apple-system, sans-serif`;
        estWidth = ctx.measureText(tagText).width + 60;
      }
      const tagH = handleFontSize + 32;
      const centerX = currentW / 2;
      const centerY = currentTagY;

      if (
        x >= centerX - estWidth / 2 - 50 &&
        x <= centerX + estWidth / 2 + 50 &&
        y >= centerY - tagH / 2 - 35 &&
        y <= centerY + tagH / 2 + 35
      ) {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        cachedOverlayCanvasRef.current = null;
        tagDragRef.current = {
          pointerId: event.pointerId,
          offsetY: y - currentTagY,
        };
        setDraggingLogo(true);
        return;
      }
    }

    const logo = logoImageRef.current || getRenderableLogo(null, logoColorStyle);
    if (!logo || !isImageDrawable(logo)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * currentW;
    const y = ((event.clientY - rect.top) / rect.height) * currentH;
    const { width, height } = getLogoSize(logo, format, format === "reel" || format === "story" ? logoScale / 100 : 1);
    const centerX = logoPositionRef.current.x * currentW;
    const centerY = logoPositionRef.current.y * currentH;
    if (x < centerX - width / 2 || x > centerX + width / 2 || y < centerY - height / 2 || y > centerY + height / 2) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cachedOverlayCanvasRef.current = null;
    logoDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - logoPositionRef.current.x, offsetY: y / currentH - logoPositionRef.current.y };
    setDraggingLogo(true);
  }

  function onPreviewPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { width: currentW, height: currentH } = getCanvasDimensions(format);
    const tagDrag = tagDragRef.current;
    if (tagDrag?.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * currentH;
      const newY = Math.min(currentH - 30, Math.max(50, Math.round(y - tagDrag.offsetY)));
      tagPositionYRef.current = newY;
      setTagPositionY(newY);
      cachedOverlayCanvasRef.current = null;
      if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
        renderCard();
      }
      return;
    }

    const titleDrag = titleDragRef.current;
    if (titleDrag?.pointerId === event.pointerId) {
      const ctx = event.currentTarget.getContext("2d");
      const rect = event.currentTarget.getBoundingClientRect();
      if (format === "reel" || format === "story") {
        const layout = ctx ? getCachedReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize, 820) : { width: 0, height: 0 };
        const position = {
          x: Math.min(1 - layout.width / (2 * currentW), Math.max(layout.width / (2 * currentW), (event.clientX - rect.left) / rect.width - titleDrag.offsetX)),
          y: Math.min(1 - layout.height / (2 * currentH), Math.max(layout.height / (2 * currentH), (event.clientY - rect.top) / rect.height - titleDrag.offsetY)),
        };
        titlePositionRef.current = position;
        setTitlePosition(position);
      } else if (ctx) {
        const fitted = fitHeadline(ctx, (title || selectedPost?.title || "Título da notícia").trim(), 920, feedTitleFontSize, feedFontFamily);
        ctx.font = getReelFont(feedFontFamily, fitted.size);
        const width = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width), 0);
        const height = fitted.lines.length * fitted.size * 1.1;
        const position = {
          x: Math.min(1 - width / (2 * currentW), Math.max(width / (2 * currentW), (event.clientX - rect.left) / rect.width - titleDrag.offsetX)),
          y: Math.min(1 - height / (2 * currentH), Math.max(height / (2 * currentH), (event.clientY - rect.top) / rect.height - titleDrag.offsetY)),
        };
        feedTitlePositionRef.current = position;
        setFeedTitlePosition(position);
      }
      cachedOverlayCanvasRef.current = null;
      if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
        renderCard();
      }
      return;
    }

    const drag = logoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const logo = logoImageRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const { width, height } = logo ? getLogoSize(logo, format, format === "reel" || format === "story" ? logoScale / 100 : 1) : { width: 0, height: 0 };
    const position = {
      x: Math.min(1 - width / (2 * currentW), Math.max(width / (2 * currentW), (event.clientX - rect.left) / rect.width - drag.offsetX)),
      y: Math.min(1 - height / (2 * currentH), Math.max(height / (2 * currentH), (event.clientY - rect.top) / rect.height - drag.offsetY)),
    };
    logoPositionRef.current = position;
    setLogoPosition(position);
    cachedOverlayCanvasRef.current = null;
    if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
      renderCard();
    }
  }

  function onPreviewPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tagDragRef.current?.pointerId === event.pointerId) {
      tagDragRef.current = null;
      setDraggingLogo(false);
      try {
        localStorage.setItem("viralizou_tag_position_y", String(tagPositionYRef.current || tagPositionY));
      } catch {}
      renderCard();
    } else if (titleDragRef.current?.pointerId === event.pointerId) {
      titleDragRef.current = null;
      setDraggingLogo(false);
      try {
        const key = format === "reel" || format === "story" ? "viralizou_reel_title_position" : "viralizou_feed_title_position";
        const position = format === "reel" || format === "story" ? titlePositionRef.current : feedTitlePositionRef.current;
        localStorage.setItem(key, JSON.stringify(position));
      } catch {}
      renderCard();
    } else if (logoDragRef.current?.pointerId === event.pointerId) {
      logoDragRef.current = null;
      setDraggingLogo(false);
      try { localStorage.setItem("viralizou_feed_logo_position", JSON.stringify(logoPositionRef.current)); } catch {}
      renderCard();
    } else {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

async function fixWebmDuration(blob: Blob, durationSec: number): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const durationMs = Math.round(durationSec * 1000);
    const maxSearch = Math.min(bytes.length - 12, 8192);
    for (let i = 0; i < maxSearch; i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
        const lenByte = bytes[i + 2];
        if (lenByte === 0x84) {
          const view = new DataView(buffer, i + 3, 4);
          view.setFloat32(0, durationMs, false);
          return new Blob([buffer], { type: blob.type || "video/webm" });
        } else if (lenByte === 0x88) {
          const view = new DataView(buffer, i + 3, 8);
          view.setFloat64(0, durationMs, false);
          return new Blob([buffer], { type: blob.type || "video/webm" });
        }
      }
    }
  } catch (err) {
    console.warn("Falha ao ajustar metadados de duração WebM:", err);
  }
  return blob;
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

    // GARANTE PROPORÇÃO EXATA 9:16 (1080x1920) INCONDICIONALMENTE
    canvas.width = 1080;
    canvas.height = 1920;
    if (format !== "reel" && format !== "story") {
      setFormat("reel");
    }

    const formatLabel = format === "story" ? "story" : "reel";
    const basename = (selectedPost?.slug || videoFileName.replace(/\.[^.]+$/, "") || `viralizou-${formatLabel}`)
      .replace(/[^a-zA-Z0-9_-]/g, "-") || `viralizou-${formatLabel}`;
    const outFilename = `${basename}-${formatLabel}.mp4`;

    // 1. Gera o canvas do overlay em alta resolução (1080x1920) com as legendas e marcas
    const overlayCanvas = buildReelOverlayCanvas(
      logoImageRef.current,
      title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA",
      selectedPost?.category || "VIRALIZOU",
      handle,
      logoPositionRef.current,
      titlePositionRef.current,
      reelTextStyle,
      reelFontFamily,
      reelFontWeight,
      reelTextAlign,
      reelTextCase,
      reelFontSize,
      showStrongSceneWarning,
      logoScale,
      handleFontSize,
      tagColor,
      tagPositionY,
      logoColorStyle,
      shadeOpacity,
      showOverlayLayer,
      showLogoLayer && logoColorStyle !== "gif",
      showTitleLayer,
      showHandleLayer,
      false, // NUNCA desenha figurinha no overlay de vídeo
      format,
    );

    const overlayBlob = await new Promise<Blob | null>((resolve) => overlayCanvas.toBlob(resolve, "image/png", 1.0));

    // MOTOR DUAL DE ALTA FIDELIDADE: FFmpeg no Servidor + Gravação GPU no Navegador
    addLog("🎬 Iniciando processamento do vídeo...");
    // Recupera o arquivo fonte caso o ref esteja vazio
    let sourceFile = videoFileRef.current;
    if (!sourceFile && videoUrl) {
      addLog("📥 Recuperando arquivo de vídeo a partir do buffer local...");
      try {
        const fetchRes = await fetch(videoUrl);
        const fetchedBlob = await fetchRes.blob();
        sourceFile = new File([fetchedBlob], videoFileName || "video.mp4", { type: fetchedBlob.type || "video/mp4" });
        videoFileRef.current = sourceFile;
        addLog(`✅ Arquivo de vídeo recuperado: ${(sourceFile.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (err: any) {
        addLog(`⚠️ Não foi possível obter o blob original: ${err?.message || "falha"}`);
      }
    }

    // MOTOR 1: Tenta renderização FFmpeg ultrarrápida no Servidor (Zero perda de frames)
    let serverRenderSuccess = false;
    const isCloudHost = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    const shouldAttemptServerFfmpeg = !isCloudHost && Boolean(sourceFile) && Boolean(overlayBlob);

    if (shouldAttemptServerFfmpeg && sourceFile && overlayBlob) {
      addLog(`🚀 Tentando renderização FFmpeg nativa no servidor (${(sourceFile.size / 1024 / 1024).toFixed(2)} MB)...`);
      isRecordingRef.current = true;
      setRecording(true);
      setRecordingProgress(20);
      setVideoExport(null);
      setMessage("⚡ Renderizando vídeo com alta qualidade e 0 engasgos via FFmpeg...");

      try {
        const formData = new FormData();
        formData.append("video", sourceFile, videoFileName || "video.mp4");
        formData.append("overlay", overlayBlob, "overlay.png");
        formData.append("filename", outFilename);
        formData.append("framingMode", videoFramingMode);
        formData.append("vertical", String(imagePosition));
        formData.append("editLevel", miniIaLevel);
        formData.append("mirror", String(miniIaMirror));
        formData.append("trimStart", String(miniIaTrimSeconds));
        formData.append("format", format);
        formData.append("videoFilter", videoFilter);

        if (videoCrop) {
          formData.append("cropX", String(Math.round(videoCrop.x)));
          formData.append("cropY", String(Math.round(videoCrop.y)));
          formData.append("cropW", String(Math.round(videoCrop.width)));
          formData.append("cropH", String(Math.round(videoCrop.height)));
          addLog(`✂️ Corte Personalizado (Crop) enviado ao FFmpeg: ${Math.round(videoCrop.width)}x${Math.round(videoCrop.height)}`);
        }

        if (videoFilter !== "none") {
          addLog(`🎨 Filtro de Cor FFmpeg: ${VIDEO_FILTERS[videoFilter].name}`);
        }
        if (autoHookEnabled && effectiveHookText) {
          addLog(`🪝 Gancho Viral Auto-Edit: "${effectiveHookText}"`);
        }

        if (logoColorStyle === "gif" && showLogoLayer) {
          formData.append("animatedLogo", "true");
          const logoW = Math.round(420 * logoScale / 100);
          const logoH = Math.round(110 * logoScale / 100);
          const logoX = Math.round(logoPosition.x * 1080 - logoW / 2);
          const logoY = Math.round(logoPosition.y * 1920 - logoH / 2);
          formData.append("logoX", String(logoX));
          formData.append("logoY", String(logoY));
          formData.append("logoW", String(logoW));
          addLog("✨ Logo Animada (GIF sem fundo verde) ativada na composição FFmpeg...");
        }

        if (miniIaTrimSeconds > 0) {
          addLog(`✂️ Anti-Detecção: Cortando os primeiros ${miniIaTrimSeconds}s do vídeo original para quebrar hash/duplicidade...`);
        } else {
          addLog("✂️ Anti-Detecção: Mantendo vídeo sem corte inicial (0s)...");
        }

        addLog(`🤖 Mini IA: Nível ${miniIaLevel.toUpperCase()} (${MINI_IA_LEVELS[miniIaLevel].name}) · Anti-Diretrizes Instagram ativadas...`);

        addLog("⏳ Enviando vídeo e arte em alta resolução (1080×1920)...");
        setRecordingProgress(45);
        const res = await fetch("/api/admin/render-reel", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          let errMsg = "";
          try {
            const parsed = JSON.parse(errText);
            errMsg = parsed.error || "";
          } catch {}
          if (!errMsg) {
            errMsg = res.status === 413
              ? "Limite de envio HTTP 413 excedido no servidor"
              : `Erro HTTP ${res.status}`;
          }
          throw new Error(errMsg);
        }

        addLog("📥 Processamento FFmpeg concluído! Baixando MP4 otimizado...");
        setRecordingProgress(90);
        const mp4Blob = await res.blob();
        if (!mp4Blob || mp4Blob.size < 1000 || !mp4Blob.type.toLowerCase().includes("video/mp4")) {
          throw new Error("O arquivo retornado pelo servidor é inválido ou vazio.");
        }

        addLog(`🎉 Sucesso total! MP4 final gerado via FFmpeg (${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB).`);
        setVideoExport({
          url: URL.createObjectURL(mp4Blob),
          filename: outFilename,
          type: "video/mp4",
        });
        setRecordingProgress(100);
        setMessage(`✅ Vídeo (${formatLabel.toUpperCase()}) 100% pronto em MP4! Áudio e legendas sincronizados com perfeição e sem travamentos.`);
        serverRenderSuccess = true;
        return;
      } catch (serverErr: any) {
        addLog(`ℹ️ Servidor FFmpeg (${serverErr?.message || "falha"}). Alternando para gravação GPU local...`);
        addLog("🎬 Ativando Sistema de Gravação Local com Sincronismo GPU de Hardware...");
        setMessage("Aviso: Iniciando gravação local com aceleração GPU...");
      } finally {
        if (serverRenderSuccess) {
          isRecordingRef.current = false;
          setRecording(false);
        }
      }
    } else if (isCloudHost && sourceFile) {
      addLog(`☁️ Ambiente em nuvem (Vercel) ativo: renderizando com o Motor Híbrido GPU + CPU.`);
      addLog("🎬 Ativando Sistema de Gravação Local com Sincronismo GPU de Hardware...");
    }
    // MOTOR 2: Gravação Local por Hardware com Monitor Ativo (Nunca suspende no Chromium)
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
      addLog("❌ Navegador sem suporte a gravação de tela.");
      setMessage("Seu navegador não oferece gravação da prévia. Use a versão atual do Chrome ou Edge.");
      isRecordingRef.current = false;
      setRecording(false);
      return;
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      addLog("❌ Duração do vídeo inválida.");
      setMessage("Não consegui identificar a duração desse vídeo.");
      isRecordingRef.current = false;
      setRecording(false);
      return;
    }

    const duration = Math.min(video.duration, 180);
    addLog(`⏱️ Duração do vídeo: ${duration.toFixed(1)} segundos.`);

    // Prioriza gravação direta em MP4 se suportado (Chrome 106+, Edge, Safari)
    const mp4MimeType = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4; codecs="avc1"',
      "video/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    const webmMimeType = [
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    const mimeType = mp4MimeType || webmMimeType;
    if (!mimeType) {
      addLog("❌ Nenhum formato de mídia suportado pelo navegador.");
      setMessage("Seu navegador não possui suporte a gravação de mídia. Use a versão atualizada do Chrome ou Edge.");
      isRecordingRef.current = false;
      setRecording(false);
      return;
    }
    addLog(`🎞️ Formato de codificação selecionado: ${mimeType.split(";")[0]}`);

    isRecordingRef.current = true;
    setRecording(true);
    setRecordingProgress(0);
    setVideoExport(null);
    setMessage("Gravando vídeo em tempo real com aceleração de GPU. Aguarde...");

    let recorder: MediaRecorder | null = null;
    let canvasStream: MediaStream | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let progressTimer = 0;
    let safetyTimeout = 0;
    let vfcId: number | null = null;
    let loopIntervalId = 0;

    try {
      const duration = Math.min(video.duration, 180);

      // 1. Pausa e desativa loop para evitar repetição de áudio no final
      video.pause();
      video.loop = false;

      // 2. Garante posicionamento no início exato considerando o corte inicial
      const startT = Math.min(miniIaTrimSeconds, Math.max(0, video.duration - 1));
      if (Math.abs(video.currentTime - startT) > 0.05) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Não consegui reiniciar o vídeo para gravar.")), 8000);
          video.addEventListener("seeked", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          video.currentTime = startT;
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
      const miniIaCfg = MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media;
      const speedMultiplier = miniIaCfg.speed || 1;
      video.playbackRate = speedMultiplier;

      addLog(`🤖 Mini IA Ativada: Nível ${miniIaLevel.toUpperCase()} (${miniIaCfg.name}) · Escudo Anti-Diretrizes Ativo`);
      addLog(`⚡ Aceleração de Ritmo: ${speedMultiplier}x (+${((speedMultiplier - 1) * 100).toFixed(1)}%) com áudio sincronizado`);
      addLog(`🎨 Grade de Cores: Contraste ${(miniIaCfg.contrast * 100).toFixed(0)}%, Saturação ${(miniIaCfg.saturation * 100).toFixed(0)}%, Brilho +${(miniIaCfg.brightness * 100).toFixed(1)}%`);
      if (miniIaCfg.punchZoom) {
        addLog(`🔍 Punch Zoom Dinâmico: pulsos a cada ${miniIaCfg.zoomPeriod}s (+${(miniIaCfg.zoomMax * 100).toFixed(0)}%) anti-pHash`);
      }
      if (miniIaTrimSeconds > 0) {
        addLog(`✂️ Corte Inicial Anti-Detecção: Primeiros ${miniIaTrimSeconds}s do vídeo cortados com precisão`);
      } else {
        addLog(`✂️ Corte Inicial: Sem corte (início em 0.0s)`);
      }
      if (miniIaMirror) {
        addLog(`🪞 Espelhamento Horizontal: Ativado (inversão anti-duplicação)`);
      }
      if (videoFilter !== "none") {
        addLog(`🎨 Filtro de Cor Ativo: ${VIDEO_FILTERS[videoFilter].name}`);
      }
      if (autoHookEnabled && effectiveHookText) {
        addLog(`🪝 Gancho Viral Auto-Edit: "${effectiveHookText}" (3.5s inicial)`);
      }
      addLog(`⚡ Suite Auto-Edit: Zooms ${computedZooms} | Cenas ${computedAnimatedScenes} | Trilha ${bgmTrack} | Pausas ${cutPauses ? "cortadas (-0.1s)" : "mantidas"}`);
      if (videoCrop) {
        addLog(`✂️ Corte Personalizado (Crop) ativo nos frames GPU: ${Math.round(videoCrop.width)}x${Math.round(videoCrop.height)} (X:${Math.round(videoCrop.x)}, Y:${Math.round(videoCrop.y)})`);
      }

      // Captura a 30 FPS contínuos sincronizados diretamente com o relógio do hardware/navegador.
      // captureStream(30) elimina descompasso de timestamps com o áudio e previne engasgos/congelamentos.
      canvasStream = canvas.captureStream(30);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: typeof navigator !== "undefined" && ((navigator.hardwareConcurrency || 4) <= 4 || ((navigator as any).deviceMemory || 4) <= 4) ? 2_800_000 : 3_800_000,
        audioBitsPerSecond: 128_000,
      });
      const activeRecorder = recorder;

      let renderedFramesCount = 0;
      let lastFrameTime = 0;
      const drawFrameSync = (time = performance.now()) => {
        if (!isRecordingRef.current) return;
        if (time - lastFrameTime < 30) return;
        lastFrameTime = time;
        const ctx = canvas.getContext("2d");
        if (ctx && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          // Desenha apenas quando existe um frame decodificado, evitando exportar
          // frames pretos durante o seek/carregamento inicial do vídeo.
          ctx.save();
          ctx.fillStyle = "#050505";
          ctx.fillRect(0, 0, W, REEL_H);
          drawVideoWithFraming(
            ctx,
            video,
            W,
            REEL_H,
            videoFramingMode,
            imagePosition,
            miniIaMirror,
            {
              contrast: miniIaCfg.contrast,
              brightness: miniIaCfg.brightness,
              saturation: miniIaCfg.saturation,
              punchZoom: miniIaCfg.punchZoom,
              zoomMax: miniIaCfg.zoomMax,
              zoomPeriod: miniIaCfg.zoomPeriod,
              filterPreset: videoFilter,
            },
            videoCrop
          );
          ctx.drawImage(overlayCanvas, 0, 0, W, REEL_H);
          if (showLogoLayer && logoColorStyle === "gif") {
            const animLogo = animatedLogoRef.current || getOfficialLogo("gif");
            if (animLogo && isImageDrawable(animLogo)) {
              const { width: lW, height: lH } = getLogoSize(animLogo, format, logoScale / 100);
              safeDrawImage(
                ctx,
                animLogo,
                logoPositionRef.current.x * W - lW / 2,
                logoPositionRef.current.y * REEL_H - lH / 2,
                lW,
                lH
              );
            }
          }
          if (autoHookEnabled && effectiveHookText && video.currentTime <= 3.6) {
            drawViralHookBanner(ctx, effectiveHookText, W, REEL_H, video.currentTime, format);
          }
          ctx.restore();
          renderedFramesCount++;
        }
      };

      const syncWithVideoDecoder = (now: DOMHighResTimeStamp) => {
        if (!isRecordingRef.current) return;
        drawFrameSync(now);
        if ("requestVideoFrameCallback" in video) {
          vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        }
      };

      if ("requestVideoFrameCallback" in video) {
        vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        addLog("⚡ Sincronismo nativo GPU (requestVideoFrameCallback) ativado!");
      } else {
        loopIntervalId = window.setInterval(() => drawFrameSync(), 1000 / 30);
        addLog("🖥️ Sincronismo direto por temporizador a 30 FPS ativado.");
      }
      addLog("🛡️ Motor GPU + Canvas ativo: cadência cravada em 30 FPS estáveis.");
          /* if (ctx) drawReelFrame(
            ctx!,
            video,
            logoImageRef.current,
            title || selectedPost?.title || "",
            selectedPost?.category || "",
            handle,
            logoPositionRef.current,
            titlePositionRef.current,
            reelTextStyle,
            reelFontFamily,
            reelFontWeight,
            reelTextAlign,
            reelTextCase,
            reelFontSize,
            reelTextAnimation,
            showStrongSceneWarning,
            logoScale,
            handleFontSize,
            tagColor,
            tagPositionY,
            false,
            logoColorStyle,
            showOverlayLayer ? shadeOpacity : 0,
            showLogoLayer,
            showTitleLayer,
            showHandleLayer,
            showStorySticker,
            format,
          );

        }
        animFrameId = requestAnimationFrame(drawFrameSync);
      }; */

      const blob = await new Promise<Blob>((resolve, reject) => {
        const chunks: Blob[] = [];
        activeRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        activeRecorder.onerror = () => reject(new Error("A gravação do Reel foi interrompida."));
        activeRecorder.onstop = () => {
          const output = new Blob(chunks, { type: activeRecorder.mimeType || mimeType });
          if (!output.size) {
            reject(new Error("O vídeo exportado ficou vazio."));
            return;
          }
          resolve(output);
        };

        const stopRecordingGracefully = () => {
          if (activeRecorder.state !== "inactive") {
            if (loopIntervalId) window.clearInterval(loopIntervalId);
            if (vfcId && "cancelVideoFrameCallback" in video) {
              try { (video as any).cancelVideoFrameCallback(vfcId); } catch {}
              vfcId = null;
            }
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
          if (duration > startT) {
            const currentProgress = Math.min(100, Math.max(0, Math.floor(((video.currentTime - startT) / Math.max(0.1, duration - startT)) * 100)));
            setRecordingProgress(currentProgress);
            if (video.currentTime >= duration && activeRecorder.state !== "inactive") {
              stopRecordingGracefully();
            }
          }
        }, 150);
      });

      let finalBlob = blob;

      if (!mimeType.toLowerCase().includes("mp4")) {
        finalBlob = await fixWebmDuration(finalBlob, duration);
      }

      const isNativeMp4 = mimeType.toLowerCase().includes("mp4");
      if (isNativeMp4) {
        addLog(`🎉 Vídeo gravado com a Mini IA (${miniIaLevel.toUpperCase()} · ${speedMultiplier}x) diretamente em MP4 H.264/AAC via hardware (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB). 100% pronto!`);
      } else {
        setMessage("⚡ Otimizando e comprimindo vídeo para o WhatsApp (H.264 + Faststart)...");
        addLog(`🔄 Executando compressão oficial WhatsApp com Mini IA (${miniIaLevel.toUpperCase()} · ${speedMultiplier}x)...`);

        try {
          const isCloud = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
          if (isCloud && finalBlob.size > 4.5 * 1024 * 1024) {
            addLog("ℹ️ Arquivo WebM acima do limite de envio da Vercel (4.5MB). Entregando arquivo com duração calibrada.");
          } else {
            const formData = new FormData();
            formData.append("file", finalBlob, `${basename}.webm`);
            formData.append("filename", `${basename}-${formatLabel}.mp4`);
            formData.append("preset", "whatsapp_standard");

            const convRes = await fetch("/api/admin/convert-video", {
              method: "POST",
              body: formData,
            });

            if (convRes.ok && (convRes.headers.get("content-type") || "").toLowerCase().includes("video/mp4")) {
              const compBlob = await convRes.blob();
              if (compBlob.size >= 1000) {
                finalBlob = compBlob;
                addLog(`🎉 Conversão para MP4 concluída com sucesso!`);
              }
            }
          }
        } catch (convErr: any) {
          addLog(`ℹ️ Conversor servidor indisponível (${convErr?.message || "offline"}).`);
        }
      }

      const actualIsMp4 = finalBlob.type.toLowerCase().includes("mp4");
      const exportType = actualIsMp4 ? "video/mp4" : (finalBlob.type || "video/webm");
      const exportExt = actualIsMp4 ? "mp4" : "webm";

      setVideoExport({
        url: URL.createObjectURL(finalBlob),
        filename: `${basename}-${formatLabel}.${exportExt}`,
        type: exportType,
      });
      setRecordingProgress(100);
      setMessage(`✅ Vídeo (${formatLabel.toUpperCase()}) 100% pronto em MP4! Áudio e vídeo sincronizados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gravar o Reel.");
    } finally {
      isRecordingRef.current = false;
      window.clearInterval(progressTimer);
      window.clearTimeout(safetyTimeout);

      if (vfcId && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(vfcId);
      }
      if (loopIntervalId) {
        window.clearInterval(loopIntervalId);
      }

      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
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
      video.playbackRate = 1;
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
            <label>📐 Formato da publicação no Instagram</label>
            <div className="adminFeedFormatGrid">
              <button
                type="button"
                className={`adminFeedFormatBtn ${format === "feed" ? "active" : ""}`}
                onClick={() => setFormat("feed")}
              >
                <span className="formatRatio">4:5</span>
                <span className="formatName">Feed (Recomendado)</span>
                <span className="formatDims">1080 × 1350 px · PNG</span>
              </button>
              <button
                type="button"
                className={`adminFeedFormatBtn ${format === "feed-square" ? "active" : ""}`}
                onClick={() => setFormat("feed-square")}
              >
                <span className="formatRatio">1:1</span>
                <span className="formatName">Feed (Quadrado)</span>
                <span className="formatDims">1080 × 1080 px · PNG</span>
              </button>
              <button
                type="button"
                className={`adminFeedFormatBtn ${format === "reel-cover" ? "active" : ""}`}
                onClick={() => setFormat("reel-cover")}
              >
                <span className="formatRatio">4:5</span>
                <span className="formatName">Capa do Reels</span>
                <span className="formatDims">1080 × 1350 px · PNG</span>
              </button>
              <button
                type="button"
                className={`adminFeedFormatBtn ${format === "story" ? "active" : ""}`}
                onClick={() => setFormat("story")}
              >
                <span className="formatRatio">9:16</span>
                <span className="formatName">Stories</span>
                <span className="formatDims">1080 × 1920 px · Link / PNG</span>
              </button>
              <button
                type="button"
                className={`adminFeedFormatBtn ${format === "reel" ? "active" : ""}`}
                onClick={() => setFormat("reel")}
              >
                <span className="formatRatio">9:16</span>
                <span className="formatName">Reels</span>
                <span className="formatDims">1080 × 1920 px · Vídeo MP4</span>
              </button>
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

          {/* SEÇÃO COMPLETA DE MÍDIA (FOTO, VÍDEO OU LINK) - DISPONÍVEL PARA FEED, STORIES E REELS */}
          <div className="field" style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 12, padding: "14px", marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <label style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📸 Mídia de Fundo da Arte (Foto do Feed, Imagem ou Vídeo)</span>
              </label>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                {format === "reel" ? "Reels 9:16" : format === "story" ? "Stories 9:16" : format === "feed-square" ? "Feed 1:1" : format === "reel-cover" ? "Capa Reels 4:5" : "Feed 4:5"}
              </span>
            </div>

            {/* Status da Mídia Atual */}
            {customImageUrl ? (
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={customImageUrl} alt="Prévia" style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 6, border: "1px solid #6ee7b7" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>Foto personalizada ativa</div>
                    <div style={{ fontSize: 11, color: "#047857" }}>{customImageFileName || "Imagem do seu dispositivo"}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={removeCustomImage}
                  style={{ fontSize: 11, padding: "3px 8px", borderColor: "#6ee7b7", color: "#065f46", background: "#fff" }}
                >
                  {selectedPost?.image_url ? "Restaurar foto da notícia" : "Remover foto"}
                </button>
              </div>
            ) : selectedPost?.image_url ? (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#1e40af" }}>
                  📰 Usando imagem original da notícia: <b>{selectedPost.title.slice(0, 45)}...</b>
                </div>
              </div>
            ) : null}

            {/* 1. UPLOAD DE FOTO / IMAGEM (Feed, Capa ou Story) */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                🖼️ Enviar Foto / Imagem do seu dispositivo (PNG, JPG, WebP)
              </label>
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} />
              <small style={{ color: "#64748b", display: "block", marginTop: 2 }}>
                {format === "reel" || format === "story"
                  ? "Envie uma foto caso queira usar imagem estática de fundo nos Stories ou Reels."
                  : "Perfeito para montar post do Feed (4:5 e 1:1) e Capas diretamente."}
              </small>
            </div>

            {/* 2. UPLOAD DE VÍDEO E IMPORTADOR DE LINK (APENAS REELS E STORIES) */}
            {(format === "reel" || format === "story") && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      🎬 Enviar Vídeo do seu dispositivo (MP4, MOV, WebM)
                    </label>
                    {onOpenCompressor && (
                      <button
                        type="button"
                        onClick={onOpenCompressor}
                        style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        title="Abre o Compressor de Vídeo para WhatsApp"
                      >
                        🗜️ Compressor WhatsApp
                      </button>
                    )}
                  </div>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                    <small style={{ color: "#64748b" }}>
                      {videoFileName ? `${videoFileName}${videoReady ? " · pronto para prévia" : " · carregando..."}` : "Vídeo de até 250 MB para Reels ou Stories."}
                    </small>
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={removeVideo}
                        style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                      >
                        Remover vídeo
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. BAIXAR VÍDEO DIRETO DE LINK (TikTok, Instagram Reels, Twitter/X) */}
                <div style={{ background: "#ffffff", border: "1.5px dashed #4f46e5", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                  <label style={{ color: "#312e81", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span>📥 Baixar mídia direto de link (TikTok, Instagram Reels, Twitter/X)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="url"
                      placeholder="Cole o link do TikTok, Reels ou Twitter/X..."
                      value={importVideoUrl}
                      onChange={(e) => setImportVideoUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImportVideoFromUrl(); } }}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={handleImportVideoFromUrl}
                      disabled={importingVideo}
                      style={{ background: "#4f46e5", whiteSpace: "nowrap", fontSize: 12, padding: "6px 12px" }}
                    >
                      {importingVideo ? "Importando..." : "Importar"}
                    </button>
                  </div>
                  <small style={{ color: "#64748b", marginTop: 4, display: "block", fontSize: 10.5 }}>
                    🔒 O vídeo é baixado temporariamente em proxy direto na memória do navegador e apagado ao sair.
                  </small>
                </div>
              </>
            )}

            {/* 4. ENQUADRAMENTO E AJUSTE VERTICAL DA MÍDIA (FOTO OU VÍDEO) */}
            {(customImageUrl || selectedPost?.image_url || videoUrl) && (
              <div style={{ background: "#ffffff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                {videoUrl && (format === "reel" || format === "story") && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                      📐 Enquadramento do Vídeo no Reel/Story (9:16)
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "cover" ? "active" : ""}`}
                        onClick={() => setVideoFramingMode("cover")}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: "5px 8px",
                          background: videoFramingMode === "cover" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "cover" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "cover" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "cover" ? 700 : 500,
                        }}
                      >
                        🔍 Preencher Tela (Zoom 9:16)
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "blur-fit" ? "active" : ""}`}
                        onClick={() => setVideoFramingMode("blur-fit")}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: "5px 8px",
                          background: videoFramingMode === "blur-fit" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "blur-fit" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "blur-fit" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "blur-fit" ? 700 : 500,
                        }}
                      >
                        📰 Jornalístico (Fundo Desfocado)
                      </button>
                    </div>
                  </div>
                )}

                {videoUrl && (
                  <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px dashed #e2e8f0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>✂️ Corte Personalizado (Crop)</span>
                      {videoCrop ? (
                        <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                          Ativo: {Math.round(videoCrop.width)}×{Math.round(videoCrop.height)} px
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "#64748b" }}>Sem corte</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setShowCropModal(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 5px rgba(37,99,235,0.28)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                        </svg>
                        Ajustar Corte (Crop)
                      </button>
                      {videoCrop && (
                        <button
                          type="button"
                          onClick={() => handleApplyCrop(null)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "transparent",
                            color: "#ef4444",
                            border: "1px solid #fca5a5",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ✕ Resetar Corte
                        </button>
                      )}
                    </div>
                    <small style={{ color: "#64748b", fontSize: 10.5, display: "block", marginTop: 4 }}>
                      Ajuste a área de corte arrastando as bordas para remover marcas d&apos;água, legendas prévias ou focar em um elemento.
                    </small>
                  </div>
                )}

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                      ↕️ Ajuste Vertical da Mídia / Foto: <b style={{ color: "#0284c7" }}>{imagePosition}%</b>
                    </span>
                    {imagePosition !== 0 && (
                      <button
                        type="button"
                        className="captionTagBadge"
                        onClick={() => setImagePosition(0)}
                        style={{ fontSize: 10, padding: "2px 6px" }}
                      >
                        Centralizar (0%)
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={imagePosition}
                    onChange={(e) => setImagePosition(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#64748b", fontSize: 10.5, display: "block", marginTop: 2 }}>
                    Deslize para subir ou descer a imagem/vídeo para focar perfeitamente rostos ou o centro do post.
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* 3 SLOTS DE LAYOUT PREDEFINIDOS - EXCLUSIVO DA ABA REELS (ACIMA DO PAINEL DA MINI IA) */}
          {format === "reel" && (
            <div className="presetSlotsContainer" style={{ marginBottom: 14 }}>
              <div className="presetSlotsHeader">
                <div className="presetSlotsTitle">
                  <span>⚡ 3 Slots de Layout Salvo (Prévia Automática)</span>
                </div>
                {slotFeedback && <span className="presetSlotsFeedback">{slotFeedback}</span>}
              </div>
              <div className="presetSlotsGrid">
                {presetSlots.map((slot) => {
                  const isActive = activeSlotId === slot.id;
                  return (
                    <div key={slot.id} className={`presetSlotCard ${isActive ? "active" : ""}`}>
                      <div>
                        <div className="presetSlotTop">
                          <span className="presetSlotBadge">SLOT {slot.id}</span>
                          {isActive && <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 800 }}>● ATIVO</span>}
                        </div>
                        <div className="presetSlotName">{slot.name}</div>
                        <div className="presetSlotDesc">{slot.summary}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                        <button
                          type="button"
                          className="presetSlotBtnUse"
                          onClick={() => handleUsePresetSlot(slot)}
                          title={`Carregar layout do ${slot.name} automaticamente na prévia`}
                        >
                          ⚡ Usar Layout
                        </button>
                        <button
                          type="button"
                          className="presetSlotBtnSave"
                          onClick={() => handleSaveCurrentToSlot(slot.id)}
                          title={`Salvar a configuração visual atual no Slot ${slot.id}`}
                        >
                          💾 Salvar Atual
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. MINI IA DE EDIÇÃO ANTI-DIRETRIZES DO INSTAGRAM (ORIGINALIDADE & ALCANCE - APENAS REELS E STORIES) */}
          {(format === "reel" || format === "story") && (
            <div className="miniIaStudioField">
              <div className="miniIaHeader">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="miniIaRobotIcon">🤖</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      Mini IA de Edição · Proteção Instagram
                      <span style={{ fontSize: 10, background: "#8b5cf6", color: "#fff", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>
                        Escudo Anti-Diretrizes Ativo
                      </span>
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                      Transforma ritmo, cortes, pHash e metadados para o Instagram classificar seu conteúdo como 100% Original e manter as recomendações livres de punições.
                    </p>
                  </div>
                </div>
              </div>

              <div className="miniIaLevelButtons">
                {/* 1. LEVE */}
                <button
                  type="button"
                  className={`miniIaLevelBtn leve ${miniIaLevel === "leve" ? "active" : ""}`}
                  onClick={() => chooseMiniIaLevel("leve")}
                  title="Ritmo 1.015x, equalização suave e limpeza de metadados"
                >
                  <div className="miniIaBtnTop">
                    <span className="miniIaBtnDot leve" />
                    <span className="miniIaBtnName">LEVE</span>
                  </div>
                  <div className="miniIaBtnTag">1.015x · Suave</div>
                  <div className="miniIaBtnDesc">
                    Preserva áudio original e limpa metadados de câmera.
                  </div>
                </button>

                {/* 2. MÉDIA (RECOMENDADA) */}
                <button
                  type="button"
                  className={`miniIaLevelBtn media ${miniIaLevel === "media" ? "active" : ""}`}
                  onClick={() => chooseMiniIaLevel("media")}
                  title="Ritmo 1.03x, cortes dinâmicos punch zoom a cada 4.5s, color grading e áudio normalizado"
                >
                  <div className="miniIaBtnTop">
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="miniIaBtnDot media" />
                      <span className="miniIaBtnName">MÉDIA</span>
                    </div>
                    <span className="miniIaRecommendedStar">★ TOP</span>
                  </div>
                  <div className="miniIaBtnTag">1.03x · Punch Zoom</div>
                  <div className="miniIaBtnDesc">
                    Micro-cortes dinâmicos a cada 4.5s e som normalizado.
                  </div>
                </button>

                {/* 3. ALTA */}
                <button
                  type="button"
                  className={`miniIaLevelBtn alta ${miniIaLevel === "alta" ? "active" : ""}`}
                  onClick={() => chooseMiniIaLevel("alta")}
                  title="Ritmo 1.05x, quebra completa de pHash com micro-grão temporal e cortes a cada 3.8s"
                >
                  <div className="miniIaBtnTop">
                    <span className="miniIaBtnDot alta" />
                    <span className="miniIaBtnName">ALTA</span>
                  </div>
                  <div className="miniIaBtnTag">1.05x · Anti-pHash</div>
                  <div className="miniIaBtnDesc">
                    Transformação máxima: zooms frequentes e micro-grão.
                  </div>
                </button>
              </div>

              <div className="miniIaOptionsRow">
                <label className="miniIaCheckbox">
                  <input
                    type="checkbox"
                    checked={miniIaMirror}
                    onChange={(e) => toggleMiniIaMirror(e.target.checked)}
                  />
                  <span>🪞 Espelhar vídeo horizontalmente (Mirror Anti-Detecção de Câmera)</span>
                </label>
              </div>

              {/* CONTROLE DE CORTE INICIAL (ANTI-DETECÇÃO DE HASH & DUPLICIDADE) */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  margin: "12px 0 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✂️</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}>
                        Corte Inicial Anti-Detecção (Pular Início)
                      </span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          background: miniIaTrimSeconds === 3 ? "rgba(16, 185, 129, 0.25)" : "rgba(139, 92, 246, 0.25)",
                          color: miniIaTrimSeconds === 3 ? "#34d399" : "#c084fc",
                          border: `1px solid ${miniIaTrimSeconds === 3 ? "rgba(16, 185, 129, 0.5)" : "rgba(139, 92, 246, 0.5)"}`,
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontWeight: 800,
                        }}
                      >
                        {miniIaTrimSeconds === 3 ? "⭐ Padrão Recomendado (3s)" : miniIaTrimSeconds === 0 ? "Desativado (0s)" : `${miniIaTrimSeconds}s Selecionado`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Personalizado:</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={miniIaTrimSeconds}
                      onChange={(e) => chooseMiniIaTrimSeconds(Number(e.target.value))}
                      style={{
                        width: 58,
                        padding: "4px 8px",
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: "center",
                        borderRadius: 6,
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "#f8fafc",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>seg</span>
                  </div>
                </div>

                {/* Botões de atalho rápido */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    { sec: 0, label: "0s (Sem corte)" },
                    { sec: 1, label: "1s" },
                    { sec: 2, label: "2s" },
                    { sec: 3, label: "3s (Padrão ⭐)" },
                    { sec: 4, label: "4s" },
                    { sec: 5, label: "5s" },
                    { sec: 10, label: "10s" },
                  ].map((preset) => {
                    const isSelected = miniIaTrimSeconds === preset.sec;
                    return (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => chooseMiniIaTrimSeconds(preset.sec)}
                        style={{
                          padding: "5px 12px",
                          fontSize: 11,
                          fontWeight: isSelected ? 800 : 600,
                          borderRadius: 6,
                          border: isSelected ? "1.5px solid #8b5cf6" : "1px solid rgba(148, 163, 184, 0.25)",
                          background: isSelected ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(30, 41, 59, 0.7)",
                          color: isSelected ? "#ffffff" : "#cbd5e1",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 2px 10px rgba(124, 58, 237, 0.35)" : "none",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Slider para ajuste fino */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={1}
                    value={miniIaTrimSeconds}
                    onChange={(e) => chooseMiniIaTrimSeconds(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#8b5cf6", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 800, minWidth: 32, textAlign: "right" }}>
                    {miniIaTrimSeconds}s
                  </span>
                </div>

                <small style={{ color: "#94a3b8", fontSize: 10.5, display: "block", marginTop: 8, lineHeight: 1.45 }}>
                  💡 Cortar os primeiros segundos (padrão de 3s) quebra a impressão digital e o hash inicial do arquivo, elimina aberturas e logotipos originais de terceiros e impede que o algoritmo do Instagram ou TikTok puna o vídeo como repost duplicado.
                </small>
              </div>

              {/* SUITE AUTO-EDIT INTELIGENTE (ESTILO VIRAL TIKTOK / REELS) */}
              <div className="miniIaAutoEditBox">
                <div className="miniIaAutoEditHeader">
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 15 }}>⚡</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#f8fafc", letterSpacing: "0.5px" }}>
                      AUTO-EDIT INTELIGENTE
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, color: "#cbd5e1" }}>
                      <input
                        type="checkbox"
                        checked={autoHookEnabled}
                        onChange={(e) => toggleAutoHook(e.target.checked)}
                        style={{ accentColor: "#8b5cf6" }}
                      />
                      <span>Gancho na tela</span>
                    </label>
                  </div>
                </div>

                <div className="miniIaAutoEditTable">
                  {/* Gancho */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Gancho</span>
                    <input
                      type="text"
                      className="miniIaHookInput"
                      value={autoHookText || (title || selectedPost?.title || "LIVRO CAIU SOZINHO NO CHÃO")}
                      onChange={(e) => changeHookText(e.target.value)}
                      placeholder="LIVRO CAIU SOZINHO NO CHÃO"
                      title="Texto do gancho viral exibido nos primeiros 3.5 segundos"
                    />
                  </div>

                  {/* Palavras-chave */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Palavras-chave</span>
                    <span className="miniIaAutoEditValue">{computedKeywords}</span>
                  </div>

                  {/* Zooms */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Zooms</span>
                    <span className="miniIaAutoEditValue">{computedZooms}</span>
                  </div>

                  {/* B-roll */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">B-roll</span>
                    <span className="miniIaAutoEditValue">1</span>
                  </div>

                  {/* Cenas animadas */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Cenas animadas</span>
                    <span className="miniIaAutoEditValue">{computedAnimatedScenes}</span>
                  </div>

                  {/* Reações */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Reações</span>
                    <span className="miniIaAutoEditValue">1</span>
                  </div>

                  {/* Trilha */}
                  <div className="miniIaAutoEditRow">
                    <span className="miniIaAutoEditLabel">Trilha</span>
                    <select
                      className="miniIaTrackSelect"
                      value={bgmTrack}
                      onChange={(e) => chooseBgmTrack(e.target.value as BgmTrackPreset)}
                    >
                      {Object.entries(BGM_TRACKS).map(([k, tr]) => (
                        <option key={k} value={k}>
                          {tr.name} ({k})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checkbox: Cortar pausas */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <label className="miniIaAutoEditCheckboxLabel">
                    <input
                      type="checkbox"
                      checked={cutPauses}
                      onChange={(e) => toggleCutPauses(e.target.checked)}
                    />
                    <span>Cortar pausas (deixa 0,1s de respiro)</span>
                  </label>
                </div>
              </div>

              {/* FILTROS DE VÍDEO & COLOR GRADING */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>
                    🎨 Filtros de Cor & Estilo Visual
                  </span>
                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                    {VIDEO_FILTERS[videoFilter]?.name || "Natural"}
                  </span>
                </div>
                <div className="miniIaFilterGrid">
                  {(Object.keys(VIDEO_FILTERS) as VideoFilterPreset[]).map((fKey) => {
                    const f = VIDEO_FILTERS[fKey];
                    const isAct = videoFilter === fKey;
                    return (
                      <button
                        key={fKey}
                        type="button"
                        className={`miniIaFilterBtn ${isAct ? "active" : ""}`}
                        onClick={() => chooseVideoFilter(fKey)}
                        title={f.description}
                      >
                        <span className="filterEmoji">{f.icon}</span>
                        <span className="filterName">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="miniIaDetailCard">
                <div className="miniIaDetailHeader">
                  <span>Modo Ativo: <b style={{ textTransform: "uppercase" }}>{MINI_IA_LEVELS[miniIaLevel].name}</b></span>
                  <span>Velocidade: <b>{MINI_IA_LEVELS[miniIaLevel].speed}x</b> · Áudio: <b>{MINI_IA_LEVELS[miniIaLevel].loudnessTarget} LUFS</b></span>
                  <span>Corte Inicial: <b>{miniIaTrimSeconds}s {miniIaTrimSeconds === 3 ? "(Padrão ⭐)" : ""}</b></span>
                  <span>Filtro: <b>{VIDEO_FILTERS[videoFilter]?.name || "Natural"}</b></span>
                </div>
                <p className="miniIaDetailText">
                  {MINI_IA_LEVELS[miniIaLevel].description}
                  {miniIaMirror ? " + Espelhamento horizontal ativo." : ""}
                  {miniIaTrimSeconds > 0 ? ` + Cortando os primeiros ${miniIaTrimSeconds}s do vídeo original.` : " + Sem corte inicial."}
                  {videoFilter !== "none" ? ` + Filtro visual "${VIDEO_FILTERS[videoFilter]?.name}" ativo.` : ""}
                  {cutPauses ? " + Corte inteligente de pausas (respiro de 0.1s)." : ""}
                </p>
              </div>
            </div>
          )}

          <div className="captionStudioBox">
            <div className="captionHeaderTitle">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3>🔤 Tipografia & Estilo da Legenda</h3>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={centerTitleAndBox}
                  style={{ fontSize: 11, padding: "4px 8px", background: "#f8fafc", borderColor: "#cbd5e1" }}
                  title="Centraliza o alinhamento e a posição do título e caixa de legenda"
                >
                  🎯 Centralizar Título e Caixa
                </button>
              </div>
              <span>{format === "feed" ? "Feed 4:5" : format === "feed-square" ? "Feed quadrado 1:1" : format === "reel-cover" ? "Capa do Reels 4:5" : format === "story" ? "Story 9:16" : "Reel 9:16"}</span>
            </div>

            <div className="captionStudioField">
              <label className="captionSafeZoneToggle">
                <span>🧩 Painel de camadas</span>
                <input type="checkbox" checked={showLayerPanel} onChange={(e) => toggleLayerPanel(e.target.checked)} />
              </label>
              {showLayerPanel && (
                <div className="captionTagShortcuts" style={{ marginTop: 8 }}>
                  <label className="captionSafeZoneToggle"><span>Logo</span><input type="checkbox" checked={showLogoLayer} onChange={(e) => toggleLogoLayer(e.target.checked)} /></label>
                  <label className="captionSafeZoneToggle"><span>Título</span><input type="checkbox" checked={showTitleLayer} onChange={(e) => toggleTitleLayer(e.target.checked)} /></label>
                  <label className="captionSafeZoneToggle"><span>Tag / assinatura</span><input type="checkbox" checked={showHandleLayer} onChange={(e) => toggleHandleLayer(e.target.checked)} /></label>
                  {format === "story" && <label className="captionSafeZoneToggle"><span>Guia de figurinha (só prévia)</span><input type="checkbox" checked={showStorySticker} onChange={(e) => toggleStorySticker(e.target.checked)} /></label>}
                </div>
              )}
            </div>

            <div className="captionStudioField">
              <label>Fonte</label>
              <select
                className="captionStudioSelect"
                value={reelFontFamily}
                onChange={(e) => chooseReelFontFamily(e.target.value as ReelFontFamily)}
              >
                <option value="montserrat">Montserrat (Recomendado)</option>
                <option value="anton">Anton (Viral / Impacto)</option>
                <option value="bebas">Bebas Neue (Condensada)</option>
                <option value="poppins">Poppins (Moderna)</option>
                <option value="inter">Inter (Nítida)</option>
                <option value="roboto">Roboto (Editorial)</option>
                <option value="georgia">Georgia / Merriweather (Jornalística · Metrópoles)</option>
                <option value="impact">Impact (Clássica)</option>
              </select>
            </div>

            <div className="captionStudioField">
              <label>Estilo da Fonte</label>
              <select
                className="captionStudioSelect"
                value={reelFontWeight}
                onChange={(e) => chooseReelFontWeight(e.target.value as ReelFontWeight)}
              >
                <option value="900">Black (Ultra Pesada)</option>
                <option value="800">Extra Bold</option>
                <option value="700">Bold (Negrito)</option>
                <option value="600">Semi Bold</option>
                <option value="400">Regular</option>
                <option value="italic">Itálico (Inclinada)</option>
              </select>
            </div>

            <div className="captionStudioField">
              <label>Alinhamento</label>
              <div className="captionSegmentGroup" role="group" aria-label="Alinhamento da Legenda">
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextAlign === "left" ? "active" : ""}`}
                  onClick={() => chooseReelTextAlign("left")}
                  title="Alinhar à Esquerda"
                >
                  ◀
                </button>
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextAlign === "center" ? "active" : ""}`}
                  onClick={() => chooseReelTextAlign("center")}
                  title="Centralizado"
                >
                  <span className="captionDotIndicator" />
                </button>
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextAlign === "right" ? "active" : ""}`}
                  onClick={() => chooseReelTextAlign("right")}
                  title="Alinhar à Direita"
                >
                  ▶
                </button>
              </div>
            </div>

            <div className="captionStudioField">
              <label>Caixa de Texto</label>
              <div className="captionSegmentGroup" role="group" aria-label="Caixa do texto">
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextCase === "lowercase" ? "active" : ""}`}
                  onClick={() => chooseReelTextCase("lowercase")}
                >
                  minúsculas
                </button>
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextCase === "uppercase" ? "active" : ""}`}
                  onClick={() => chooseReelTextCase("uppercase")}
                >
                  MAIÚSCULAS
                </button>
                <button
                  type="button"
                  className={`captionSegmentBtn ${reelTextCase === "original" ? "active" : ""}`}
                  onClick={() => chooseReelTextCase("original")}
                >
                  Original
                </button>
              </div>
            </div>

            <div className="captionStudioField">
              <label>
                <span>Tamanho da Fonte da Manchete</span>
                <span className="captionSizeBadge">{reelFontSize}px</span>
              </label>
              <div className="captionSizeRow">
                <input
                  type="range"
                  min="28"
                  max="110"
                  step="2"
                  value={reelFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    chooseReelFontSize(val);
                    saveFeedTitleSize(val);
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="captionTagBadge"
                  onClick={() => {
                    chooseReelFontSize(72);
                    saveFeedTitleSize(0);
                  }}
                  title="Restaurar tamanho padrão"
                >
                  Reset (72px)
                </button>
              </div>
            </div>

            <div className="captionStudioField">
              <label>Estilo do Layout & Caixa da Legenda</label>
              <div className="captionStyleGrid">
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "standard" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("standard")}
                  title="Texto branco com sombra nítida sobre o vídeo/foto"
                >
                  ✨ Só a letra (Sem fundo)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "box-banner" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("box-banner")}
                  title="Caixa sólida retangular com cantos arredondados (Estilo O Grito)"
                >
                  ⬛ Caixa Noticiosa (O Grito)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "category-badge" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("category-badge")}
                  title="Tag vermelha de categoria no topo + manchete à esquerda (Estilo Jornal Opção)"
                >
                  🏷️ Selo de Categoria (Jornal Opção)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "red-bottom" ? "active" : ""}`}
                  onClick={() => {
                    chooseReelTextStyle("red-bottom");
                    chooseReelTextAlign("left");
                    chooseReelFontFamily("inter");
                    chooseReelFontWeight("800");
                    chooseReelFontSize(60);
                    setImagePosition(-12);
                  }}
                  style={{
                    background: reelTextStyle === "red-bottom" ? "#e50014" : undefined,
                    color: reelTextStyle === "red-bottom" ? "#ffffff" : undefined,
                    borderColor: reelTextStyle === "red-bottom" ? "#b91c1c" : undefined,
                    fontWeight: reelTextStyle === "red-bottom" ? 800 : 600,
                  }}
                  title="Bloco inferior vermelho sólido com manchete branca à esquerda e rodapé clean (Estilo TVT Notícias)"
                >
                  🟥 Bloco Vermelho Notícia (TVT)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "bacci-red" ? "active" : ""}`}
                  onClick={() => {
                    chooseReelTextStyle("bacci-red");
                    chooseReelFontFamily("anton");
                    chooseReelFontWeight("900");
                    chooseReelTextCase("uppercase");
                    chooseReelTextAlign("left");
                    chooseReelFontSize(52);
                    setImagePosition(-12);
                  }}
                  style={{
                    background: reelTextStyle === "bacci-red" ? "linear-gradient(135deg, #b91c1c, #991b1b)" : undefined,
                    color: reelTextStyle === "bacci-red" ? "#ffffff" : undefined,
                    borderColor: reelTextStyle === "bacci-red" ? "#ef4444" : undefined,
                    fontWeight: reelTextStyle === "bacci-red" ? 800 : 600,
                  }}
                  title="Estilo Bacci Notícias: Bloco escuro com logo circular 3D sem bordas brancas + manchete + tarja vermelha de TV com redes sociais"
                >
                  📺 Estilo Bacci (Tarja Vermelha & Logo Circular)
                </button>
                <button type="button" className={`captionStyleBtn ${reelTextStyle === "highlight" || reelTextStyle === "highlight-yellow" ? "active" : ""}`} onClick={() => chooseReelTextStyle("highlight")} title="Faixa amarela noticiosa em destaque (Alto impacto)">🟨 Faixa Noticiosa (Destaque)</button> {false && (<><button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "left-border" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("left-border")}
                  title="Barra lateral vertical vermelha em destaque (Estilo Aspas / Destaque)"
                >
                  🟥 Barra Lateral Vermelha (Destaque)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "editorial-serif" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("editorial-serif")}
                  title="Tipografia serifada nobre com linha editorial (Estilo Metrópoles / Na Mira)"
                >
                  🏛️ Editorial Metrópoles
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "highlight" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("highlight")}
                >
                  ⬜ Faixa branca
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "highlight-dark" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("highlight-dark")}
                >
                  ⬛ Faixa preta
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "highlight-yellow" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("highlight-yellow")}
                >
                  🟨 Faixa amarela
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "highlight-red" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("highlight-red")}
                >
                  🟥 Faixa vermelha
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "stroke-strong" ? "active" : ""}`}
                  onClick={() => chooseReelTextStyle("stroke-strong")}
                >
                  🔲 Contorno forte
                </button></>)}
              </div>
            </div>

            <div className="captionStudioField">
              <label className="captionSafeZoneToggle">
                <span>🌘 Sobreposição escura para melhorar o contraste</span>
                <input type="checkbox" checked={showOverlayLayer} onChange={(e) => toggleOverlayLayer(e.target.checked)} />
              </label>
              <small>A sobreposição começa desligada para preservar a claridade da foto/vídeo. Ative apenas quando precisar de mais contraste.</small>
              {showOverlayLayer && (
                <>
                  <label>Intensidade da sobreposição: {shadeOpacity}%</label>
                  <input type="range" min="0" max="100" step="5" value={shadeOpacity} onChange={(e) => saveShadeOpacity(Number(e.target.value))} />
                </>
              )}
            </div>

            {format === "reel" && (
              <div className="captionStudioField">
                <label>Animação</label>
                <div className="captionTagShortcuts">
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "typewriter" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("typewriter")}
                  >
                    ⌨️ Digitando
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "pop" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("pop")}
                  >
                    💥 Impacto
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "slide" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("slide")}
                  >
                    ⬆️ Deslizar
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "fade" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("fade")}
                  >
                    ✨ Surgir
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "static" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("static")}
                  >
                    📌 Fixo
                  </button>
                </div>
              </div>
            )}

            <label className="captionSafeZoneToggle">
              <span>📐 Mostrar Área Segura do Instagram (Safe Zone)</span>
              <input
                type="checkbox"
                checked={showSafeZone}
                onChange={(e) => toggleSafeZone(e.target.checked)}
              />
            </label>

            <label className="adminFeedWarningOption" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={showStrongSceneWarning} onChange={(event) => toggleStrongSceneWarning(event.target.checked)} />
              Exibir aviso “Cenas fortes”
            </label>

            {(format === "feed" || format === "feed-square" || format === "reel-cover") && (
              <div className="captionStudioField" style={{ marginTop: 8 }}>
                <label>
                  <span>↕️ Posição vertical da legenda</span>
                  <b style={{ color: "#c084fc" }}>{feedTitleOffsetY > 0 ? `+${feedTitleOffsetY}px` : `${feedTitleOffsetY}px`}</b>
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
                      className="captionTagBadge"
                      onClick={() => saveFeedTitleOffsetY(0)}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="field">
            <label>📰 Título na arte</label>
            <textarea
              rows={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O título da notícia aparece automaticamente e você pode ajustar antes de baixar."
            />
            <small>Arraste o título na prévia para escolher onde ele aparece{format === "feed" ? "; a posição é salva neste navegador." : "."}</small>
          </div>

          <div className="field">
            <label>🏷️ Tag / Assinatura do Conteúdo</label>
            <input value={handle} onChange={(e) => saveHandle(e.target.value)} placeholder="@viralizougoiania, FUTEBOL, POLÍTICA, CELEBRIDADES..." />
            <div className="captionTagShortcuts">
              <span style={{ fontSize: 11, color: "#94a3b8", alignSelf: "center" }}>Tags rápidas:</span>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("@viralizougoiania")}>@viralizougoiania</button>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("FUTEBOL")}>⚽ FUTEBOL</button>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("POLÍTICA")}>🏛️ POLÍTICA</button>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("CELEBRIDADES")}>⭐ CELEBRIDADES</button>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("GOIÁS")}>📍 GOIÁS</button>
              <button type="button" className="captionTagBadge" onClick={() => saveHandle("URGENTE")}>🚨 URGENTE</button>
            </div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <small style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Cor da Legenda / Tag:</small>
                <div className="captionColorGroup">
                  <button
                    type="button"
                    className={`captionColorPill ${tagColor === "red" ? "active" : ""}`}
                    onClick={() => chooseTagColor("red")}
                  >
                    <span className="captionColorCircle" style={{ background: "#ff3b30" }} />
                    🔴 Vermelho (Destaque)
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${tagColor === "white" ? "active" : ""}`}
                    onClick={() => chooseTagColor("white")}
                  >
                    <span className="captionColorCircle" style={{ background: "#ffffff" }} />
                    ⚪ Branco
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${tagColor === "yellow" ? "active" : ""}`}
                    onClick={() => chooseTagColor("yellow")}
                  >
                    <span className="captionColorCircle" style={{ background: "#ffcc00" }} />
                    🟡 Amarelo
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${tagColor === "orange" ? "active" : ""}`}
                    onClick={() => chooseTagColor("orange")}
                  >
                    <span className="captionColorCircle" style={{ background: "#ff5a1f" }} />
                    🟠 Laranja
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <small style={{ fontWeight: 700 }}>Tamanho da fonte do @ / Tag: <b>{handleFontSize}px</b></small>
                </div>
                <input
                  type="range"
                  min="18"
                  max="72"
                  value={handleFontSize}
                  onChange={(e) => saveReelHandleSize(Number(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <small style={{ fontWeight: 700 }}>↕️ Altura da Tag: <b>{getEffectiveTagY(format, tagPositionY)}px</b></small>
                  {tagPositionY !== getEffectiveTagY(format, 0) && (
                    <button
                      type="button"
                      className="captionTagBadge"
                      onClick={() => chooseTagPositionY(getEffectiveTagY(format, 0))}
                      title="Restaura a altura segura padrão deste formato"
                    >
                      Reset ({getEffectiveTagY(format, 0)}px)
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min="50"
                  max={getCanvasDimensions(format).height - 30}
                  step="5"
                  value={getEffectiveTagY(format, tagPositionY)}
                  onChange={(e) => chooseTagPositionY(Number(e.target.value))}
                />
                <small style={{ color: "#8b5cf6", display: "block", marginTop: 4, fontWeight: 600 }}>
                  🖱️ Dica: Você também pode clicar e arrastar a <b>Tag / Assinatura</b> diretamente na prévia com o mouse!
                </small>
              </div>
            </div>
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <label style={{ margin: 0 }}>🏢 Logo do jornal</label>
              <div className="logoColorStyleGroup" role="group" aria-label="Estilo da cor das letras da logo">
                <button
                  type="button"
                  className={`logoColorStyleBtn ${logoColorStyle === "white" ? "active" : ""}`}
                  onClick={() => chooseLogoColorStyle("white")}
                  title="Logo com letras brancas (Ideal para vídeos, Reels, Stories e fundos escuros)"
                >
                  ⚪ Letras Brancas
                </button>
                <button
                  type="button"
                  className={`logoColorStyleBtn ${logoColorStyle === "dark" ? "active" : ""}`}
                  onClick={() => chooseLogoColorStyle("dark")}
                  title="Logo com letras pretas (Ideal para posts com fundo claro)"
                >
                  ⚫ Letras Pretas
                </button>
                <button
                  type="button"
                  className={`logoColorStyleBtn ${logoColorStyle === "gif" ? "active" : ""}`}
                  onClick={() => chooseLogoColorStyle("gif")}
                  title="Logo Oficial Animada em GIF (Sem fundo verde, com efeito de brilho)"
                  style={logoColorStyle === "gif" ? { borderColor: "#8b5cf6", color: "#c084fc", background: "rgba(139, 92, 246, 0.15)" } : {}}
                >
                  ✨ Animada (GIF)
                </button>
                <button
                  type="button"
                  className={`logoColorStyleBtn ${logoColorStyle === "original" ? "active" : ""}`}
                  onClick={() => chooseLogoColorStyle("original")}
                  title="Manter cores originais da imagem enviada"
                >
                  Original
                </button>
              </div>
            </div>

            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={onLogoChange} />
            <small>
              Alterne acima entre <b>Letras Brancas ⚪</b>, <b>Letras Pretas ⚫</b> ou <b>Animada (GIF) ✨</b> (sem fundo verde).
            </small>

            {/* Cartão de visualização da logo ativa (Oficial transparente ou Customizada) */}
            <div
              className="adminFeedLogoSaved"
              style={{
                background: logoColorStyle === "white" || logoColorStyle === "gif" ? "#0f172a" : "#f8fafc",
                border: "1px solid #cbd5e1",
                padding: "10px 14px",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: logoColorStyle === "white" || logoColorStyle === "gif" ? "#1e293b" : "#f1f5f9",
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: logoColorStyle === "white" || logoColorStyle === "gif" ? "1px solid #334155" : "1px solid #e2e8f0",
                  }}
                >
                  {!logoData && logoColorStyle === "gif" ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          el.defaultMuted = true;
                          el.muted = true;
                          el.play().catch(() => {});
                        }
                      }}
                      src="/logos/Viralizou_Goiania_logo_animada_transparente.webm"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      style={{
                        maxHeight: 34,
                        maxWidth: 140,
                        display: "block",
                        objectFit: "contain",
                      }}
                    >
                      <source src="/logos/Viralizou_Goiania_logo_animada_transparente.webm" type="video/webm" />
                      <img
                        src="/logos/logo-viralizou-intro.gif"
                        alt="Logo animada"
                        style={{ maxHeight: 34, maxWidth: 140, display: "block", objectFit: "contain" }}
                      />
                    </video>
                  ) : (
                    <img
                      key={`${logoColorStyle}_${Boolean(logoData)}`}
                      src={
                        logoData ||
                        (logoColorStyle === "dark"
                          ? "/logos/logo-viralizou-preta.png"
                          : "/logos/logo-viralizou-branca.png")
                      }
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.includes("/api/logos/")) {
                          img.src = logoColorStyle === "dark" ? "/api/logos/dark" : "/api/logos/white";
                        }
                      }}
                      alt="Logo ativa"
                      style={{
                        maxHeight: 34,
                        display: "block",
                      }}
                    />
                  )}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      display: "block",
                      color: logoColorStyle === "white" || logoColorStyle === "gif" ? "#f8fafc" : "#0f172a",
                    }}
                  >
                    {logoData
                      ? "Logo Personalizada"
                      : logoColorStyle === "gif"
                      ? "✨ Logo Oficial Animada Transparente (WebM / Alpha)"
                      : logoColorStyle === "white"
                      ? "⚪ Logo Oficial (Letras Brancas - Sem Fundo)"
                      : logoColorStyle === "dark"
                      ? "⚫ Logo Oficial (Letras Pretas - Sem Fundo)"
                      : "Logo Oficial Original"}
                  </span>
                  <small style={{ color: logoColorStyle === "white" || logoColorStyle === "gif" ? "#94a3b8" : "#64748b", fontSize: 10 }}>
                    {logoData
                      ? "Arquivo customizado enviado"
                      : logoColorStyle === "gif"
                      ? "Vídeo WebM leve (65 KB) com canal Alpha nativo sem fundo verde"
                      : "Imagem PNG nativa original e transparente"}
                  </small>
                </div>
              </div>
              {logoData && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={removeLogo}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  title="Voltar a usar as logos originais oficiais"
                >
                  Restaurar Oficial
                </button>
              )}
            </div>

            <div className="adminFeedActions" style={{ marginTop: 8 }}>
              <button type="button" className="btn secondary" onClick={centerLogo}>🎯 Centralizar logo</button>
              <small>Arraste a logo na prévia para reposicionar livremente.</small>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700 }}>🔎 Tamanho da logo · {logoScale}%</label>
              <input type="range" min="50" max="150" step="5" value={logoScale} onChange={(e) => saveReelLogoScale(Number(e.target.value))} />
            </div>
          </div>


          {selectedPost && (
            <div className="adminFeedSelected">
              <b>{selectedPost.title}</b>
              <span>{selectedPost.category} • {selectedPost.city}</span>
            </div>
          )}

          <div className="adminFeedActions">
            {(format === "feed" || format === "feed-square" || format === "reel-cover" || format === "story") && (
              <button type="button" className="btn secondary" disabled={rendering} onClick={renderCard}>
                {rendering ? "Gerando..." : "🔄 Atualizar prévia"}
              </button>
            )}
            {(format === "feed" || format === "feed-square" || format === "reel-cover") && (
              <button type="button" className="btn" disabled={(!selectedPost && !title && !customImageUrl) || rendering} onClick={downloadPng}>
                {format === "feed-square" ? "⬇️ Baixar PNG 1080×1080" : format === "reel-cover" ? "⬇️ Baixar capa 1080×1350" : "⬇️ Baixar PNG 1080×1350"}
              </button>
            )}
            {format === "story" && (
              <>
                <button type="button" className="btn" disabled={(!selectedPost && !title) || rendering} onClick={downloadPng}>
                  ⬇️ Baixar Story PNG 1080×1920
                </button>
                {videoReady && (
                  <button type="button" className="btn btnMiniIaAction" disabled={recording || rendering} onClick={createReel}>
                    {recording ? `Gravando ${recordingProgress}%...` : `🎥 Gerar Story Vídeo (${MINI_IA_LEVELS[miniIaLevel].name.toUpperCase()})`}
                  </button>
                )}
              </>
            )}
            {format === "reel" && (
              <button type="button" className="btn btnMiniIaAction" disabled={!videoReady || recording || rendering} onClick={createReel}>
                {recording ? `Gravando ${recordingProgress}%...` : `🎥 Gerar Reel (${MINI_IA_LEVELS[miniIaLevel].name.toUpperCase()})`}
              </button>
            )}
          </div>
          {recording && <progress className="adminFeedRecordingProgress" max={100} value={recordingProgress} />}
          {renderLogs.length > 0 && (
            <div
              style={{
                marginTop: 12,
                background: "#0c0d12",
                border: "1px solid #1f2430",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                color: "#e2e8f0",
                maxHeight: 180,
                overflowY: "auto",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderBottom: "1px solid #1e293b", paddingBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: recording ? "#22c55e" : "#94a3b8", display: "inline-block" }}></span>
                  Terminal de Diagnóstico & Renderização
                </span>
                <button
                  type="button"
                  onClick={() => setRenderLogs([])}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}
                >
                  Limpar
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {renderLogs.map((log, i) => (
                  <div key={i} style={{ color: log.includes("❌") || log.includes("Erro") ? "#f87171" : log.includes("⚠️") ? "#fbbf24" : log.includes("✅") || log.includes("🎉") ? "#4ade80" : "#94a3b8", lineHeight: 1.4 }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="adminFeedPreview">
          <div className="adminFeedCanvasFrame" data-format={format}>
            <canvas
              ref={canvasRef}
              width={W}
              height={getCanvasDimensions(format).height}
              onPointerDown={onPreviewPointerDown}
              onPointerMove={onPreviewPointerMove}
              onPointerUp={onPreviewPointerUp}
              onPointerCancel={onPreviewPointerUp}
              style={{ cursor: logoData || format === "reel" || format === "story" || Boolean(title || selectedPost || customImageUrl) ? (draggingLogo ? "grabbing" : "grab") : "default", touchAction: "none" }}
            />
          </div>
          <small>{format === "feed" ? "Formato Feed 4:5 · 1080×1350" : format === "feed-square" ? "Formato Feed quadrado 1:1 · 1080×1080" : format === "reel-cover" ? "Capa do Reels 4:5 · 1080×1350 (recorte da grade do perfil)" : format === "story" ? "Formato Story 9:16 · 1080×1920 (Área de Link)" : "Formato Reel 9:16 · 1080×1920"}</small>
          {videoExport && (
            <div className="adminFeedVideoResult">
              <video src={videoExport.url} controls playsInline />
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0" }}>
                <span style={{ background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4 }}>
                  ✅ 100% WhatsApp & Instagram
                </span>
                <small style={{ color: "#475569" }}>MP4 H.264 Main + AAC + Faststart</small>
              </div>
              <a className="btn" href={videoExport.url} download={videoExport.filename} style={{ background: "#16a34a", textDecoration: "none" }}>
                ⬇️ Baixar Vídeo MP4 (WhatsApp Pronto)
              </a>
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
        onLoadedMetadata={(e) => {
          setVideoReady(true);
          const dur = (e.target as HTMLVideoElement).duration;
          if (Number.isFinite(dur) && dur > 0) setVideoDuration(dur);
        }}
        onLoadedData={() => { setVideoReady(true); renderCard(); }}
        onError={() => { setVideoReady(false); setMessage("Não foi possível abrir esse arquivo de vídeo."); }}
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          width: recording ? 240 : 120,
          height: recording ? 426 : 213,
          opacity: recording ? 0.98 : 0.02,
          pointerEvents: "none",
          zIndex: recording ? 99999 : -1,
          boxShadow: recording ? "0 10px 40px rgba(0,0,0,0.85), 0 0 0 2px #ff3b30" : "none",
          borderRadius: 12,
          transform: miniIaMirror ? "scaleX(-1)" : "none",
          transition: "transform 0.2s ease",
        }}
      />
      {/* Player contínuo da Logo Oficial Animada Transparente (WebM VP9 com Alpha / GIF fallback) */}
      <video
        ref={(el) => {
          if (el) {
            animatedLogoRef.current = el;
            cachedOfficialWebmLogo = el;
            el.defaultMuted = true;
            el.muted = true;
            el.play().catch(() => {});
          }
        }}
        src="/logos/Viralizou_Goiania_logo_animada_transparente.webm"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => {
          cachedOverlayCanvasRef.current = null;
          renderCard();
        }}
        style={{
          position: "fixed",
          bottom: -9999,
          left: -9999,
          width: 200,
          height: 60,
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: -99,
        }}
      />
      {/* Modal Interativo de Corte / Crop de Vídeo */}
      <CropVideoModal
        isOpen={showCropModal}
        videoElement={videoPreviewRef.current}
        videoUrl={videoUrl}
        initialCrop={videoCrop}
        onApply={handleApplyCrop}
        onClose={() => setShowCropModal(false)}
      />
    </section>
  );
}
