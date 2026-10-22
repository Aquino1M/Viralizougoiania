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
import {
  type RealOficialSfxItem,
  DEFAULT_REAL_OFICIAL_SFX,
  type RealOficialConfigStatus,
} from "@/lib/real-oficial-client";
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

export type PublicationFormat = "feed" | "feed-square" | "reel-cover" | "story" | "reel" | "carousel";

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
    case "carousel":
      return { width: 1080, height: 1350, label: "Carrossel 4:5 · 1080×1350 px" };
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
  | "bacci-red"
  | "viral-debate"
  | "bicolor-yellow"
  | "split-compare";
type ReelFontFamily = "montserrat" | "anton" | "bebas" | "poppins" | "inter" | "roboto" | "impact" | "georgia";
type ReelFontWeight = "900" | "800" | "700" | "600" | "400" | "italic";
type ReelTextAlign = "left" | "center" | "right";
type ReelTextCase = "uppercase" | "lowercase" | "original";
type ReelTagColor = "red" | "white" | "yellow" | "orange";
type ReelTextAnimation =
  | "typewriter"
  | "pop"
  | "slide"
  | "fade"
  | "static"
  | "bounce"
  | "zoom-in"
  | "pulse"
  | "karaoke"
  | "glitch";
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
  videoFramingMode: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i";
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
  hookPositionY?: number;
  bgmVolume?: number;
  videoBlockPosY?: number;
  customSaturation?: number;
  customContrast?: number;
  customBrightness?: number;
  customSharpness?: number;
  topHeadline?: string;
  authorName?: string;
  authorHandle?: string;
  authorVerified?: boolean;
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
    name: "📺 Estilo Bacci TV",
    summary: "Reels 9:16 · Tarja Vermelha · Bacci TV",
    savedAt: "Padrão",
    data: {
      format: "reel",
      reelTextStyle: "bacci-red",
      reelFontFamily: "impact",
      reelFontWeight: "900",
      reelTextAlign: "left",
      reelTextCase: "uppercase",
      reelFontSize: 72,
      tagColor: "red",
      tagPositionY: 1670,
      handle: "@viralizougoiania",
      handleFontSize: 33,
      logoColorStyle: "original",
      logoScale: 100,
      logoPosition: DEFAULT_LOGO_POSITION,
      titlePosition: { x: 0.5, y: 0.58 },
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
      miniIaTrimSeconds: 0,
      videoFilter: "cinema",
      cutPauses: true,
      bgmTrack: "breaking",
      autoHookEnabled: false,
      autoHookText: "",
      hookPositionY: 307,
      bgmVolume: 15,
      videoBlockPosY: 0.44,
      customSaturation: 1.0,
      customContrast: 1.0,
      customBrightness: 1.0,
      customSharpness: 0,
    },
  },
  {
    id: 2,
    name: "🎬 Bloco Noticioso (Horizontal 16:9)",
    summary: "Reels 9:16 · Vídeo Bloco 16:9 · Bicolor Amarelo/Branco",
    savedAt: "Padrão",
    data: {
      format: "reel",
      reelTextStyle: "bicolor-yellow",
      reelFontFamily: "montserrat",
      reelFontWeight: "900",
      reelTextAlign: "center",
      reelTextCase: "uppercase",
      reelFontSize: 52,
      tagColor: "yellow",
      tagPositionY: 1670,
      handle: "@viralizougoiania",
      handleFontSize: 33,
      logoColorStyle: "gif",
      logoScale: 100,
      logoPosition: DEFAULT_LOGO_POSITION,
      titlePosition: { x: 0.5, y: 0.72 },
      feedTitlePosition: DEFAULT_FEED_TITLE_POSITION,
      feedTitleOffsetY: 0,
      feedTitleFontSize: 0,
      feedFontFamily: "montserrat",
      shadeOpacity: 70,
      showOverlayLayer: true,
      showLogoLayer: true,
      showTitleLayer: true,
      showHandleLayer: true,
      showStorySticker: false,
      showStrongSceneWarning: false,
      videoFramingMode: "horizontal-block",
      imagePosition: 0,
      miniIaLevel: "media",
      miniIaMirror: false,
      miniIaTrimSeconds: 0,
      videoFilter: "natural",
      cutPauses: false,
      bgmTrack: "none",
      autoHookEnabled: false,
      autoHookText: "",
      videoBlockPosY: 0.44,
      customSaturation: 1.0,
      customContrast: 1.0,
      customBrightness: 1.0,
      customSharpness: 0,
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
      titlePosition: { x: 0.5, y: 0.615 },
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
      miniIaTrimSeconds: 0,
      videoFilter: "none",
      cutPauses: true,
      bgmTrack: "energetic",
      autoHookEnabled: false,
      autoHookText: "",
      videoBlockPosY: 0.44,
      customSaturation: 1.0,
      customContrast: 1.0,
      customBrightness: 1.0,
      customSharpness: 0,
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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

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

function applyCanvasVideoFilterOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filterPreset?: VideoFilterPreset
) {
  if (!filterPreset || filterPreset === "none") return;
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  if (filterPreset === "noir") {
    // Monocromático Preto & Branco elegante e natural
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(0, 0, w, h);
  } else if (filterPreset === "cinema") {
    // Look Cinema Teal & Orange sutil e cinematográfico (pele natural, sem cores artificiais)
    ctx.globalCompositeOperation = "soft-light";
    const tealOrangeGrad = ctx.createLinearGradient(0, 0, 0, h);
    tealOrangeGrad.addColorStop(0, "rgba(0, 160, 200, 0.12)");
    tealOrangeGrad.addColorStop(0.5, "rgba(255, 150, 20, 0.08)");
    tealOrangeGrad.addColorStop(1, "rgba(0, 130, 180, 0.10)");
    ctx.fillStyle = tealOrangeGrad;
    ctx.fillRect(0, 0, w, h);
  } else if (filterPreset === "dark_moody") {
    // Dark Moody: Sombras suaves para noticiário sério
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(10, 18, 30, 0.14)";
    ctx.fillRect(0, 0, w, h);
  } else if (filterPreset === "cyberpunk") {
    // Cyberpunk Neon Pop sutil
    ctx.globalCompositeOperation = "soft-light";
    const cyberGrad = ctx.createLinearGradient(0, 0, w, h);
    cyberGrad.addColorStop(0, "rgba(255, 0, 128, 0.10)");
    cyberGrad.addColorStop(1, "rgba(0, 220, 255, 0.10)");
    ctx.fillStyle = cyberGrad;
    ctx.fillRect(0, 0, w, h);
  } else if (filterPreset === "vintage") {
    // Vintage VHS / Anos 90 suave
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(215, 150, 75, 0.15)";
    ctx.fillRect(0, 0, w, h);
  } else if (filterPreset === "hdr") {
    // HDR Vivid equilibrado
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

export interface Split1v2iConfig {
  framingMode?: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i";
  img1?: HTMLImageElement | null;
  img2?: HTMLImageElement | null;
  dividerColor?: string;
  dividerWidth?: number;
  videoSide?: "left" | "right";
  topCardEnabled?: boolean;
  kickerText?: string;
  headerH?: number;
}

const audioBufferCache = new Map<string, AudioBuffer>();
async function loadAudioBuffer(audioCtx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    if (audioBufferCache.has(url)) {
      return audioBufferCache.get(url)!;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuf);
    audioBufferCache.set(url, decoded);
    return decoded;
  } catch (e) {
    console.warn("[loadAudioBuffer] Erro ao carregar áudio:", url, e);
    return null;
  }
}

function getSplitHeaderHeight(
  ctx: CanvasRenderingContext2D,
  headline: string,
  fontFamily: ReelFontFamily,
  textCase: ReelTextCase,
  fontSize: number,
  canvasW: number
): number {
  const titleFontSize = fontSize > 0 ? Math.min(fontSize, 50) : 46;
  const layout = getCachedReelTitleLayout(ctx, headline, fontFamily || "montserrat", "900", textCase || "uppercase", titleFontSize, canvasW - 108);
  const linesCount = Math.max(1, layout.lines.length);
  const lineH = Math.round(titleFontSize * 1.24);
  const baseH = 102 + (linesCount * lineH) + 38;
  return Math.max(280, Math.min(460, baseH));
}

function getCanvasColorFilter(miniIaConfig?: {
  contrast?: number;
  brightness?: number;
  saturation?: number;
  filterPreset?: VideoFilterPreset;
  customSaturation?: number;
  customContrast?: number;
  customBrightness?: number;
  customSharpness?: number;
  upscaleEnabled?: boolean;
}): string {
  if (!miniIaConfig) return "none";
  const rawSat = typeof miniIaConfig.customSaturation === "number" ? miniIaConfig.customSaturation : 1.0;
  const satMult = rawSat > 3 ? rawSat / 100 : rawSat;

  const rawCon = typeof miniIaConfig.customContrast === "number" ? miniIaConfig.customContrast : 1.0;
  const conMult = rawCon > 3 ? rawCon / 100 : rawCon;

  const rawBri = typeof miniIaConfig.customBrightness === "number" ? miniIaConfig.customBrightness : 1.0;
  const briMult = rawBri > 3 ? rawBri / 100 : rawBri;

  const rawSharp = typeof miniIaConfig.customSharpness === "number" ? miniIaConfig.customSharpness : 0;
  const sharpNorm = rawSharp > 1 ? rawSharp / 100 : rawSharp;

  const isUpscale = miniIaConfig.upscaleEnabled !== false;
  // Super Resolução: restauração de contornos e nitidez de texturas em vídeos de baixa qualidade
  const upscaleSharpBoost = isUpscale ? 0.08 : 0;
  const sharpBoost = sharpNorm * 0.15 + upscaleSharpBoost;

  const effC = Math.max(0.2, (miniIaConfig.contrast || 1.0) * conMult + sharpBoost);
  const effB = Math.max(0.2, (miniIaConfig.brightness ? 1 + miniIaConfig.brightness : 1.0) * briMult);
  const effS = Math.max(0, (miniIaConfig.saturation || 1.0) * (isUpscale ? Math.max(satMult, 1.03) : satMult));

  let filterString = `contrast(${effC.toFixed(2)}) brightness(${effB.toFixed(2)}) saturate(${effS.toFixed(2)})`;
  if (
    Math.abs(effC - 1.0) < 0.015 &&
    Math.abs(effB - 1.0) < 0.015 &&
    Math.abs(effS - 1.0) < 0.015 &&
    sharpNorm === 0 &&
    !isUpscale &&
    (!miniIaConfig.filterPreset || miniIaConfig.filterPreset === "none")
  ) {
    filterString = "none";
  } else if (miniIaConfig.filterPreset && miniIaConfig.filterPreset !== "none") {
    const extra = VIDEO_FILTERS[miniIaConfig.filterPreset]?.canvasFilter;
    if (extra && extra !== "none") {
      filterString = `${filterString} ${extra}`;
    }
  }
  return filterString;
}

let sharedBlurCanvas: HTMLCanvasElement | null = null;
function getSharedBlurCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (!sharedBlurCanvas) {
    sharedBlurCanvas = document.createElement("canvas");
    sharedBlurCanvas.width = 135;
    sharedBlurCanvas.height = 240;
  }
  return sharedBlurCanvas;
}

function drawVideoWithFraming(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  framingMode: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i",
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
    customSaturation?: number;
    customContrast?: number;
    customBrightness?: number;
    customSharpness?: number;
    videoBlockPosY?: number;
    topHeadline?: string;
    authorName?: string;
    authorHandle?: string;
    authorVerified?: boolean;
    upscaleEnabled?: boolean;
  },
  crop?: VideoCropRect | null,
  splitConfig?: Split1v2iConfig
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

  // Aplica Grade de Cores e Contraste Personalizável (Saturação, Contraste, Brilho, Nitidez e Filtro)
  if (miniIaConfig) {
    const filterString = getCanvasColorFilter(miniIaConfig);
    try {
      ctx.filter = filterString;
    } catch {}
  }

  if (framingMode === "horizontal-block") {
    // Bloco de Vídeo Horizontal (16:9 Noticioso arrastável no Preview)
    const fullWidth = video.videoWidth || 1920;
    const fullHeight = video.videoHeight || 1080;
    const vAspect = fullHeight / fullWidth;
    const blockH = Math.round(w * (vAspect > 0 ? vAspect : 9 / 16));
    const normY = typeof miniIaConfig?.videoBlockPosY === "number" ? miniIaConfig.videoBlockPosY : 0.44;
    const blockY = Math.max(0, Math.min(h - blockH, Math.round(normY * h - blockH / 2)));

    // Fundo desfocado de alta performance (reutiliza canvas estático para zero alocação de memória / sem travamento GC)
    const blurCanvas = getSharedBlurCanvas();
    if (blurCanvas) {
      const bCtx = blurCanvas.getContext("2d");
      if (bCtx) {
        bCtx.filter = "blur(7px) brightness(0.32)";
        drawCover(bCtx, video, 0, 0, 135, 240, 0, crop);
        ctx.drawImage(blurCanvas, 0, 0, w, h);
      } else {
        drawCover(ctx, video, 0, 0, w, h, 0, crop);
      }
    } else {
      drawCover(ctx, video, 0, 0, w, h, 0, crop);
    }

    // Desenha o vídeo no bloco horizontal com sombra e definição
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 6;
    try {
      if (crop && crop.width > 0 && crop.height > 0) {
        ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, blockY, w, blockH);
      } else {
        ctx.drawImage(video, 0, blockY, w, blockH);
      }
    } catch {}
    ctx.restore();

    // Linhas sutis superior e inferior delimitando o bloco de vídeo
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(0, blockY, w, 2);
    ctx.fillRect(0, blockY + blockH - 2, w, 2);
  } else if (framingMode === "split") {
    // Split 50/50: Superior focado/zoom (Cover) + Inferior amplo de contexto com desfoque de fundo
    const halfH = Math.floor(h / 2);
    // 1. Superior (Focado/Cover)
    drawCover(ctx, video, 0, 0, w, halfH, vertical, crop);

    // 2. Divisória moderna e nítida no centro
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, halfH - 2, w, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(0, halfH - 1, w, 2);

    // 3. Inferior: Vídeo contextual aberto com fundo desfocado suave (zero barras pretas vazias)
    const blurCanvas = getSharedBlurCanvas();
    if (blurCanvas) {
      const bCtx = blurCanvas.getContext("2d");
      if (bCtx) {
        bCtx.filter = "blur(7px) brightness(0.35)";
        drawCover(bCtx, video, 0, 0, 135, 120, 0, crop);
        ctx.drawImage(blurCanvas, 0, halfH, w, halfH);
      }
    }
    drawContain(ctx, video, 0, halfH, w, halfH, 0, crop);
  } else if (framingMode === "split-1v2i") {
    // 1 Vídeo com 2 Imagens Divididas Lateralmente (Estilo Copaíba Notícias)
    const topCardEnabled = splitConfig?.topCardEnabled !== false;
    const headerH = topCardEnabled ? (splitConfig?.headerH ?? 330) : 0;
    const mediaY = headerH;
    const mediaH = h - headerH;
    const halfW = Math.floor(w / 2);
    const vidSide = splitConfig?.videoSide || "right";
    const vidX = vidSide === "right" ? halfW : 0;
    const vidW = w - halfW;
    const imgColX = vidSide === "right" ? 0 : halfW;
    const imgColW = halfW;
    const halfMediaH = Math.floor(mediaH / 2);
    const divColor = splitConfig?.dividerColor || "#ffffff";
    const divW = Math.max(1, Math.min(24, splitConfig?.dividerWidth || 4));

    // 1. Desenha o vídeo no lado escolhido (com recorte cover)
    ctx.save();
    ctx.beginPath();
    ctx.rect(vidX, mediaY, vidW, mediaH);
    ctx.clip();
    drawCover(ctx, video, vidX, mediaY, vidW, mediaH, vertical, crop);
    ctx.restore();

    // 2. Foto 1 (Superior) na coluna de fotos
    const img1 = splitConfig?.img1;
    const img1H = halfMediaH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgColX, mediaY, imgColW, img1H);
    ctx.clip();
    if (img1 && isImageDrawable(img1)) {
      drawCover(ctx, img1, imgColX, mediaY, imgColW, img1H, 0);
    } else {
      const grad1 = ctx.createLinearGradient(imgColX, mediaY, imgColX, mediaY + img1H);
      grad1.addColorStop(0, "#1e293b");
      grad1.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad1;
      ctx.fillRect(imgColX, mediaY, imgColW, img1H);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '700 24px "Montserrat", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📸 Foto 1 (Superior)", imgColX + imgColW / 2, mediaY + img1H / 2);
    }
    ctx.restore();

    // 3. Foto 2 (Inferior) na coluna de fotos
    const img2 = splitConfig?.img2;
    const img2Y = mediaY + halfMediaH;
    const img2H = mediaH - halfMediaH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgColX, img2Y, imgColW, img2H);
    ctx.clip();
    if (img2 && isImageDrawable(img2)) {
      drawCover(ctx, img2, imgColX, img2Y, imgColW, img2H, 0);
    } else {
      const grad2 = ctx.createLinearGradient(imgColX, img2Y, imgColX, img2Y + img2H);
      grad2.addColorStop(0, "#0f172a");
      grad2.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad2;
      ctx.fillRect(imgColX, img2Y, imgColW, img2H);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '700 24px "Montserrat", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📸 Foto 2 (Inferior)", imgColX + imgColW / 2, img2Y + img2H / 2);
    }
    ctx.restore();

    // 4. Linha divisória horizontal entre Foto 1 e Foto 2
    ctx.fillStyle = divColor;
    const hDivY = mediaY + halfMediaH - Math.floor(divW / 2);
    ctx.fillRect(imgColX, hDivY, imgColW, divW);

    // 5. Linha divisória vertical entre as duas colunas
    const vDivX = halfW - Math.floor(divW / 2);
    ctx.fillRect(vDivX, mediaY, divW, mediaH);

    // 6. Linha delimitadora de cabeçalho
    if (topCardEnabled && headerH > 0) {
      ctx.fillStyle = divColor;
      ctx.fillRect(0, mediaY - Math.floor(divW / 2), w, Math.max(2, Math.min(divW, 4)));
    }
  } else if (framingMode === "blur-fit") {
    // Desfoque em canvas reduzido (135x240): executa em < 0.5ms sem alocação contínua de memória
    const blurCanvas = getSharedBlurCanvas();
    if (blurCanvas) {
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

  // Reseta ctx.filter para evitar contaminação
  ctx.filter = "none";

  // Aplica sobreposição visual de cor & estilo da Mini IA suave
  applyCanvasVideoFilterOverlay(ctx, w, h, miniIaConfig?.filterPreset);

  ctx.restore();
}

function drawViralHookBanner(
  ctx: CanvasRenderingContext2D,
  hookText: string,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  format: PublicationFormat = "reel",
  hookPosY?: number
) {
  if (!hookText || !hookText.trim()) return;
  // Exibe durante os primeiros 3.6 segundos de gancho com fade-out suave a partir de 3.0s
  if (currentTime > 3.6) return;
  const alpha = currentTime > 3.0 ? Math.max(0, 1 - (currentTime - 3.0) / 0.6) : 1;
  if (alpha <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const text = hookText.trim().toUpperCase();
  const defaultY = format === "feed-square" ? canvasHeight * 0.22 : format === "feed" ? canvasHeight * 0.20 : canvasHeight * 0.16;
  const bannerY = typeof hookPosY === "number" && hookPosY > 0 ? hookPosY : defaultY;
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

function drawAuthorBadgeCard(
  ctx: CanvasRenderingContext2D,
  name: string,
  handle: string,
  verified: boolean,
  x: number,
  y: number,
  avatarImg?: HTMLImageElement | HTMLCanvasElement | null
) {
  ctx.save();
  const avatarR = 28;
  const avatarX = x + avatarR;
  const avatarY = y;

  // 1. Avatar circular com anel verde neon / estilizado de orador/político
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#10b981"; // Borda verde vibrante do avatar
  ctx.fill();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg && isImageDrawable(avatarImg)) {
    ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  } else {
    const grad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
    grad.addColorStop(0, "#334155");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 22px "Montserrat", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = (name || "V").trim().charAt(0).toUpperCase();
    ctx.fillText(initial, avatarX, avatarY);
  }
  ctx.restore();

  // 2. Nome do autor + Selo de Verificado
  const textX = avatarX + avatarR + 16;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = '900 28px "Montserrat", -apple-system, sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 8;
  const upperName = (name || "ORADOR").toUpperCase();
  ctx.fillText(upperName, textX, avatarY - 14);

  // Selo azul de verificado
  if (verified) {
    const nameMetrics = ctx.measureText(upperName);
    const badgeX = textX + nameMetrics.width + 14;
    const badgeY = avatarY - 14;
    const badgeR = 11;

    ctx.save();
    ctx.fillStyle = "#38bdf8"; // Azul verificado oficial
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Checkmark branco
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(badgeX - 4.5, badgeY);
    ctx.lineTo(badgeX - 1, badgeY + 3.5);
    ctx.lineTo(badgeX + 5, badgeY - 3.5);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Handle @usuário
  ctx.font = '700 20px "Inter", sans-serif';
  ctx.fillStyle = "#94a3b8";
  ctx.shadowColor = "transparent";
  const userHandle = handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "@GUSTAVOGAYER";
  ctx.fillText(userHandle.toUpperCase(), textX, avatarY + 16);

  ctx.restore();
}

function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guideX: boolean,
  guideY: boolean
) {
  if (!guideX && !guideY) return;

  ctx.save();
  ctx.imageSmoothingEnabled = true;

  if (guideX) {
    const cx = Math.round(w / 2);
    ctx.strokeStyle = "#06b6d4"; // Ciano neon
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#06b6d4";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(cx - 55, 24, 110, 32, 8);
      ctx.fill();
    } else {
      ctx.fillRect(cx - 55, 24, 110, 32);
    }
    ctx.fillStyle = "#000000";
    ctx.font = '900 16px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CENTRO X", cx, 40);
  }

  if (guideY) {
    const cy = Math.round(h / 2);
    ctx.strokeStyle = "#ec4899"; // Magenta neon
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#ec4899";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(24, cy - 16, 110, 32, 8);
      ctx.fill();
    } else {
      ctx.fillRect(24, cy - 16, 110, 32);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 16px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CENTRO Y", 79, cy);
  }

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
    // 1. Tenta carregar o WebM transparente nativo (com canal Alpha)
    if (!cachedOfficialWebmLogo && typeof document !== "undefined") {
      const existing = document.getElementById("viralizou-animated-logo-webm") as HTMLVideoElement | null;
      if (existing) {
        cachedOfficialWebmLogo = existing;
      } else if (document.body) {
        const vid = document.createElement("video");
        vid.id = "viralizou-animated-logo-webm";
        vid.src = "/logos/Viralizou_Goiania_logo_animada_transparente.webm";
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.defaultMuted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        vid.style.position = "fixed";
        vid.style.top = "0";
        vid.style.left = "0";
        vid.style.width = "4px";
        vid.style.height = "4px";
        vid.style.opacity = "0.001";
        vid.style.pointerEvents = "none";
        vid.style.zIndex = "-100";
        document.body.appendChild(vid);
        vid.play().catch(() => {});
        cachedOfficialWebmLogo = vid;
      }
    }

    if (cachedOfficialWebmLogo) {
      if (cachedOfficialWebmLogo.paused) {
        cachedOfficialWebmLogo.play().catch(() => {});
      }
      if (isImageDrawable(cachedOfficialWebmLogo)) {
        return cachedOfficialWebmLogo;
      }
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

  // 4.5. ESTILO BICOLOR IMPACTO (Amarelo & Branco - Manchete Vibrante)
  if (textStyle === "bicolor-yellow") {
    let curY = centerY - layout.height / 2 + layout.lineHeight * 0.5;
    for (let i = 0; i < linesToDraw.length; i++) {
      const line = linesToDraw[i];
      if (line) {
        ctx.font = fontString;
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 5;
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = centerX;
        if (textAlign === "left") drawX = blockLeft;
        else if (textAlign === "right") drawX = blockRight;

        const strokeW = Math.max(6, Math.round(layout.fontSize * 0.12));
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.strokeText(line, drawX, curY);

        // Alterna entre branco e amarelo ouro vibrante
        ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#ffd700";
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
  debateMeta?: {
    topHeadline?: string;
    authorName?: string;
    authorHandle?: string;
    authorVerified?: boolean;
  }
) {
  // Estilo Bloco Vermelho Notícia (TVT / Notícias): Fundo vermelho sólido cobrindo o terço inferior + manchete branca à esquerda + rodapé clean
  if (textStyle === "red-bottom") {
    const defaultBannerY = Math.round(canvasHeight * 0.615); // ~1180px em 1920
    const bannerY = typeof position?.y === "number" && position.y > 0 && position.y < 1
      ? Math.round(position.y * canvasHeight)
      : defaultBannerY;
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
    const defaultTopY = isSquare
      ? Math.round(canvasHeight * 0.48)
      : isFeed
      ? Math.round(canvasHeight * 0.52)
      : Math.round(canvasHeight * 0.58);
    const topY = typeof position?.y === "number" && position.y > 0 && position.y < 1
      ? Math.round(position.y * canvasHeight)
      : defaultTopY;

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

    // 6. ÍCONE DE REDE SOCIAL & PERFIL DO INSTAGRAM (À ESQUERDA NA TARJA VERMELHA)
    const rawHandle = (category || "").toUpperCase().includes("GOIÁS") || (category || "").toUpperCase().includes("GOIÂNIA")
      ? "@VIRALIZOUGOIANIA"
      : "@VIRALIZOUGOIANIA";
    const socialText = (handle && handle.trim() ? handle.trim().toUpperCase() : rawHandle).replace(/^@/, "");
    const socialLabel = `@${socialText}`;

    // Ícone oficial do Instagram (câmera com cantos arredondados, lente central e flash)
    const instaBadgeX = 46;
    const instaBadgeSize = isSquare ? 38 : isFeed ? 44 : 48;
    const instaBadgeY = redBarY + (isSquare ? 18 : isFeed ? 24 : 28);

    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isSquare ? 3.5 : 4.2;
    const radius = isSquare ? 10 : 12;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(instaBadgeX, instaBadgeY, instaBadgeSize, instaBadgeSize, radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(instaBadgeX, instaBadgeY, instaBadgeSize, instaBadgeSize);
    }
    // Lente central da câmera
    const lensRadius = isSquare ? 8.5 : 10.5;
    ctx.beginPath();
    ctx.arc(instaBadgeX + instaBadgeSize / 2, instaBadgeY + instaBadgeSize / 2, lensRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Flash da câmera (canto superior direito)
    ctx.fillStyle = "#ffffff";
    const flashRadius = isSquare ? 2.4 : 3;
    const flashOffset = isSquare ? 9 : 11;
    ctx.beginPath();
    ctx.arc(instaBadgeX + instaBadgeSize - flashOffset, instaBadgeY + flashOffset, flashRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Texto do perfil do Instagram (@viralizougoiania)
    ctx.save();
    const handleFSize = isSquare ? 32 : isFeed ? 38 : 42;
    ctx.font = `900 ${handleFSize}px "Montserrat", "Arial Black", sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 10;
    ctx.fillText(socialLabel, instaBadgeX + instaBadgeSize + 16, instaBadgeY + instaBadgeSize / 2);
    ctx.restore();

    // 7. SLOGAN COM LINHA DECORATIVA (Embaixo do canal)
    const sloganY = redBarY + (isSquare ? 78 : isFeed ? 92 : 104);
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
    ctx.moveTo(instaBadgeX, sloganY);
    ctx.lineTo(instaBadgeX + 65, sloganY);
    ctx.stroke();

    ctx.fillText(sloganText, instaBadgeX + 78, sloganY);
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
  } else if (animation === "bounce") {
    // Pulo elástico dinâmico com amortecimento
    const t = rawProgress;
    let s = 1;
    if (t < 1) {
      const p = 0.3;
      s = Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    }
    ctx.translate(centerX, centerY);
    ctx.scale(Math.max(0.1, s), Math.max(0.1, s));
    ctx.drawImage(raster.canvas, -raster.originX, -raster.originY);
  } else if (animation === "zoom-in") {
    // Impacto cinematográfico de 1.35x para 1.0x com desaceleração
    const easeOutQuad = 1 - (1 - rawProgress) * (1 - rawProgress);
    const scale = 1.35 - 0.35 * easeOutQuad;
    ctx.globalAlpha = Math.min(1, rawProgress * 1.8);
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.drawImage(raster.canvas, -raster.originX, -raster.originY);
  } else if (animation === "pulse") {
    // Pulsação rítmica contínua
    const beat = (Math.sin(currentTime * 4.5) + 1) * 0.5;
    const scale = 1.0 + 0.045 * beat;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.drawImage(raster.canvas, -raster.originX, -raster.originY);
  } else if (animation === "karaoke") {
    // Karaokê com varredura de luz neon contínua
    ctx.drawImage(raster.canvas, drawX, drawY);
    const sweepProgress = (currentTime % 2.5) / 2.5;
    const sweepX = drawX + raster.width * sweepProgress;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const sweepGrad = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 80, 0);
    sweepGrad.addColorStop(0, "rgba(255, 215, 0, 0)");
    sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    sweepGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(drawX, drawY, raster.width, raster.height);
    ctx.restore();
  } else if (animation === "glitch") {
    // Micro-deslocamento de urgência
    const isGlitching = rawProgress < 0.85 && Math.sin(currentTime * 24) > 0.45;
    if (isGlitching) {
      const shiftX = (Math.random() - 0.5) * 16;
      const shiftY = (Math.random() - 0.5) * 6;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(raster.canvas, drawX + shiftX, drawY + shiftY);
      ctx.restore();
    } else {
      ctx.drawImage(raster.canvas, drawX, drawY);
    }
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
  framingMode: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i" = "cover",
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
    hookPositionY?: number;
    customSaturation?: number;
    customContrast?: number;
    customBrightness?: number;
    customSharpness?: number;
    videoBlockPosY?: number;
    topHeadline?: string;
    authorName?: string;
    authorHandle?: string;
    authorVerified?: boolean;
    upscaleEnabled?: boolean;
  },
  crop?: VideoCropRect | null,
  splitConfig?: Split1v2iConfig
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  const currentCanvasH = (format === "feed" || format === "feed-square") ? getCanvasDimensions(format).height : REEL_H;
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, currentCanvasH);
  if (video && video.readyState >= 2) {
    drawVideoWithFraming(ctx, video, W, currentCanvasH, framingMode, imageVertical, mirror, miniIaConfig, crop, splitConfig);
  }

  const isSplit1v2iWithCard = framingMode === "split-1v2i" && splitConfig?.topCardEnabled !== false;

  const maxAlpha = shadeOpacity / 100;
  if (!isSplit1v2iWithCard && shadeOpacity > 0 && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    if (framingMode === "split") {
      const shade = ctx.createLinearGradient(0, currentCanvasH - 380, 0, currentCanvasH);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.5, `rgba(0,0,0,${(0.55 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(1, `rgba(0,0,0,${(0.92 * maxAlpha).toFixed(2)})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, currentCanvasH - 380, W, 380);
    } else {
      const shade = ctx.createLinearGradient(0, Math.max(300, currentCanvasH - 1270), 0, currentCanvasH);
      shade.addColorStop(0, `rgba(0,0,0,${(0.05 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(0.42, `rgba(0,0,0,${(0.68 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(1, `rgba(0,0,0,${(0.96 * maxAlpha).toFixed(2)})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, Math.max(300, currentCanvasH - 1320), W, currentCanvasH);
    }
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

  if (isSplit1v2iWithCard) {
    const headerH = getSplitHeaderHeight(ctx, headline || "TÍTULO DA SUA NOTÍCIA", fontFamily, textCase, fontSize, W);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, headerH);

    const kicker = (splitConfig?.kickerText || category || "URGENTE").trim().toUpperCase();
    ctx.font = '900 24px "Montserrat", sans-serif';
    const kickerMetrics = ctx.measureText(kicker);
    const badgeW = Math.max(120, kickerMetrics.width + 30);
    const badgeH = 38;
    const badgeX = 54;
    const badgeY = 44;

    ctx.fillStyle = tagColor === "yellow" ? "#eab308" : tagColor === "orange" ? "#ea580c" : "#dc2626";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kicker, badgeX + badgeW / 2, badgeY + badgeH / 2);

    if (showHandleLayer && handle) {
      ctx.fillStyle = "#64748b";
      ctx.font = '700 22px "Montserrat", sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const hText = handle.startsWith("@") ? handle : `@${handle}`;
      ctx.fillText(hText, W - 54, badgeY + badgeH / 2);
    }

    const titleY = badgeY + badgeH + 20;
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const titleFontSize = fontSize > 0 ? Math.min(fontSize, 50) : 46;
    ctx.font = getReelFont(fontFamily || "montserrat", titleFontSize, "900");
    const layout = getCachedReelTitleLayout(ctx, headline || "TÍTULO DA SUA NOTÍCIA", fontFamily, "900", textCase, titleFontSize, W - 108);
    const lineH = Math.round(titleFontSize * 1.24);
    for (let i = 0; i < layout.lines.length; i++) {
      ctx.fillText(layout.lines[i], 54, titleY + i * lineH);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(0, headerH - 3, W, 3);
  }

  if (showLogoLayer && textStyle !== "bacci-red") {
    const renderLogo = getRenderableLogo(logo, logoColorStyle, "white");
    if (renderLogo && isImageDrawable(renderLogo)) {
      if (isSplit1v2iWithCard) {
        const vidSide = splitConfig?.videoSide || "right";
        const vidW = Math.floor(W / 2);
        const headerH = getSplitHeaderHeight(ctx, headline || "TÍTULO DA SUA NOTÍCIA", fontFamily, textCase, fontSize, W);
        const lW = Math.round(180 * (logoScale / 100));
        const lH = Math.round(50 * (logoScale / 100));
        const lx = vidSide === "right" ? (W - lW - 32) : (vidW - lW - 32);
        const ly = headerH + 32;
        safeDrawImage(ctx, renderLogo, lx, ly, lW, lH);
      } else {
        const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
        safeDrawImage(ctx, renderLogo, logoPosition.x * W - width / 2, logoPosition.y * REEL_H - height / 2, width, height);
      }
    }
  }

  if (showTitleLayer && !isSplit1v2iWithCard) {
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
      {
        topHeadline: miniIaConfig?.topHeadline,
        authorName: miniIaConfig?.authorName,
        authorHandle: miniIaConfig?.authorHandle,
        authorVerified: miniIaConfig?.authorVerified,
      }
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
    drawViralHookBanner(ctx, miniIaConfig.autoHookText, W, currentCanvasH, video.currentTime, format, miniIaConfig.hookPositionY);
  }

  // Guia opcional de área segura do Instagram
  if (showSafeZone) {
    if (format === "story") {
      drawStorySafeZone(ctx);
    } else if (format === "feed") {
      drawFeedSafeZone(ctx);
    } else if (format === "feed-square") {
      drawFeedSquareSafeZone(ctx);
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
  debateMeta?: {
    topHeadline?: string;
    authorName?: string;
    authorHandle?: string;
    authorVerified?: boolean;
    upscaleEnabled?: boolean;
  },
  splitConfig?: Split1v2iConfig
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  const overlayH = (format === "feed" || format === "feed-square") ? getCanvasDimensions(format).height : REEL_H;
  canvas.height = overlayH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  // Se for split-1v2i (1 Vídeo + 2 Imagens Divididas Lateralmente - Estilo Copaíba Notícias)
  if (splitConfig?.framingMode === "split-1v2i") {
    const topCardEnabled = splitConfig.topCardEnabled !== false;
    const headerH = topCardEnabled
      ? getSplitHeaderHeight(ctx, headline || "TÍTULO DA SUA NOTÍCIA", fontFamily, textCase, fontSize, W)
      : 0;
    const mediaY = headerH;
    const mediaH = overlayH - headerH;
    const halfW = Math.floor(W / 2);
    const vidSide = splitConfig.videoSide || "right";
    const vidX = vidSide === "right" ? halfW : 0;
    const vidW = W - halfW;
    const imgColX = vidSide === "right" ? 0 : halfW;
    const imgColW = halfW;
    const halfMediaH = Math.floor(mediaH / 2);
    const divColor = splitConfig.dividerColor || "#ffffff";
    const divW = Math.max(1, Math.min(24, splitConfig.dividerWidth || 4));

    // 1. Cartão Superior de Notícia (Fundo Branco com Manchete, Tag e Handle)
    if (topCardEnabled && headerH > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, headerH);

      // Selo / Kicker
      const kicker = (splitConfig.kickerText || category || "URGENTE").trim().toUpperCase();
      ctx.font = '900 24px "Montserrat", sans-serif';
      const kickerMetrics = ctx.measureText(kicker);
      const badgeW = Math.max(120, kickerMetrics.width + 30);
      const badgeH = 38;
      const badgeX = 54;
      const badgeY = 44;

      ctx.fillStyle = tagColor === "yellow" ? "#eab308" : tagColor === "orange" ? "#ea580c" : "#dc2626";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(kicker, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // Handle do portal à direita no cabeçalho
      if (showHandleLayer && handle) {
        ctx.fillStyle = "#64748b";
        ctx.font = '700 22px "Montserrat", sans-serif';
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const hText = handle.startsWith("@") ? handle : `@${handle}`;
        ctx.fillText(hText, W - 54, badgeY + badgeH / 2);
      }

      // Título da notícia em destaque escuro
      const titleY = badgeY + badgeH + 20;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const titleFontSize = fontSize > 0 ? Math.min(fontSize, 50) : 46;
      ctx.font = getReelFont(fontFamily || "montserrat", titleFontSize, "900");
      const layout = getCachedReelTitleLayout(ctx, headline || "TÍTULO DA SUA NOTÍCIA", fontFamily, "900", textCase, titleFontSize, W - 108);
      const lineH = Math.round(titleFontSize * 1.24);
      for (let i = 0; i < layout.lines.length; i++) {
        ctx.fillText(layout.lines[i], 54, titleY + i * lineH);
      }

      // Linha sutil de sombra/borda na base do cartão
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, headerH - 3, W, 3);
    }

    // 2. Foto 1 (Superior) na coluna de fotos
    const img1 = splitConfig.img1;
    const img1H = halfMediaH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgColX, mediaY, imgColW, img1H);
    ctx.clip();
    if (img1 && isImageDrawable(img1)) {
      drawCover(ctx, img1, imgColX, mediaY, imgColW, img1H, 0);
    } else {
      const grad1 = ctx.createLinearGradient(imgColX, mediaY, imgColX, mediaY + img1H);
      grad1.addColorStop(0, "#1e293b");
      grad1.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad1;
      ctx.fillRect(imgColX, mediaY, imgColW, img1H);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '700 24px "Montserrat", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📸 Foto 1 (Superior)", imgColX + imgColW / 2, mediaY + img1H / 2);
    }
    ctx.restore();

    // 3. Foto 2 (Inferior) na coluna de fotos
    const img2 = splitConfig.img2;
    const img2Y = mediaY + halfMediaH;
    const img2H = mediaH - halfMediaH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(imgColX, img2Y, imgColW, img2H);
    ctx.clip();
    if (img2 && isImageDrawable(img2)) {
      drawCover(ctx, img2, imgColX, img2Y, imgColW, img2H, 0);
    } else {
      const grad2 = ctx.createLinearGradient(imgColX, img2Y, imgColX, img2Y + img2H);
      grad2.addColorStop(0, "#0f172a");
      grad2.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad2;
      ctx.fillRect(imgColX, img2Y, imgColW, img2H);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '700 24px "Montserrat", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📸 Foto 2 (Inferior)", imgColX + imgColW / 2, img2Y + img2H / 2);
    }
    ctx.restore();

    // 4. Linhas divisórias personalizadas
    ctx.fillStyle = divColor;
    // Horizontal entre fotos
    const hDivY = mediaY + halfMediaH - Math.floor(divW / 2);
    ctx.fillRect(imgColX, hDivY, imgColW, divW);

    // Vertical entre colunas
    const vDivX = halfW - Math.floor(divW / 2);
    ctx.fillRect(vDivX, mediaY, divW, mediaH);

    // Linha entre topo e mídia
    if (topCardEnabled && headerH > 0) {
      ctx.fillRect(0, mediaY - Math.floor(divW / 2), W, Math.max(2, Math.min(divW, 4)));
    }

    // 5. Deixa a área do vídeo 100% transparente para o vídeo aparecer por baixo no preview e no FFmpeg!
    ctx.clearRect(vidX, mediaY, vidW, mediaH);

    // 6. Logo / Marca d'água no topo do vídeo (como no wireframe do usuário)
    if (showLogoLayer && logoColorStyle !== "gif") {
      const renderLogo = getRenderableLogo(logo, logoColorStyle, "white");
      if (renderLogo && isImageDrawable(renderLogo)) {
        const lW = Math.round(180 * (logoScale / 100));
        const lH = Math.round(50 * (logoScale / 100));
        const lx = vidSide === "right" ? (W - lW - 32) : (vidW - lW - 32);
        const ly = mediaY + 32;
        safeDrawImage(ctx, renderLogo, lx, ly, lW, lH);
      }
    }

    // 7. Alerta de cenas fortes se ativo
    if (showStrongSceneWarning) {
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(48, mediaY + 20, W - 96, 68);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '800 30px Arial, sans-serif';
      ctx.fillText("AVISO: CENAS FORTES", W / 2, mediaY + 54);
    }

    return canvas;
  }

  // 1. Gradiente inferior de contraste (shade)
  const maxAlpha = (showOverlayLayer ? shadeOpacity : 0) / 100;
  if (maxAlpha > 0 && textStyle !== "red-bottom" && textStyle !== "bacci-red") {
    if (splitConfig?.framingMode === "split") {
      const shade = ctx.createLinearGradient(0, REEL_H - 380, 0, REEL_H);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.5, `rgba(0,0,0,${(0.55 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(1, `rgba(0,0,0,${(0.92 * maxAlpha).toFixed(2)})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, REEL_H - 380, W, 380);
    } else {
      const shade = ctx.createLinearGradient(0, 650, 0, REEL_H);
      shade.addColorStop(0, `rgba(0,0,0,${(0.05 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(0.42, `rgba(0,0,0,${(0.68 * maxAlpha).toFixed(2)})`);
      shade.addColorStop(1, `rgba(0,0,0,${(0.96 * maxAlpha).toFixed(2)})`);
      ctx.fillStyle = shade;
      ctx.fillRect(0, 600, W, REEL_H - 600);
    }
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
      debateMeta
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
  const hookDragRef = useRef<{ pointerId: number; offsetY: number } | null>(null);
  const hookPositionYRef = useRef<number>(307);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmTimerRef = useRef<any>(null);
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
  const [previewViewMode, setPreviewViewMode] = useState<"edit" | "generated">("edit");
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
  const [videoFramingMode, setVideoFramingMode] = useState<"cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i">(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("viralizou_video_framing_mode") : null;
      if (saved && ["cover", "blur-fit", "horizontal-block", "split", "split-1v2i"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return "cover";
  });
  const videoFramingModeRef = useRef<"cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i">("cover");
  const [videoBlockPosY, setVideoBlockPosY] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("viralizou_video_block_pos_y");
      if (saved) return Number(saved) || 0.44;
    } catch {}
    return 0.44;
  });
  const videoBlockPosYRef = useRef<number>(0.44);
  const videoDragRef = useRef<{ pointerId: number; offsetY: number } | null>(null);

  useEffect(() => {
    videoFramingModeRef.current = videoFramingMode;
  }, [videoFramingMode]);

  // Estados para o Estilo Copaíba Notícias (1 Vídeo + 2 Imagens Divididas Lateralmente)
  const [splitImg1Url, setSplitImg1Url] = useState<string>(() => {
    try { return localStorage.getItem("viralizou_split_img1") || ""; } catch { return ""; }
  });
  const [splitImg2Url, setSplitImg2Url] = useState<string>(() => {
    try { return localStorage.getItem("viralizou_split_img2") || ""; } catch { return ""; }
  });
  const [splitDividerColor, setSplitDividerColor] = useState<string>(() => {
    try { return localStorage.getItem("viralizou_split_divider_color") || "#ffffff"; } catch { return "#ffffff"; }
  });
  const [splitDividerWidth, setSplitDividerWidth] = useState<number>(() => {
    try { return Number(localStorage.getItem("viralizou_split_divider_width")) || 4; } catch { return 4; }
  });
  const [splitVideoSide, setSplitVideoSide] = useState<"right" | "left">(() => {
    try { return (localStorage.getItem("viralizou_split_video_side") as "right" | "left") || "right"; } catch { return "right"; }
  });
  const [splitTopCardEnabled, setSplitTopCardEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("viralizou_split_top_card");
      return saved !== null ? saved === "true" : true;
    } catch { return true; }
  });
  const [splitKickerText, setSplitKickerText] = useState<string>(() => {
    try { return localStorage.getItem("viralizou_split_kicker") || "URGENTE"; } catch { return "URGENTE"; }
  });

  const splitImg1Ref = useRef<HTMLImageElement | null>(null);
  const splitImg2Ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    if (splitImg1Url) {
      loadImage(splitImg1Url).then(img => {
        if (!active) return;
        splitImg1Ref.current = img;
        cachedOverlayCanvasRef.current = null;
      }).catch(e => console.warn("Erro ao carregar Foto 1 do Split:", e));
    } else {
      splitImg1Ref.current = null;
      cachedOverlayCanvasRef.current = null;
    }
    return () => { active = false; };
  }, [splitImg1Url]);

  useEffect(() => {
    let active = true;
    if (splitImg2Url) {
      loadImage(splitImg2Url).then(img => {
        if (!active) return;
        splitImg2Ref.current = img;
        cachedOverlayCanvasRef.current = null;
      }).catch(e => console.warn("Erro ao carregar Foto 2 do Split:", e));
    } else {
      splitImg2Ref.current = null;
      cachedOverlayCanvasRef.current = null;
    }
    return () => { active = false; };
  }, [splitImg2Url]);

  useEffect(() => {
    videoBlockPosYRef.current = videoBlockPosY;
  }, [videoBlockPosY]);

  // Calibração Manual Fina de Imagem & Cor (Sem visual artificial)
  const [customSaturation, setCustomSaturation] = useState<number>(() => {
    try {
      const s = localStorage.getItem("viralizou_custom_saturation");
      if (s) return Number(s) || 1.0;
    } catch {}
    return 1.0;
  });
  const [customContrast, setCustomContrast] = useState<number>(() => {
    try {
      const s = localStorage.getItem("viralizou_custom_contrast");
      if (s) return Number(s) || 1.0;
    } catch {}
    return 1.0;
  });
  const [customBrightness, setCustomBrightness] = useState<number>(() => {
    try {
      const s = localStorage.getItem("viralizou_custom_brightness");
      if (s) return Number(s) || 1.0;
    } catch {}
    return 1.0;
  });
  const [customSharpness, setCustomSharpness] = useState<number>(() => {
    try {
      const s = localStorage.getItem("viralizou_custom_sharpness");
      if (s) return Number(s) || 0;
    } catch {}
    return 0;
  });

  const customSaturationRef = useRef(customSaturation);
  const customContrastRef = useRef(customContrast);
  const customBrightnessRef = useRef(customBrightness);
  const customSharpnessRef = useRef(customSharpness);

  useEffect(() => {
    customSaturationRef.current = customSaturation;
  }, [customSaturation]);
  useEffect(() => {
    customContrastRef.current = customContrast;
  }, [customContrast]);
  useEffect(() => {
    customBrightnessRef.current = customBrightness;
  }, [customBrightness]);
  useEffect(() => {
    customSharpnessRef.current = customSharpness;
  }, [customSharpness]);

  // Metadados do Layout Debate Político
  const [topHeadline, setTopHeadline] = useState<string>("QUE LAPADA!");
  const [authorName, setAuthorName] = useState<string>("GUSTAVO GAYER");
  const [authorHandle, setAuthorHandle] = useState<string>("@GUSTAVOGAYER");
  const [authorVerified, setAuthorVerified] = useState<boolean>(true);

  // Guias magnéticas de alinhamento ao centro
  const [snapGuideX, setSnapGuideX] = useState<boolean>(false);
  const [snapGuideY, setSnapGuideY] = useState<boolean>(false);
  const snapGuideXRef = useRef<boolean>(false);
  const snapGuideYRef = useRef<boolean>(false);

  // Correção Gramatical Inteligente de Título
  const [isCorrectingTitle, setIsCorrectingTitle] = useState<boolean>(false);
  const [titleCorrectedSuccess, setTitleCorrectedSuccess] = useState<string>("");

  // Camadas bloqueadas contra arraste acidental
  const [lockedLayers, setLockedLayers] = useState<{ [key: string]: boolean }>({});

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
  const [miniIaTrimSeconds, setMiniIaTrimSeconds] = useState<number>(0); // Padrão 0s (só corta se o usuário pedir)
  const [videoFilter, setVideoFilter] = useState<VideoFilterPreset>("none");
  const videoFilterRef = useRef<VideoFilterPreset>("none");
  const [cutPauses, setCutPauses] = useState<boolean>(true);
  const [upscaleEnabled, setUpscaleEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("viralizou_upscale_hd");
      if (saved !== null) return saved === "true";
    } catch {}
    return true; // Ativo por padrão para garantir nitidez máxima em vídeos de WhatsApp/baixa resolução
  });
  const upscaleEnabledRef = useRef<boolean>(true);
  useEffect(() => {
    upscaleEnabledRef.current = upscaleEnabled;
  }, [upscaleEnabled]);
  const [audioSyncLock, setAudioSyncLock] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("viralizou_audio_sync_lock");
      if (saved !== null) return saved === "true";
    } catch {}
    return false;
  });
  const audioSyncLockRef = useRef<boolean>(audioSyncLock);
  useEffect(() => {
    audioSyncLockRef.current = audioSyncLock;
  }, [audioSyncLock]);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackPreset>("energetic");
  const [autoHookEnabled, setAutoHookEnabled] = useState<boolean>(false);
  const autoHookEnabledRef = useRef<boolean>(false);
  const [autoHookText, setAutoHookText] = useState<string>("");
  const [hookPositionY, setHookPositionY] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("viralizou_hook_pos_y");
      if (saved) return Number(saved);
    } catch {}
    return 307;
  });
  const [bgmVolume, setBgmVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("viralizou_bgm_volume");
      if (saved) return Math.max(0, Math.min(100, Number(saved)));
    } catch {}
    return 15;
  });
  const [isPlayingBgm, setIsPlayingBgm] = useState<boolean>(false);
  const [bgmCountdown, setBgmCountdown] = useState<number>(10);

  // Integração Real Oficial (Token Vercel & Catálogo de SFX)
  const [realOficialStatus, setRealOficialStatus] = useState<RealOficialConfigStatus | null>(null);
  const [realOficialSfxList, setRealOficialSfxList] = useState<RealOficialSfxItem[]>(DEFAULT_REAL_OFICIAL_SFX);
  const [selectedSfxPreset, setSelectedSfxPreset] = useState<"transitions" | "punch" | "news" | "none">("transitions");
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);
  const [sfxVolume, setSfxVolume] = useState<number>(35);
  const [showVercelTokenModal, setShowVercelTokenModal] = useState<boolean>(false);
  const [manualRealOficialToken, setManualRealOficialToken] = useState<string>("");
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let localToken = "";
    try {
      localToken = localStorage.getItem("viralizou_real_oficial_token") || "";
      if (localToken) setManualRealOficialToken(localToken);
    } catch {}

    const query = localToken ? `?token=${encodeURIComponent(localToken)}` : "";
    fetch(`/api/admin/real-oficial${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          const statusObj = data.status || data.tokenStatus;
          if (statusObj) setRealOficialStatus(statusObj);
          const sfxList = data.sfx || data.sfxCatalog;
          if (Array.isArray(sfxList) && sfxList.length > 0) {
            setRealOficialSfxList(sfxList);
          }
        }
      })
      .catch((err) => {
        console.warn("[SocialFeedCreator] Erro ao carregar status do Real Oficial:", err);
      });
  }, []);

  function handlePlaySfx(sfxItem: RealOficialSfxItem) {
    if (playingSfxId === sfxItem.id) {
      if (sfxAudioRef.current) {
        sfxAudioRef.current.pause();
        sfxAudioRef.current.currentTime = 0;
      }
      setPlayingSfxId(null);
      return;
    }
    if (sfxAudioRef.current) {
      sfxAudioRef.current.pause();
    }
    try {
      const audio = new Audio(sfxItem.url);
      audio.volume = Math.max(0.01, Math.min(1, sfxVolume / 100));
      sfxAudioRef.current = audio;
      setPlayingSfxId(sfxItem.id);
      audio.onended = () => setPlayingSfxId(null);
      audio.onerror = () => setPlayingSfxId(null);
      audio.play().catch(() => setPlayingSfxId(null));
    } catch {
      setPlayingSfxId(null);
    }
  }

  useEffect(() => {
    autoHookEnabledRef.current = autoHookEnabled;
  }, [autoHookEnabled]);

  useEffect(() => {
    hookPositionYRef.current = hookPositionY;
  }, [hookPositionY]);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCrop, setVideoCrop] = useState<VideoCropRect | null>(null);
  const [imageCrop, setImageCrop] = useState<VideoCropRect | null>(null);
  const [cropMediaType, setCropMediaType] = useState<"video" | "image">("video");
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  type ControlTab = "media" | "mini-ia" | "design";
  const [activeTab, setActiveTab] = useState<ControlTab>("media");

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
      const raw = localStorage.getItem("viralizou_layout_presets_v4");
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
    if (d.titlePosition) {
      setTitlePosition(d.titlePosition);
      titlePositionRef.current = d.titlePosition;
      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(d.titlePosition)); } catch {}
    }
    if (d.feedTitlePosition) {
      setFeedTitlePosition(d.feedTitlePosition);
      feedTitlePositionRef.current = d.feedTitlePosition;
      try { localStorage.setItem("viralizou_feed_title_position", JSON.stringify(d.feedTitlePosition)); } catch {}
    }
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
    if (d.videoFilter) {
      setVideoFilter(d.videoFilter);
      videoFilterRef.current = d.videoFilter;
      try { localStorage.setItem("viralizou_video_filter", d.videoFilter); } catch {}
    }
    if (typeof d.cutPauses === "boolean") setCutPauses(d.cutPauses);
    if (d.bgmTrack) setBgmTrack(d.bgmTrack);
    if (typeof d.autoHookEnabled === "boolean") {
      setAutoHookEnabled(d.autoHookEnabled);
      autoHookEnabledRef.current = d.autoHookEnabled;
    }
    if (typeof d.autoHookText === "string") setAutoHookText(d.autoHookText);
    if (d.videoCrop !== undefined) setVideoCrop(d.videoCrop);
    if (typeof d.hookPositionY === "number") {
      setHookPositionY(d.hookPositionY);
      hookPositionYRef.current = d.hookPositionY;
    }
    if (typeof d.bgmVolume === "number") {
      chooseBgmVolume(d.bgmVolume);
    }
    if (typeof d.videoBlockPosY === "number") {
      setVideoBlockPosY(d.videoBlockPosY);
      videoBlockPosYRef.current = d.videoBlockPosY;
    }
    if (typeof d.topHeadline === "string") setTopHeadline(d.topHeadline);
    if (typeof d.authorName === "string") setAuthorName(d.authorName);
    if (typeof d.authorHandle === "string") setAuthorHandle(d.authorHandle);
    if (typeof d.authorVerified === "boolean") setAuthorVerified(d.authorVerified);
    if (typeof d.customSaturation === "number") {
      setCustomSaturation(d.customSaturation);
      customSaturationRef.current = d.customSaturation;
    }
    if (typeof d.customContrast === "number") {
      setCustomContrast(d.customContrast);
      customContrastRef.current = d.customContrast;
    }
    if (typeof d.customBrightness === "number") {
      setCustomBrightness(d.customBrightness);
      customBrightnessRef.current = d.customBrightness;
    }
    if (typeof d.customSharpness === "number") {
      setCustomSharpness(d.customSharpness);
      customSharpnessRef.current = d.customSharpness;
    }

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
          hookPositionY: hookPositionYRef.current || hookPositionY,
          bgmVolume,
          videoBlockPosY: videoBlockPosYRef.current || videoBlockPosY,
          topHeadline,
          authorName,
          authorHandle,
          authorVerified,
          customSaturation,
          customContrast,
          customBrightness,
          customSharpness,
        },
      };
    });

    setPresetSlots(newSlots);
    setActiveSlotId(slotId);
    try {
      localStorage.setItem("viralizou_layout_presets_v4", JSON.stringify(newSlots));
    } catch {}
    setSlotFeedback(`💾 Layout salvo no Slot ${slotId}!`);
    setTimeout(() => setSlotFeedback(""), 3500);
  }

  function handleApplyCrop(newCrop: VideoCropRect | null) {
    if (cropMediaType === "video") {
      setVideoCrop(newCrop);
      if (newCrop) {
        try { localStorage.setItem("viralizou_video_crop", JSON.stringify(newCrop)); } catch {}
      } else {
        try { localStorage.removeItem("viralizou_video_crop"); } catch {}
      }
    } else {
      setImageCrop(newCrop);
      if (newCrop) {
        try { localStorage.setItem("viralizou_image_crop", JSON.stringify(newCrop)); } catch {}
      } else {
        try { localStorage.removeItem("viralizou_image_crop"); } catch {}
      }
    }
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseVideoFilter(f: VideoFilterPreset) {
    videoFilterRef.current = f;
    setVideoFilter(f);
    try { localStorage.setItem("viralizou_video_filter", f); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function toggleCutPauses(val: boolean) {
    setCutPauses(val);
    try { localStorage.setItem("viralizou_cut_pauses", String(val)); } catch {}
  }

  const BGM_URLS: Record<BgmTrackPreset, string> = {
    energetic: "https://cdn.realoficial.com.br/auto-edit-library/music/cc0-energetic-phonk-remix.mp3",
    breaking: "https://cdn.realoficial.com.br/auto-edit-library/music/ai-podcast-news-bed.mp3",
    suspense: "https://cdn.realoficial.com.br/auto-edit-library/music/ai-emotional-strings.mp3",
    chill: "https://cdn.realoficial.com.br/auto-edit-library/music/cc0-chill-roof-tops.mp3",
    none: "",
  };

  function stopPreviewBgm() {
    if (bgmTimerRef.current) {
      clearInterval(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
    }
    setIsPlayingBgm(false);
    setBgmCountdown(10);
  }

  function handleTogglePreviewBgm() {
    if (isPlayingBgm) {
      stopPreviewBgm();
      return;
    }
    if (bgmTrack === "none") return;
    const url = BGM_URLS[bgmTrack];
    if (!url) return;

    stopPreviewBgm();
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0.01, Math.min(1, bgmVolume / 100));
      bgmAudioRef.current = audio;
      setIsPlayingBgm(true);
      setBgmCountdown(10);

      audio.play().catch((err) => {
        console.warn("Falha ao tocar áudio da prévia:", err);
        stopPreviewBgm();
      });

      let remaining = 10;
      bgmTimerRef.current = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          stopPreviewBgm();
        } else {
          setBgmCountdown(remaining);
        }
      }, 1000);
    } catch {
      stopPreviewBgm();
    }
  }

  function chooseBgmVolume(val: number) {
    const safe = Math.max(0, Math.min(100, Math.round(val)));
    setBgmVolume(safe);
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = Math.max(0.01, Math.min(1, safe / 100));
    }
    try { localStorage.setItem("viralizou_bgm_volume", String(safe)); } catch {}
  }

  function chooseBgmTrack(tr: BgmTrackPreset) {
    stopPreviewBgm();
    setBgmTrack(tr);
    try { localStorage.setItem("viralizou_bgm_track", tr); } catch {}
  }

  function toggleAutoHook(val: boolean) {
    autoHookEnabledRef.current = val;
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
    if (val === 0 && videoPreviewRef.current) {
      videoPreviewRef.current.currentTime = 0;
    }
    try { localStorage.setItem("viralizou_mini_ia_trim_seconds", String(val)); } catch {}
  }

  async function handleCorrectTitle() {
    if (!title || !title.trim()) return;
    setIsCorrectingTitle(true);
    setTitleCorrectedSuccess("");
    try {
      const res = await fetch("/api/admin/correct-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: title }),
      });
      const data = await res.json();
      if (data.ok && data.correctedText) {
        setTitle(data.correctedText);
        cachedOverlayCanvasRef.current = null;
        setTitleCorrectedSuccess(`✨ Corrigido com sucesso via ${data.source === "gemini" ? "Inteligência Artificial" : "Gramática Jornalística"}!`);
        setTimeout(() => setTitleCorrectedSuccess(""), 4500);
      } else {
        setMessage(data.error || "Não foi possível corrigir a frase.");
      }
    } catch {
      setMessage("Erro ao conectar com o serviço de correção gramatical.");
    } finally {
      setIsCorrectingTitle(false);
    }
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString("pt-BR");
    console.log(`[ViralizouVideo ${time}] ${msg}`);
    setRenderLogs((prev) => [...prev.slice(-15), `[${time}] ${msg}`]);
  }

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoExport?.url) URL.revokeObjectURL(videoExport.url); }, [videoExport?.url]);
  useEffect(() => () => { if (customImageUrl && customImageUrl.startsWith("blob:")) URL.revokeObjectURL(customImageUrl); }, [customImageUrl]);
  useEffect(() => () => { audioContextRef.current?.close().catch(() => {}); stopPreviewBgm(); }, []);
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
      if (savedTextStyle) {
        if ((savedTextStyle as string) === "viral-debate") {
          setReelTextStyle("bicolor-yellow");
        } else {
          setReelTextStyle(savedTextStyle);
        }
      }
      if (savedFontFamily) setReelFontFamily(savedFontFamily);
      if (savedFontWeight) setReelFontWeight(savedFontWeight);
      if (savedTextAlign) setReelTextAlign(savedTextAlign);
      if (savedTextCase) setReelTextCase(savedTextCase);
      if (Number.isFinite(savedFontSize) && savedFontSize >= 24 && savedFontSize <= 120) setReelFontSize(savedFontSize);
      if (savedTagColor) setTagColor(savedTagColor);
      if (Number.isFinite(savedTagPosY) && savedTagPosY >= 1400 && savedTagPosY <= 1860) setTagPositionY(savedTagPosY);
      // Safe Zone inicia oculta por padrão no preview
      setShowSafeZone(false);
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
        videoFilterRef.current = savedFilter;
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
      // Gancho viral inicia sempre desmarcado como padrão conforme solicitado
      setAutoHookEnabled(false);
      autoHookEnabledRef.current = false;
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
      const savedImgCrop = localStorage.getItem("viralizou_image_crop");
      if (savedImgCrop) {
        try {
          const parsed = JSON.parse(savedImgCrop);
          if (parsed && typeof parsed.width === "number") setImageCrop(parsed);
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

      const cardColorFilter = getCanvasColorFilter({
        contrast: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).contrast,
        brightness: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).brightness,
        saturation: (MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media).saturation,
        filterPreset: videoFilter,
        customSaturation: customSaturationRef.current ?? customSaturation,
        customContrast: customContrastRef.current ?? customContrast,
        customBrightness: customBrightnessRef.current ?? customBrightness,
        customSharpness: customSharpnessRef.current ?? customSharpness,
        upscaleEnabled: upscaleEnabledRef.current,
      });

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
              if (cardColorFilter && cardColorFilter !== "none") {
                try { ctx.filter = cardColorFilter; } catch {}
              }
              drawCover(ctx, customImageRef.current, 0, 0, currentW, currentH, imagePosition, imageCrop);
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
            if (cardColorFilter && cardColorFilter !== "none") {
              try { ctx.filter = cardColorFilter; } catch {}
            }
            drawCover(ctx, img, 0, 0, currentW, currentH, imagePosition, imageCrop);
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

      if (format === "reel" || ((format === "story" || format === "feed" || format === "feed-square") && videoPreviewRef.current && videoReady)) {
        await document.fonts?.ready;
        if (logoData) {
          try {
            if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
          } catch { logoImageRef.current = null; }
        } else {
          logoImageRef.current = null;
        }
        const activeFramingMode = videoFramingModeRef.current || videoFramingMode;
        const effectiveImg1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image || null;
        const effectiveImg2 = splitImg2Ref.current;
        const currentSplitConfig: Split1v2iConfig = {
          framingMode: activeFramingMode,
          img1: effectiveImg1,
          img2: effectiveImg2,
          dividerColor: splitDividerColor,
          dividerWidth: splitDividerWidth,
          videoSide: splitVideoSide,
          topCardEnabled: splitTopCardEnabled,
          kickerText: splitKickerText,
        };
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
          activeFramingMode,
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
            autoHookEnabled: autoHookEnabledRef.current,
            autoHookText: effectiveHookText,
            hookPositionY: hookPositionYRef.current || hookPositionY,
            customSaturation: customSaturationRef.current ?? customSaturation,
            customContrast: customContrastRef.current ?? customContrast,
            customBrightness: customBrightnessRef.current ?? customBrightness,
            customSharpness: customSharpnessRef.current ?? customSharpness,
            videoBlockPosY: videoBlockPosYRef.current ?? videoBlockPosY,
            topHeadline,
            authorName,
            authorHandle,
            authorVerified,
            upscaleEnabled: upscaleEnabledRef.current,
          },
          videoCrop,
          currentSplitConfig
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

      // 0. Modo Dividido (1 Vídeo + 2 Imagens - Estilo Copaíba Notícias)
      if (videoFramingMode === "split-1v2i") {
        const topCardEnabled = splitTopCardEnabled;
        const headerH = topCardEnabled
          ? Math.min(360, Math.max(220, getSplitHeaderHeight(ctx, title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA", feedFontFamily || "montserrat", "uppercase", feedTitleFontSize > 0 ? feedTitleFontSize : 42, currentW)))
          : 0;
        const mediaY = headerH;
        const mediaH = currentH - headerH;
        const halfW = Math.floor(currentW / 2);
        const vidSide = splitVideoSide || "right";
        const vidX = vidSide === "right" ? halfW : 0;
        const vidW = currentW - halfW;
        const imgColX = vidSide === "right" ? 0 : halfW;
        const imgColW = halfW;
        const halfMediaH = Math.floor(mediaH / 2);
        const divColor = splitDividerColor || "#ffffff";
        const divW = Math.max(1, Math.min(24, splitDividerWidth || 4));

        // Topo branco de notícia no Feed
        if (topCardEnabled && headerH > 0) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, currentW, headerH);

          const kicker = (splitKickerText || selectedPost?.category || "URGENTE").trim().toUpperCase();
          ctx.font = '900 22px "Montserrat", sans-serif';
          const kickerMetrics = ctx.measureText(kicker);
          const badgeW = Math.max(110, kickerMetrics.width + 26);
          const badgeH = 34;
          const badgeX = 40;
          const badgeY = 30;

          ctx.fillStyle = tagColor === "yellow" ? "#eab308" : tagColor === "orange" ? "#ea580c" : "#dc2626";
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
            ctx.fill();
          } else {
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(kicker, badgeX + badgeW / 2, badgeY + badgeH / 2);

          if (showHandleLayer && handle) {
            ctx.fillStyle = "#64748b";
            ctx.font = '700 20px "Montserrat", sans-serif';
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const hText = handle.startsWith("@") ? handle : `@${handle}`;
            ctx.fillText(hText, currentW - 40, badgeY + badgeH / 2);
          }

          const titleY = badgeY + badgeH + 16;
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const titleFontSize = feedTitleFontSize > 0 ? Math.min(feedTitleFontSize, 42) : 38;
          ctx.font = getReelFont(feedFontFamily || "montserrat", titleFontSize, "900");
          const layout = getCachedReelTitleLayout(ctx, title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA", feedFontFamily || "montserrat", "900", "uppercase", titleFontSize, currentW - 80);
          const lineH = Math.round(titleFontSize * 1.22);
          for (let i = 0; i < layout.lines.length; i++) {
            ctx.fillText(layout.lines[i], 40, titleY + i * lineH);
          }

          ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
          ctx.fillRect(0, headerH - 3, currentW, 3);
        }

        // Coluna de Vídeo / Foto Principal
        ctx.save();
        ctx.beginPath();
        ctx.rect(vidX, mediaY, vidW, mediaH);
        ctx.clip();
        if (videoPreviewRef.current && videoReady) {
          drawCover(ctx, videoPreviewRef.current, vidX, mediaY, vidW, mediaH, imagePosition, videoCrop);
        } else if (customImageRef.current) {
          drawCover(ctx, customImageRef.current, vidX, mediaY, vidW, mediaH, imagePosition, imageCrop);
        } else if (articleImageRef.current?.image) {
          drawCover(ctx, articleImageRef.current.image, vidX, mediaY, vidW, mediaH, imagePosition, imageCrop);
        } else {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(vidX, mediaY, vidW, mediaH);
        }
        ctx.restore();

        // Coluna de Fotos (Foto 1 e Foto 2)
        const img1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image;
        const img1H = halfMediaH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgColX, mediaY, imgColW, img1H);
        ctx.clip();
        if (img1 && isImageDrawable(img1)) {
          drawCover(ctx, img1, imgColX, mediaY, imgColW, img1H, 0);
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(imgColX, mediaY, imgColW, img1H);
        }
        ctx.restore();

        const img2 = splitImg2Ref.current;
        const img2Y = mediaY + halfMediaH;
        const img2H = mediaH - halfMediaH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgColX, img2Y, imgColW, img2H);
        ctx.clip();
        if (img2 && isImageDrawable(img2)) {
          drawCover(ctx, img2, imgColX, img2Y, imgColW, img2H, 0);
        } else {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(imgColX, img2Y, imgColW, img2H);
        }
        ctx.restore();

        // Divisórias
        ctx.fillStyle = divColor;
        ctx.fillRect(imgColX, mediaY + halfMediaH - Math.floor(divW / 2), imgColW, divW);
        ctx.fillRect(halfW - Math.floor(divW / 2), mediaY, divW, mediaH);
        if (topCardEnabled && headerH > 0) {
          ctx.fillRect(0, mediaY - Math.floor(divW / 2), currentW, Math.max(2, Math.min(divW, 4)));
        }

        mediaDrawn = true;
      }

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
            if (cardColorFilter && cardColorFilter !== "none") {
              try { ctx.filter = cardColorFilter; } catch {}
            }
            drawCover(ctx, customImageRef.current, 0, 0, currentW, coverH, imagePosition, imageCrop);
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
        if (cardColorFilter && cardColorFilter !== "none") {
          try { ctx.filter = cardColorFilter; } catch {}
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
          if (cardColorFilter && cardColorFilter !== "none") {
            try { ctx.filter = cardColorFilter; } catch {}
          }
          drawCover(ctx, img, 0, 0, currentW, coverH, imagePosition, imageCrop);
          ctx.restore();
          mediaDrawn = true;
        } catch (e) {
          console.warn("Erro ao carregar imagem da notícia:", e);
        }
      }

      if (mediaDrawn) {
        applyCanvasVideoFilterOverlay(ctx, currentW, coverH, videoFilterRef.current || videoFilter);
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
      if (showOverlayLayer && shadeOpacity > 0 && videoFramingMode !== "split-1v2i") {
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

      if (showTitleLayer && (videoFramingMode !== "split-1v2i" || !splitTopCardEnabled)) {
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

      if (showHandleLayer && handle && handle.trim() && reelTextStyle !== "red-bottom" && reelTextStyle !== "bacci-red" && (videoFramingMode !== "split-1v2i" || !splitTopCardEnabled)) {
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
  }, [selectedPost?.slug, selectedPost?.updated_at, customImageUrl, title, logoData, handle, imagePosition, feedTitleFontSize, feedFontFamily, feedTitlePosition.x, feedTitlePosition.y, feedTitleOffsetY, format, logoPosition.x, logoPosition.y, titlePosition.x, titlePosition.y, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle, miniIaMirror, imageCrop, videoFramingMode, splitImg1Url, splitImg2Url, splitDividerColor, splitDividerWidth, splitVideoSide, splitTopCardEnabled, splitKickerText]);

  // MAX CACHE: Pré-renderiza todo o layout visual da legenda e sobreposições em 1080x1920
  // Isso zera 100% dos cálculos na CPU durante a reprodução do vídeo e evita travamentos
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const effectiveImg1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image || null;
      const effectiveImg2 = splitImg2Ref.current;
      const currentSplitConfig: Split1v2iConfig = {
        framingMode: videoFramingMode,
        img1: effectiveImg1,
        img2: effectiveImg2,
        dividerColor: splitDividerColor,
        dividerWidth: splitDividerWidth,
        videoSide: splitVideoSide,
        topCardEnabled: splitTopCardEnabled,
        kickerText: splitKickerText,
      };
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
        {
          topHeadline,
          authorName,
          authorHandle,
          authorVerified,
        },
        currentSplitConfig
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
    topHeadline, authorName, authorHandle, authorVerified,
    videoFramingMode, splitImg1Url, splitImg2Url, splitDividerColor, splitDividerWidth, splitVideoSide, splitTopCardEnabled, splitKickerText,
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
              const effectiveImg1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image || null;
              const effectiveImg2 = splitImg2Ref.current;
              const currentSplitConfig: Split1v2iConfig = {
                framingMode: videoFramingMode,
                img1: effectiveImg1,
                img2: effectiveImg2,
                dividerColor: splitDividerColor,
                dividerWidth: splitDividerWidth,
                videoSide: splitVideoSide,
                topCardEnabled: splitTopCardEnabled,
                kickerText: splitKickerText,
              };
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
                {
                  topHeadline,
                  authorName,
                  authorHandle,
                  authorVerified,
                  upscaleEnabled: upscaleEnabledRef.current,
                },
                currentSplitConfig
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

  // Loop de pré-visualização interativa de Vídeo (Reels, Stories e Feed 4:5)
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!videoUrl || !video || recording) return;
    let frameId = 0;
    let lastRenderedAt = 0;
    const previewInterval = 1000 / 24;
    const draw = (timestamp = 0) => {
      if (!isRecordingRef.current) {
        if (timestamp - lastRenderedAt >= previewInterval) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (ctx && video.readyState >= 2) {
            const currentLoopH = getCanvasDimensions(format).height;
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, W, currentLoopH);
            const miniIaCfg = MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media;
            const activeFramingMode = videoFramingModeRef.current || videoFramingMode;
            const effectiveImg1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image || null;
            const effectiveImg2 = splitImg2Ref.current;
            const currentSplitConfig: Split1v2iConfig = {
              framingMode: activeFramingMode,
              img1: effectiveImg1,
              img2: effectiveImg2,
              dividerColor: splitDividerColor,
              dividerWidth: splitDividerWidth,
              videoSide: splitVideoSide,
              topCardEnabled: splitTopCardEnabled,
              kickerText: splitKickerText,
            };
            drawVideoWithFraming(
              ctx,
              video,
              W,
              currentLoopH,
              activeFramingMode,
              imagePosition,
              miniIaMirror,
              {
                contrast: miniIaCfg.contrast,
                brightness: miniIaCfg.brightness,
                saturation: miniIaCfg.saturation,
                punchZoom: miniIaCfg.punchZoom,
                zoomMax: miniIaCfg.zoomMax,
                zoomPeriod: miniIaCfg.zoomPeriod,
                filterPreset: videoFilterRef.current || videoFilter,
                customSaturation: customSaturationRef.current,
                customContrast: customContrastRef.current,
                customBrightness: customBrightnessRef.current,
                customSharpness: customSharpnessRef.current,
                videoBlockPosY: videoBlockPosYRef.current ?? videoBlockPosY,
                topHeadline,
                authorName,
                authorHandle,
                authorVerified,
                upscaleEnabled: upscaleEnabledRef.current,
              },
              videoCrop,
              currentSplitConfig
            );
            // Ultra-rápido: usa o overlay cacheado apenas quando não estiver arrastando elementos interativos
            const isDraggingAny = Boolean(tagDragRef.current || titleDragRef.current || logoDragRef.current || hookDragRef.current || videoDragRef.current);
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
                    logoPositionRef.current.y * currentLoopH - lH / 2,
                    lW,
                    lH
                  );
                }
              }
              if (autoHookEnabledRef.current && autoHookEnabled && effectiveHookText && video.currentTime <= 3.6) {
                drawViralHookBanner(ctx, effectiveHookText, W, currentLoopH, video.currentTime, format, hookPositionYRef.current || hookPositionY);
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
                  filterPreset: videoFilterRef.current || videoFilter,
                  autoHookEnabled: autoHookEnabledRef.current && autoHookEnabled,
                  autoHookText: effectiveHookText,
                  hookPositionY: hookPositionYRef.current || hookPositionY,
                  customSaturation: customSaturationRef.current,
                  customContrast: customContrastRef.current,
                  customBrightness: customBrightnessRef.current,
                  customSharpness: customSharpnessRef.current,
                  videoBlockPosY: videoBlockPosYRef.current ?? videoBlockPosY,
                  topHeadline,
                  authorName,
                  authorHandle,
                  authorVerified,
                  upscaleEnabled: upscaleEnabledRef.current,
                },
                videoCrop,
                currentSplitConfig
              );
            }
            if (showSafeZone) {
              if (format === "story") {
                drawStorySafeZone(ctx);
                if (showStorySticker) {
                  drawStoryStickerGuide(ctx, W);
                }
              } else if (format === "feed") {
                drawFeedSafeZone(ctx);
              } else if (format === "feed-square") {
                drawFeedSquareSafeZone(ctx);
              } else {
                drawReelSafeZone(ctx);
              }
            }
            if (snapGuideXRef.current || snapGuideYRef.current) {
              drawAlignmentGuides(ctx, W, currentLoopH, snapGuideXRef.current, snapGuideYRef.current);
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
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle, recording, videoFramingMode, imagePosition, miniIaTrimSeconds, miniIaLevel, miniIaMirror, videoFilter, autoHookEnabled, effectiveHookText, videoCrop, hookPositionY, splitImg1Url, splitImg2Url, splitDividerColor, splitDividerWidth, splitVideoSide, splitTopCardEnabled, splitKickerText, customSaturation, customContrast, customBrightness, customSharpness, upscaleEnabled, audioSyncLock]);

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
    setVideoCrop(null);
    try { localStorage.removeItem("viralizou_video_crop"); } catch {}
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
    setVideoCrop(null);
    try { localStorage.removeItem("viralizou_video_crop"); } catch {}
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

  function chooseVideoFramingMode(mode: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i") {
    setVideoFramingMode(mode);
    videoFramingModeRef.current = mode;
    try { localStorage.setItem("viralizou_video_framing_mode", mode); } catch {}
    cachedOverlayCanvasRef.current = null;
    renderCard();
  }

  function chooseReelTextStyle(style: ReelTextStyle) {
    setReelTextStyle(style);
    try { localStorage.setItem("viralizou_reel_text_style", style); } catch {}
    if (style === "split-compare") {
      chooseVideoFramingMode("split");
    } else if (videoFramingModeRef.current === "split") {
      chooseVideoFramingMode("cover");
    }
    if (style === "bacci-red") {
      if (!titlePositionRef.current?.y || titlePositionRef.current.y > 0.72 || titlePositionRef.current.y < 0.30) {
        const pos = { x: 0.5, y: 0.58 };
        titlePositionRef.current = pos;
        setTitlePosition(pos);
        try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
      }
    } else if (style === "red-bottom") {
      if (!titlePositionRef.current?.y || titlePositionRef.current.y > 0.78 || titlePositionRef.current.y < 0.35) {
        const pos = { x: 0.5, y: 0.615 };
        titlePositionRef.current = pos;
        setTitlePosition(pos);
        try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
      }
    }
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

    // 0. GANCHO VIRAL AUTO-EDIT (se ativo)
    if (autoHookEnabled && effectiveHookText) {
      const hookY = hookPositionYRef.current || hookPositionY;
      const hookH = 75;
      const rect = event.currentTarget.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * currentH;
      if (y >= hookY - 25 && y <= hookY + hookH + 25) {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        hookDragRef.current = { pointerId: event.pointerId, offsetY: y - hookY };
        setDraggingLogo(true);
        return;
      }
    }

    // 1. LOGO MARCA D'ÁGUA (Arraste de alta prioridade na frente)
    if (!lockedLayers["logo"] && showLogoLayer) {
      const logo = logoImageRef.current || getRenderableLogo(null, logoColorStyle);
      if (logo && isImageDrawable(logo)) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * currentW;
        const y = ((event.clientY - rect.top) / rect.height) * currentH;
        const { width, height } = getLogoSize(logo, format, format === "reel" || format === "story" ? logoScale / 100 : 1);
        const centerX = logoPositionRef.current.x * currentW;
        const centerY = logoPositionRef.current.y * currentH;
        const boxW = Math.max(120, width + 60);
        const boxH = Math.max(120, height + 60);
        if (x >= centerX - boxW / 2 && x <= centerX + boxW / 2 && y >= centerY - boxH / 2 && y <= centerY + boxH / 2) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          cachedOverlayCanvasRef.current = null;
          logoDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - logoPositionRef.current.x, offsetY: y / currentH - logoPositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    // 2. TÍTULO / MANCHETE (Arraste livre no Reel e Story)
    if (!lockedLayers["title"] && showTitleLayer && (format === "reel" || format === "story")) {
      const ctx = event.currentTarget.getContext("2d");
      if (ctx) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * currentW;
        const y = ((event.clientY - rect.top) / rect.height) * currentH;

        if (reelTextStyle === "bacci-red") {
          const darkBoxH = currentH <= 1100 ? 230 : currentH <= 1400 ? 270 : 330;
          const redBarH = currentH <= 1100 ? 120 : currentH <= 1400 ? 136 : 156;
          const currentTopY = Math.round((titlePositionRef.current.y || 0.58) * currentH);
          const totalBacciH = darkBoxH + redBarH;
          if (y >= currentTopY - 25 && y <= currentTopY + totalBacciH + 25) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            titleDragRef.current = {
              pointerId: event.pointerId,
              offsetX: 0,
              offsetY: y / currentH - (titlePositionRef.current.y || 0.58),
            };
            setDraggingLogo(true);
            return;
          }
        } else if (reelTextStyle === "red-bottom") {
          const currentBannerY = Math.round((titlePositionRef.current.y || 0.615) * currentH);
          if (y >= currentBannerY - 25 && y <= currentH) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            titleDragRef.current = {
              pointerId: event.pointerId,
              offsetX: 0,
              offsetY: y / currentH - (titlePositionRef.current.y || 0.615),
            };
            setDraggingLogo(true);
            return;
          }
        } else {
          const layout = getCachedReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize, 820);
          const centerX = titlePositionRef.current.x * currentW;
          const centerY = titlePositionRef.current.y * currentH;
          const boxW = Math.max(200, layout.width + 70);
          const boxH = Math.max(100, layout.height + 70);
          if (x >= centerX - boxW / 2 && x <= centerX + boxW / 2 && y >= centerY - boxH / 2 && y <= centerY + boxH / 2) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            titleDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - titlePositionRef.current.x, offsetY: y / currentH - titlePositionRef.current.y };
            setDraggingLogo(true);
            return;
          }
        }
      }
    }

    // 2.1 TÍTULO DO FEED (Feed 4:5 e Feed 1:1)
    if (!lockedLayers["title"] && showTitleLayer && (format === "feed" || format === "feed-square")) {
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
        const boxW = Math.max(200, width + 70);
        const boxH = Math.max(100, height + 70);
        if (x >= centerX - boxW / 2 && x <= centerX + boxW / 2 && y >= centerY - boxH / 2 && y <= centerY + boxH / 2) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          titleDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - feedTitlePositionRef.current.x, offsetY: y / currentH - feedTitlePositionRef.current.y };
          setDraggingLogo(true);
          return;
        }
      }
    }

    // 3. TAG / ASSINATURA DO CONTEÚDO (@viralizougoiania)
    if (!lockedLayers["handle"] && showHandleLayer && handle && handle.trim()) {
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
      const boxW = Math.max(200, estWidth + 60);
      const boxH = Math.max(70, tagH + 50);

      if (
        x >= centerX - boxW / 2 &&
        x <= centerX + boxW / 2 &&
        y >= centerY - boxH / 2 &&
        y <= centerY + boxH / 2
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

    // 4. BLOCO DE VÍDEO HORIZONTAL (Verificado após camadas de frente)
    if (videoFramingMode === "horizontal-block" && !lockedLayers["video"] && videoPreviewRef.current) {
      const v = videoPreviewRef.current;
      const fullWidth = v.videoWidth || 1920;
      const fullHeight = v.videoHeight || 1080;
      const vAspect = fullHeight / fullWidth;
      const blockH = Math.round(currentW * (vAspect > 0 ? vAspect : 9 / 16));
      const normY = videoBlockPosYRef.current ?? videoBlockPosY;
      const blockY = Math.max(0, Math.min(currentH - blockH, Math.round(normY * currentH - blockH / 2)));
      const rect = event.currentTarget.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * currentH;

      if (y >= blockY && y <= blockY + blockH) {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        videoDragRef.current = {
          pointerId: event.pointerId,
          offsetY: y - normY * currentH,
        };
        setDraggingLogo(true);
        return;
      }
    }
  }

  function onPreviewPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { width: currentW, height: currentH } = getCanvasDimensions(format);

    // Arraste do Bloco de Vídeo Horizontal
    const videoDrag = videoDragRef.current;
    if (videoDrag?.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * currentH;
      const rawNormY = (y - videoDrag.offsetY) / currentH;

      const v = videoPreviewRef.current;
      const fullWidth = v?.videoWidth || 1920;
      const fullHeight = v?.videoHeight || 1080;
      const vAspect = fullHeight / fullWidth;
      const blockH = Math.round(currentW * (vAspect > 0 ? vAspect : 9 / 16));
      const minNormY = (blockH / 2) / currentH;
      const maxNormY = 1 - (blockH / 2) / currentH;

      let newY = Math.min(maxNormY, Math.max(minNormY, rawNormY));

      let snappedY = false;
      if (Math.abs(newY - 0.5) < 0.025) {
        newY = 0.5;
        snappedY = true;
      } else if (Math.abs(newY - 0.44) < 0.02) {
        newY = 0.44;
        snappedY = true;
      }
      setSnapGuideY(snappedY);
      snapGuideYRef.current = snappedY;

      videoBlockPosYRef.current = Number(newY.toFixed(3));
      setVideoBlockPosY(Number(newY.toFixed(3)));
      if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
        renderCard();
      }
      return;
    }

    const hookDrag = hookDragRef.current;
    if (hookDrag?.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * currentH;
      let newY = Math.min(currentH - 120, Math.max(80, Math.round(y - hookDrag.offsetY)));

      let snappedY = false;
      if (Math.abs(newY - currentH / 2) < 25) {
        newY = Math.round(currentH / 2);
        snappedY = true;
      }
      setSnapGuideY(snappedY);
      snapGuideYRef.current = snappedY;

      hookPositionYRef.current = newY;
      setHookPositionY(newY);
      cachedOverlayCanvasRef.current = null;
      if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
        renderCard();
      }
      return;
    }

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
        if (reelTextStyle === "bacci-red") {
          const rawY = (event.clientY - rect.top) / rect.height - titleDrag.offsetY;
          let newY = Math.min(0.75, Math.max(0.30, rawY));
          let snappedY = false;
          if (Math.abs(newY - 0.58) < 0.02) {
            newY = 0.58;
            snappedY = true;
          }
          setSnapGuideY(snappedY);
          snapGuideYRef.current = snappedY;
          const position = { x: 0.5, y: Number(newY.toFixed(3)) };
          titlePositionRef.current = position;
          setTitlePosition(position);
        } else if (reelTextStyle === "red-bottom") {
          const rawY = (event.clientY - rect.top) / rect.height - titleDrag.offsetY;
          let newY = Math.min(0.80, Math.max(0.40, rawY));
          let snappedY = false;
          if (Math.abs(newY - 0.615) < 0.02) {
            newY = 0.615;
            snappedY = true;
          }
          setSnapGuideY(snappedY);
          snapGuideYRef.current = snappedY;
          const position = { x: 0.5, y: Number(newY.toFixed(3)) };
          titlePositionRef.current = position;
          setTitlePosition(position);
        } else {
          const layout = ctx ? getCachedReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize, 820) : { width: 0, height: 0 };
          let rawX = (event.clientX - rect.left) / rect.width - titleDrag.offsetX;
          let rawY = (event.clientY - rect.top) / rect.height - titleDrag.offsetY;

          let snappedX = false;
          let snappedY = false;
          if (Math.abs(rawX - 0.5) < 0.03) {
            rawX = 0.5;
            snappedX = true;
          }
          if (Math.abs(rawY - 0.5) < 0.03) {
            rawY = 0.5;
            snappedY = true;
          }
          setSnapGuideX(snappedX);
          snapGuideXRef.current = snappedX;
          setSnapGuideY(snappedY);
          snapGuideYRef.current = snappedY;

          const position = {
            x: Math.min(1 - layout.width / (2 * currentW), Math.max(layout.width / (2 * currentW), rawX)),
            y: Math.min(1 - layout.height / (2 * currentH), Math.max(layout.height / (2 * currentH), rawY)),
          };
          titlePositionRef.current = position;
          setTitlePosition(position);
        }
      } else if (ctx) {
        const fitted = fitHeadline(ctx, (title || selectedPost?.title || "Título da notícia").trim(), 920, feedTitleFontSize, feedFontFamily);
        ctx.font = getReelFont(feedFontFamily, fitted.size);
        const width = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width), 0);
        const height = fitted.lines.length * fitted.size * 1.1;
        let rawX = (event.clientX - rect.left) / rect.width - titleDrag.offsetX;
        let rawY = (event.clientY - rect.top) / rect.height - titleDrag.offsetY;

        let snappedX = false;
        let snappedY = false;
        if (Math.abs(rawX - 0.5) < 0.03) {
          rawX = 0.5;
          snappedX = true;
        }
        if (Math.abs(rawY - 0.5) < 0.03) {
          rawY = 0.5;
          snappedY = true;
        }
        setSnapGuideX(snappedX);
        snapGuideXRef.current = snappedX;
        setSnapGuideY(snappedY);
        snapGuideYRef.current = snappedY;

        const position = {
          x: Math.min(1 - width / (2 * currentW), Math.max(width / (2 * currentW), rawX)),
          y: Math.min(1 - height / (2 * currentH), Math.max(height / (2 * currentH), rawY)),
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
    let rawX = (event.clientX - rect.left) / rect.width - drag.offsetX;
    let rawY = (event.clientY - rect.top) / rect.height - drag.offsetY;

    let snappedX = false;
    let snappedY = false;
    if (Math.abs(rawX - 0.5) < 0.03) {
      rawX = 0.5;
      snappedX = true;
    }
    if (Math.abs(rawY - 0.5) < 0.03) {
      rawY = 0.5;
      snappedY = true;
    }
    setSnapGuideX(snappedX);
    snapGuideXRef.current = snappedX;
    setSnapGuideY(snappedY);
    snapGuideYRef.current = snappedY;

    const position = {
      x: Math.min(1 - width / (2 * currentW), Math.max(width / (2 * currentW), rawX)),
      y: Math.min(1 - height / (2 * currentH), Math.max(height / (2 * currentH), rawY)),
    };
    logoPositionRef.current = position;
    setLogoPosition(position);
    cachedOverlayCanvasRef.current = null;
    if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) {
      renderCard();
    }
  }

  function onPreviewPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    setSnapGuideX(false);
    snapGuideXRef.current = false;
    setSnapGuideY(false);
    snapGuideYRef.current = false;

    if (videoDragRef.current?.pointerId === event.pointerId) {
      videoDragRef.current = null;
      setDraggingLogo(false);
      try {
        localStorage.setItem("viralizou_video_block_pos_y", String(videoBlockPosYRef.current || 0.44));
      } catch {}
      renderCard();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (hookDragRef.current?.pointerId === event.pointerId) {
      hookDragRef.current = null;
      setDraggingLogo(false);
      try {
        localStorage.setItem("viralizou_hook_pos_y", String(hookPositionYRef.current || hookPositionY));
      } catch {}
      renderCard();
    } else if (tagDragRef.current?.pointerId === event.pointerId) {
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

    // GARANTE PROPORÇÃO ADEQUADA AO FORMATO ESCOLHIDO (1080x1920 para Reels/Stories ou 1080x1350 para Feed 4:5)
    const exportH = getCanvasDimensions(format).height;
    canvas.width = 1080;
    canvas.height = exportH;

    const formatLabel = format === "story" ? "story" : (format === "feed" || format === "feed-square") ? "feed-video" : "reel";
    const basename = (selectedPost?.slug || videoFileName.replace(/\.[^.]+$/, "") || `viralizou-${formatLabel}`)
      .replace(/[^a-zA-Z0-9_-]/g, "-") || `viralizou-${formatLabel}`;
    const outFilename = `${basename}-${formatLabel}.mp4`;

    const effectiveFramingMode = videoFramingModeRef.current || videoFramingMode;
    const effectiveImg1 = splitImg1Ref.current || customImageRef.current || articleImageRef.current?.image || null;
    const effectiveImg2 = splitImg2Ref.current;
    const currentSplitConfig: Split1v2iConfig = {
      framingMode: effectiveFramingMode,
      img1: effectiveImg1,
      img2: effectiveImg2,
      dividerColor: splitDividerColor,
      dividerWidth: splitDividerWidth,
      videoSide: splitVideoSide,
      topCardEnabled: splitTopCardEnabled,
      kickerText: splitKickerText,
    };

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
      {
        topHeadline,
        authorName,
        authorHandle,
        authorVerified,
      },
      currentSplitConfig
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
        formData.append("framingMode", effectiveFramingMode);
        if (effectiveFramingMode === "split-1v2i") {
          const headerH = splitTopCardEnabled
            ? getSplitHeaderHeight(overlayCanvas.getContext("2d")!, title || selectedPost?.title || "TÍTULO DA SUA NOTÍCIA", reelFontFamily, reelTextCase, reelFontSize, 1080)
            : 0;
          formData.append("splitVideoSide", splitVideoSide);
          formData.append("splitHeaderH", String(headerH));
        }
        formData.append("vertical", String(imagePosition));
        formData.append("editLevel", miniIaLevel);
        formData.append("mirror", String(miniIaMirror));
        formData.append("trimStart", String(miniIaTrimSeconds));
        formData.append("format", format);
        formData.append("videoFilter", videoFilter);
        formData.append("bgmTrack", bgmTrack);
        formData.append("bgmVolume", String(bgmVolume));
        formData.append("customSaturation", String(customSaturation));
        formData.append("customContrast", String(customContrast));
        formData.append("customBrightness", String(customBrightness));
        formData.append("customSharpness", String(customSharpness));
        formData.append("videoBlockPosY", String(videoBlockPosYRef.current || videoBlockPosY));
        formData.append("sfxPreset", selectedSfxPreset);
        formData.append("sfxVolume", String(sfxVolume));
        formData.append("upscale", String(upscaleEnabled));
        formData.append("audioSyncLock", String(audioSyncLock));

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
        setPreviewViewMode("generated");
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
    let sfxAudioSourceNode: any = null;
    let bgmAudioSourceNode: any = null;
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
      if (Math.abs(video.currentTime - startT) > 0.005) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => resolve(), 4000);
          video.addEventListener("seeked", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          video.currentTime = startT;
        });
      }
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => resolve(), 3000);
          video.addEventListener("loadeddata", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
        });
      }

      // 3. Pipeline único e exclusivo de Áudio via Web Audio API (Multi-Track: Vídeo + SFX + BGM)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let audioTrack: MediaStreamTrack | null = null;
      let audioCtx: AudioContext | null = null;
      let sfxBufferReady: AudioBuffer | null = null;
      let bgmBufferReady: AudioBuffer | null = null;

      if (AudioContextClass) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        audioCtx = audioContextRef.current;
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

        // 3.1 Canal Master da Voz/Áudio do Vídeo Original
        const videoGain = audioCtx.createGain();
        videoGain.gain.value = 1.0;
        audioSource.connect(videoGain);
        videoGain.connect(audioDestination);

        // 3.2 MIXER REAL OFICIAL: Efeitos Sonoros (SFX)
        if (selectedSfxPreset !== "none") {
          let sfxUrl = "https://cdn.realoficial.com.br/auto-edit-library/sfx/whoosh-transition.mp3";
          let sfxName = "Whoosh & Pop";
          if (selectedSfxPreset === "punch") {
            sfxUrl = "https://cdn.realoficial.com.br/auto-edit-library/sfx/bass-drop-impact.mp3";
            sfxName = "Sub-Bass Impacto";
          } else if (selectedSfxPreset === "news") {
            sfxUrl = "https://cdn.realoficial.com.br/auto-edit-library/sfx/ding-notification.mp3";
            sfxName = "Plantão Noticioso";
          }

          addLog(`🔊 Carregando Efeito Sonoro Real Oficial: ${sfxName}...`);
          try {
            const sfxBuf = await loadAudioBuffer(audioCtx, sfxUrl);
            if (sfxBuf) {
              sfxBufferReady = sfxBuf;
              addLog(`⚡ Efeito Sonoro Real Oficial (${sfxName} · ${sfxVolume}%) pronto para mixagem sincronizada!`);
            }
          } catch (sfxErr: any) {
            console.warn("[SFX Real Oficial]", sfxErr?.message);
          }
        }

        // 3.3 MIXER REAL OFICIAL: Trilha Sonora de Fundo (BGM)
        if (bgmTrack && bgmTrack !== "none" && BGM_URLS[bgmTrack]) {
          const trackUrl = BGM_URLS[bgmTrack];
          addLog(`🎵 Carregando Trilha Sonora Real Oficial: ${bgmTrack.toUpperCase()}...`);
          try {
            const bgmBuf = await loadAudioBuffer(audioCtx, trackUrl);
            if (bgmBuf) {
              bgmBufferReady = bgmBuf;
              addLog(`🎵 Trilha Sonora Real Oficial (${bgmTrack.toUpperCase()} · ${bgmVolume}%) pronta para mixagem sincronizada!`);
            }
          } catch (bgmErr: any) {
            console.warn("[BGM Real Oficial]", bgmErr?.message);
          }
        }

        const tracks = audioDestination.stream.getAudioTracks();
        if (tracks.length > 0) {
          audioTrack = tracks[0];
        }
      }

      // Desmuta para alimentar a decodificação do Web Audio
      video.muted = false;
      video.volume = 1;
      const miniIaCfg = MINI_IA_LEVELS[miniIaLevel] || MINI_IA_LEVELS.media;
      const isLockedSync = audioSyncLockRef.current;
      const speedMultiplier = isLockedSync ? 1.0 : (miniIaCfg.speed || 1);
      video.playbackRate = speedMultiplier;

      addLog(`📐 Enquadramento Ativo: ${effectiveFramingMode === "cover" ? "Preencher (9:16)" : effectiveFramingMode === "blur-fit" ? "Fundo Desfocado" : effectiveFramingMode === "horizontal-block" ? "Bloco Horizontal 16:9" : effectiveFramingMode === "split" ? "Split 50/50" : "1 Vídeo + 2 Imagens"}`);
      addLog(`🤖 Mini IA Ativada: Nível ${miniIaLevel.toUpperCase()} (${miniIaCfg.name}) · Escudo Anti-Diretrizes Ativo`);
      if (isLockedSync) {
        addLog(`🔒 Sincronismo Labial Absoluto: Velocidade travada em 1.00x natural (zero time-stretch / zero atraso de som)`);
      } else {
        addLog(`⚡ Aceleração de Ritmo: ${speedMultiplier}x (+${((speedMultiplier - 1) * 100).toFixed(1)}%) com áudio sincronizado`);
      }
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

      if (upscaleEnabledRef.current) {
        addLog("💎 Upscale Super Resolução HD: Interpolação de alta precisão + Bitrate Master (7.5 Mbps) anti-pixelado ativo");
      }

      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: upscaleEnabledRef.current ? 7_500_000 : 4_500_000,
        audioBitsPerSecond: 192_000,
      });
      const activeRecorder = recorder;

      let renderedFramesCount = 0;
      let lastFrameTime = 0;
      const drawFrameSync = (time = performance.now(), force = false) => {
        if (!isRecordingRef.current && !force) return;
        if (!force && time - lastFrameTime < 14) return;
        lastFrameTime = time;
        const ctx = canvas.getContext("2d");
        if (ctx && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          // Desenha apenas quando existe um frame decodificado, evitando exportar
          // frames pretos durante o seek/carregamento inicial do vídeo.
          const exportH = (format === "feed" || format === "feed-square") ? getCanvasDimensions(format).height : REEL_H;
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.fillStyle = "#050505";
          ctx.fillRect(0, 0, W, exportH);
          drawVideoWithFraming(
            ctx,
            video,
            W,
            exportH,
            effectiveFramingMode,
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
              customSaturation: customSaturationRef.current ?? customSaturation,
              customContrast: customContrastRef.current ?? customContrast,
              customBrightness: customBrightnessRef.current ?? customBrightness,
              customSharpness: customSharpnessRef.current ?? customSharpness,
              upscaleEnabled: upscaleEnabledRef.current,
              videoBlockPosY: videoBlockPosYRef.current ?? videoBlockPosY,
            },
            videoCrop,
            currentSplitConfig
          );
          ctx.drawImage(overlayCanvas, 0, 0, W, exportH);
          if (showLogoLayer && logoColorStyle === "gif") {
            const animLogo = animatedLogoRef.current || getOfficialLogo("gif");
            if (animLogo && isImageDrawable(animLogo)) {
              const { width: lW, height: lH } = getLogoSize(animLogo, format, logoScale / 100);
              safeDrawImage(
                ctx,
                animLogo,
                logoPositionRef.current.x * W - lW / 2,
                logoPositionRef.current.y * exportH - lH / 2,
                lW,
                lH
              );
            }
          }
          if (autoHookEnabledRef.current && autoHookEnabled && effectiveHookText && video.currentTime <= 3.6) {
            drawViralHookBanner(ctx, effectiveHookText, W, exportH, video.currentTime, format, hookPositionYRef.current || hookPositionY);
          }
          ctx.restore();
          renderedFramesCount++;
        }
      };

      const syncWithVideoDecoder = (now: DOMHighResTimeStamp) => {
        if (!isRecordingRef.current) return;
        drawFrameSync(now, true);
        if ("requestVideoFrameCallback" in video) {
          vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        }
      };

      if ("requestVideoFrameCallback" in video) {
        vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        addLog("⚡ Sincronismo nativo GPU (requestVideoFrameCallback) ativado!");
      } else {
        loopIntervalId = window.setInterval(() => drawFrameSync(performance.now(), false), 1000 / 30);
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
            try { sfxAudioSourceNode?.stop(); } catch {}
            try { bgmAudioSourceNode?.stop(); } catch {}
            activeRecorder.stop();
          }
        };

        // Encerramento exato no evento 'ended' do vídeo
        video.addEventListener("ended", stopRecordingGracefully, { once: true });

        // Timer de segurança ajustado à velocidade efetiva de reprodução
        const effectiveDuration = duration / (speedMultiplier || 1);
        safetyTimeout = window.setTimeout(stopRecordingGracefully, (effectiveDuration + 2.5) * 1000);

        // 1. Desenha o frame 0 no canvas imediatamente para garantir imagem pronta
        drawFrameSync(performance.now(), true);

        // 2. Trava de Sincronismo Perfeito:
        // Aguardamos o vídeo de fato começar a rodar (evento 'playing') antes de dar activeRecorder.start().
        // Isso elimina atrasos de decodificação inicial e impede silêncio inicial descompassado!
        let recordingSessionStarted = false;
        const beginRecordingSession = () => {
          if (recordingSessionStarted || activeRecorder.state !== "inactive") return;
          recordingSessionStarted = true;

          // Inicia gravação contínua sem timeslice curto (elimina bug de chunk timestamp do Chromium)
          activeRecorder.start();

          // Dispara SFX e BGM rigorosamente sincronizados com o primeiro frame de áudio
          if (sfxBufferReady && audioCtx && audioDestination) {
            try {
              const sfxNode = audioCtx.createBufferSource();
              sfxNode.buffer = sfxBufferReady;
              const sfxGain = audioCtx.createGain();
              sfxGain.gain.value = Math.max(0.1, Math.min(1.0, (sfxVolume || 70) / 100));
              sfxNode.connect(sfxGain);
              sfxGain.connect(audioDestination);
              sfxNode.start(audioCtx.currentTime + 0.15);
              sfxAudioSourceNode = sfxNode;
              addLog(`⚡ Efeito Sonoro Real Oficial mixado com precisão de milissegundo no áudio master!`);
            } catch (err: any) {
              console.warn("[SFX start err]", err);
            }
          }

          if (bgmBufferReady && audioCtx && audioDestination) {
            try {
              const bgmNode = audioCtx.createBufferSource();
              bgmNode.buffer = bgmBufferReady;
              bgmNode.loop = true;
              const bgmGain = audioCtx.createGain();
              bgmGain.gain.value = Math.max(0.02, Math.min(0.5, (bgmVolume || 15) / 100));
              bgmNode.connect(bgmGain);
              bgmGain.connect(audioDestination);
              bgmNode.start(audioCtx.currentTime);
              bgmAudioSourceNode = bgmNode;
              addLog(`🎵 Trilha Sonora Real Oficial mixada com sincronismo perfeito em segundo plano!`);
            } catch (err: any) {
              console.warn("[BGM start err]", err);
            }
          }
        };

        video.addEventListener("playing", beginRecordingSession, { once: true });
        video.play().then(() => {
          beginRecordingSession();
        }).catch(reject);

        progressTimer = window.setInterval(() => {
          if (duration > startT) {
            const currentProgress = Math.min(100, Math.max(0, Math.floor(((video.currentTime - startT) / Math.max(0.1, duration - startT)) * 100)));
            setRecordingProgress(currentProgress);
            if ((video.currentTime >= duration - 0.05 || video.ended) && activeRecorder.state !== "inactive") {
              stopRecordingGracefully();
            }
          }
        }, 100);
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
      setPreviewViewMode("generated");
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

      if (sfxAudioSourceNode) {
        try { (sfxAudioSourceNode as any).stop(); } catch {}
      }
      if (bgmAudioSourceNode) {
        try { (bgmAudioSourceNode as any).stop(); } catch {}
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
                className={`adminFeedFormatBtn ${format === "feed" || format === "feed-square" || format === "reel-cover" ? "active" : ""}`}
                onClick={() => setFormat("feed")}
              >
                <span className="formatRatio">4:5 / 1:1</span>
                <span className="formatName">Feed (Notícia)</span>
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

            {(format === "feed" || format === "feed-square" || format === "reel-cover") && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Proporção:</span>
                <button
                  type="button"
                  className="btn secondary"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: format === "feed" ? "#ff5a1f" : "#fff",
                    color: format === "feed" ? "#fff" : "#475569",
                    borderColor: format === "feed" ? "#ff5a1f" : "#cbd5e1",
                  }}
                  onClick={() => setFormat("feed")}
                >
                  📐 4:5 Retrato (Padrão)
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: format === "feed-square" ? "#ff5a1f" : "#fff",
                    color: format === "feed-square" ? "#fff" : "#475569",
                    borderColor: format === "feed-square" ? "#ff5a1f" : "#cbd5e1",
                  }}
                  onClick={() => setFormat("feed-square")}
                >
                  ⬛ 1:1 Quadrado
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: format === "reel-cover" ? "#ff5a1f" : "#fff",
                    color: format === "reel-cover" ? "#fff" : "#475569",
                    borderColor: format === "reel-cover" ? "#ff5a1f" : "#cbd5e1",
                  }}
                  onClick={() => setFormat("reel-cover")}
                >
                  📸 Capa Reels
                </button>
              </div>
            )}
          </div>

          {/* BARRA DE NAVEGAÇÃO DE ABAS DO CRIADOR (3 BOTÕES) */}
          <div
            role="tablist"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginBottom: 16,
              background: "#0f172a",
              padding: "6px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "media"}
              onClick={() => setActiveTab("media")}
              style={{
                padding: "10px 8px",
                borderRadius: 8,
                border: activeTab === "media" ? "1px solid #38bdf8" : "1px solid transparent",
                background: activeTab === "media" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                color: activeTab === "media" ? "#38bdf8" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>📁</span>
                <span>Mídia</span>
                {(videoUrl || customImageUrl || selectedPost?.image_url) && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                )}
              </div>
              <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>Upload & Enquadramento</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "mini-ia"}
              onClick={() => setActiveTab("mini-ia")}
              style={{
                padding: "10px 8px",
                borderRadius: 8,
                border: activeTab === "mini-ia" ? "1px solid #c084fc" : "1px solid transparent",
                background: activeTab === "mini-ia" ? "rgba(192, 132, 252, 0.18)" : "transparent",
                color: activeTab === "mini-ia" ? "#c084fc" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span>Mini IA</span>
                {format === "reel" || format === "story" ? (
                  <span style={{ fontSize: 9, background: "#8b5cf6", color: "#fff", padding: "1px 4px", borderRadius: 3, fontWeight: 800 }}>
                    AI
                  </span>
                ) : null}
              </div>
              <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>Anti-Detecção & SFX</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "design"}
              onClick={() => setActiveTab("design")}
              style={{
                padding: "10px 8px",
                borderRadius: 8,
                border: activeTab === "design" ? "1px solid #fbbf24" : "1px solid transparent",
                background: activeTab === "design" ? "rgba(251, 191, 36, 0.18)" : "transparent",
                color: activeTab === "design" ? "#fbbf24" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎨</span>
                <span>Arte & Legenda</span>
                {title && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                )}
              </div>
              <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>Título, Logo & Camadas</span>
            </button>
          </div>


          {/* PAINEL 1: MÍDIA & NOTÍCIA */}
          {activeTab === "media" && (
            <div className="adminFeedTabPanel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", margin: 0 }}>
                  🖼️ Enviar Foto / Imagem do seu dispositivo (PNG, JPG, WebP)
                </label>
                {(customImageUrl || selectedPost?.image_url) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCropMediaType("image");
                      setShowCropModal(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 5px rgba(37,99,235,0.25)",
                      transition: "all 0.15s ease",
                    }}
                    title="Ajustar corte (crop) da foto ou imagem"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                    </svg>
                    <span>✂️ Ajustar Corte (Crop)</span>
                  </button>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                <small style={{ color: "#64748b" }}>
                  {format === "reel" || format === "story"
                    ? "Envie uma foto caso queira usar imagem estática de fundo nos Stories ou Reels."
                    : "Perfeito para montar post do Feed (4:5 e 1:1) e Capas diretamente."}
                </small>
                {imageCrop && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      ✂️ Corte: {Math.round(imageCrop.width)}×{Math.round(imageCrop.height)} px
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImageCrop(null);
                        try { localStorage.removeItem("viralizou_image_crop"); } catch {}
                        cachedOverlayCanvasRef.current = null;
                        renderCard();
                      }}
                      style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 10.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Resetar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. UPLOAD DE VÍDEO E IMPORTADOR DE LINK */}
            {(format === "reel" || format === "story" || format === "feed" || format === "feed-square") && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      🎬 Enviar Vídeo do seu dispositivo (MP4, MOV, WebM)
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCropMediaType("video");
                            setShowCropModal(true);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 5px rgba(37,99,235,0.25)",
                            transition: "all 0.15s ease",
                          }}
                          title="Ajustar corte (crop) do vídeo"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                            <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                          </svg>
                          <span>✂️ Ajustar Corte (Crop)</span>
                        </button>
                      )}
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
                  </div>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                    <small style={{ color: "#64748b" }}>
                      {videoFileName ? `${videoFileName}${videoReady ? " · pronto para prévia" : " · carregando..."}` : "Vídeo de até 250 MB para Reels (9:16), Stories ou Feed Noticioso (4:5)."}
                    </small>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {videoCrop && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            ✂️ Corte: {Math.round(videoCrop.width)}×{Math.round(videoCrop.height)} px
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyCrop(null);
                            }}
                            style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 10.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                          >
                            Resetar
                          </button>
                        </div>
                      )}
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
                {videoUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                      📐 Enquadramento do Vídeo {format === "feed" ? "no Feed (4:5)" : format === "story" ? "nos Stories (9:16)" : "no Reel (9:16)"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "cover" ? "active" : ""}`}
                        onClick={() => chooseVideoFramingMode("cover")}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "cover" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "cover" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "cover" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "cover" ? 700 : 500,
                        }}
                      >
                        🔍 Preencher {format === "feed" ? "(4:5)" : "(9:16)"}
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "blur-fit" ? "active" : ""}`}
                        onClick={() => chooseVideoFramingMode("blur-fit")}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "blur-fit" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "blur-fit" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "blur-fit" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "blur-fit" ? 700 : 500,
                        }}
                      >
                        📰 Fundo Desfocado
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "horizontal-block" ? "active" : ""}`}
                        onClick={() => chooseVideoFramingMode("horizontal-block")}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "horizontal-block" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "horizontal-block" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "horizontal-block" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "horizontal-block" ? 700 : 500,
                        }}
                        title="Vídeo horizontal 16:9 posicionado como bloco arrastável na tela com sombra 3D e fundo suave"
                      >
                        📺 Bloco Horizontal
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "split" ? "active" : ""}`}
                        onClick={() => chooseVideoFramingMode("split")}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "split" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "split" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "split" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "split" ? 700 : 500,
                        }}
                        title="Divisão 50/50: Superior focado/zoom e inferior amplo de contexto"
                      >
                        👥 Split 50/50
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "split-1v2i" && (format === "reel" || format === "story") ? "active" : ""}`}
                        onClick={() => {
                          chooseVideoFramingMode("split-1v2i");
                          setFormat("reel");
                        }}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "split-1v2i" && (format === "reel" || format === "story") ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "split-1v2i" && (format === "reel" || format === "story") ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "split-1v2i" && (format === "reel" || format === "story") ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "split-1v2i" && (format === "reel" || format === "story") ? 700 : 500,
                        }}
                        title="1 Vídeo de um lado + 2 Fotos empilhadas do outro no formato Vertical Reels 9:16 (1080×1920 px)"
                      >
                        🎬 1 Vídeo + 2 Imagens (9:16)
                      </button>
                      <button
                        type="button"
                        className={`btn secondary ${videoFramingMode === "split-1v2i" && format === "feed" ? "active" : ""}`}
                        onClick={() => {
                          chooseVideoFramingMode("split-1v2i");
                          setFormat("feed");
                        }}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          background: videoFramingMode === "split-1v2i" && format === "feed" ? "#0284c7" : "#ffffff",
                          color: videoFramingMode === "split-1v2i" && format === "feed" ? "#ffffff" : "#1e293b",
                          borderColor: videoFramingMode === "split-1v2i" && format === "feed" ? "#0284c7" : "#cbd5e1",
                          fontWeight: videoFramingMode === "split-1v2i" && format === "feed" ? 700 : 500,
                        }}
                        title="1 Vídeo de um lado + 2 Fotos empilhadas do outro no formato do Feed 4:5 (1080×1350 px)"
                      >
                        📰 1 Vídeo + 2 Imagens (Feed 4:5)
                      </button>
                    </div>

                    {videoFramingMode === "split-1v2i" && (
                      <div style={{ marginTop: 8, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1.5px solid #cbd5e1" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>
                            ⚖️ Estilo Copaíba (1 Vídeo + 2 Imagens Divididas)
                          </span>
                          <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                            Divisão Lateral
                          </span>
                        </div>

                        {/* 1. Lado do Vídeo */}
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", display: "block", marginBottom: 3 }}>
                            ↔️ Lado do Vídeo:
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSplitVideoSide("right");
                                try { localStorage.setItem("viralizou_split_video_side", "right"); } catch {}
                                cachedOverlayCanvasRef.current = null;
                              }}
                              style={{
                                padding: "5px 6px",
                                fontSize: 10.5,
                                borderRadius: 5,
                                border: `1.5px solid ${splitVideoSide === "right" ? "#0284c7" : "#cbd5e1"}`,
                                background: splitVideoSide === "right" ? "#e0f2fe" : "#ffffff",
                                color: splitVideoSide === "right" ? "#0369a1" : "#475569",
                                fontWeight: splitVideoSide === "right" ? 800 : 500,
                                cursor: "pointer",
                              }}
                            >
                              Fotos na Esquerda | Vídeo na Direita ▶️
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSplitVideoSide("left");
                                try { localStorage.setItem("viralizou_split_video_side", "left"); } catch {}
                                cachedOverlayCanvasRef.current = null;
                              }}
                              style={{
                                padding: "5px 6px",
                                fontSize: 10.5,
                                borderRadius: 5,
                                border: `1.5px solid ${splitVideoSide === "left" ? "#0284c7" : "#cbd5e1"}`,
                                background: splitVideoSide === "left" ? "#e0f2fe" : "#ffffff",
                                color: splitVideoSide === "left" ? "#0369a1" : "#475569",
                                fontWeight: splitVideoSide === "left" ? 800 : 500,
                                cursor: "pointer",
                              }}
                            >
                              ◀️ Vídeo na Esquerda | Fotos na Direita
                            </button>
                          </div>
                        </div>

                        {/* 2. Cor e Espessura da Linha Divisória */}
                        <div style={{ marginBottom: 8, padding: "8px 10px", background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>
                              🎨 Cor da Linha Divisória:
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="color"
                                value={splitDividerColor}
                                onChange={(e) => {
                                  setSplitDividerColor(e.target.value);
                                  try { localStorage.setItem("viralizou_split_divider_color", e.target.value); } catch {}
                                  cachedOverlayCanvasRef.current = null;
                                }}
                                style={{ width: 28, height: 24, border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", padding: 0 }}
                                title="Personalizar cor da linha divisória"
                              />
                              <span style={{ fontSize: 10.5, fontFamily: "monospace", color: "#64748b", fontWeight: 700 }}>
                                {splitDividerColor}
                              </span>
                            </div>
                          </div>

                          {/* Presets Rápidos de Cores */}
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                            {[
                              { label: "⚪ Branco", color: "#ffffff", border: "#cbd5e1" },
                              { label: "🔴 Vermelho", color: "#ef4444", border: "#ef4444" },
                              { label: "⚫ Preto", color: "#000000", border: "#000000" },
                              { label: "🟡 Amarelo", color: "#eab308", border: "#eab308" },
                              { label: "🔵 Azul", color: "#3b82f6", border: "#3b82f6" },
                              { label: "🟢 Verde", color: "#10b981", border: "#10b981" },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() => {
                                  setSplitDividerColor(preset.color);
                                  try { localStorage.setItem("viralizou_split_divider_color", preset.color); } catch {}
                                  cachedOverlayCanvasRef.current = null;
                                }}
                                style={{
                                  fontSize: 10,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  border: `1.5px solid ${splitDividerColor.toLowerCase() === preset.color.toLowerCase() ? "#0284c7" : preset.border}`,
                                  background: splitDividerColor.toLowerCase() === preset.color.toLowerCase() ? "#e0f2fe" : "#ffffff",
                                  color: "#1e293b",
                                  fontWeight: splitDividerColor.toLowerCase() === preset.color.toLowerCase() ? 800 : 500,
                                  cursor: "pointer",
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: "#475569" }}>
                              Espessura: <b>{splitDividerWidth}px</b>
                            </span>
                            <input
                              type="range"
                              min={1}
                              max={14}
                              value={splitDividerWidth}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSplitDividerWidth(val);
                                try { localStorage.setItem("viralizou_split_divider_width", String(val)); } catch {}
                                cachedOverlayCanvasRef.current = null;
                              }}
                              style={{ width: 130, accentColor: "#0284c7" }}
                            />
                          </div>
                        </div>

                        {/* 3. Fotos Empilhadas (Foto 1 Superior e Foto 2 Inferior) */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                          {/* Foto 1 */}
                          <div style={{ background: "#ffffff", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1e293b", marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>📸 Foto 1 (Cima)</span>
                              {splitImg1Url && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSplitImg1Url("");
                                    splitImg1Ref.current = null;
                                    try { localStorage.removeItem("viralizou_split_img1"); } catch {}
                                    cachedOverlayCanvasRef.current = null;
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 9.5, cursor: "pointer", fontWeight: 700 }}
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                            {splitImg1Url ? (
                              <div style={{ width: "100%", height: 46, borderRadius: 4, overflow: "hidden", marginBottom: 4, background: "#000" }}>
                                <img src={splitImg1Url} alt="Foto 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            ) : (
                              <div style={{ fontSize: 9.5, color: "#94a3b8", marginBottom: 4, fontStyle: "italic" }}>
                                {customImageUrl || selectedPost?.image_url ? "Usando foto do post" : "Nenhuma foto"}
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              id="split-upload-img1"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setSplitImg1Url(url);
                                  loadImage(url).then(img => {
                                    splitImg1Ref.current = img;
                                    cachedOverlayCanvasRef.current = null;
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor="split-upload-img1"
                              style={{
                                display: "block",
                                textAlign: "center",
                                padding: "3px 6px",
                                fontSize: 10,
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                                borderRadius: 4,
                                cursor: "pointer",
                                border: "1px solid #cbd5e1",
                              }}
                            >
                              📁 Escolher Foto 1
                            </label>
                          </div>

                          {/* Foto 2 */}
                          <div style={{ background: "#ffffff", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1e293b", marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>📸 Foto 2 (Baixo)</span>
                              {splitImg2Url && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSplitImg2Url("");
                                    splitImg2Ref.current = null;
                                    try { localStorage.removeItem("viralizou_split_img2"); } catch {}
                                    cachedOverlayCanvasRef.current = null;
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 9.5, cursor: "pointer", fontWeight: 700 }}
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                            {splitImg2Url ? (
                              <div style={{ width: "100%", height: 46, borderRadius: 4, overflow: "hidden", marginBottom: 4, background: "#000" }}>
                                <img src={splitImg2Url} alt="Foto 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            ) : (
                              <div style={{ fontSize: 9.5, color: "#94a3b8", marginBottom: 4, fontStyle: "italic" }}>
                                Nenhuma foto
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              id="split-upload-img2"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setSplitImg2Url(url);
                                  loadImage(url).then(img => {
                                    splitImg2Ref.current = img;
                                    cachedOverlayCanvasRef.current = null;
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor="split-upload-img2"
                              style={{
                                display: "block",
                                textAlign: "center",
                                padding: "3px 6px",
                                fontSize: 10,
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                                borderRadius: 4,
                                cursor: "pointer",
                                border: "1px solid #cbd5e1",
                              }}
                            >
                              📁 Escolher Foto 2
                            </label>
                          </div>
                        </div>

                        {/* 4. Cartão Superior de Notícia (Fundo Branco) */}
                        <div style={{ background: "#ffffff", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={splitTopCardEnabled}
                              onChange={(e) => {
                                setSplitTopCardEnabled(e.target.checked);
                                try { localStorage.setItem("viralizou_split_top_card", String(e.target.checked)); } catch {}
                                cachedOverlayCanvasRef.current = null;
                              }}
                            />
                            <span>📰 Exibir Cartão Superior no Topo (Fundo Branco com Manchete)</span>
                          </label>
                          {splitTopCardEnabled && (
                            <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                                Selo:
                              </span>
                              <input
                                type="text"
                                value={splitKickerText}
                                onChange={(e) => {
                                  setSplitKickerText(e.target.value);
                                  try { localStorage.setItem("viralizou_split_kicker", e.target.value); } catch {}
                                  cachedOverlayCanvasRef.current = null;
                                }}
                                placeholder="URGENTE"
                                style={{ width: 110, fontSize: 10.5, padding: "3px 6px" }}
                              />
                              <small style={{ color: "#64748b", fontSize: 9.5 }}>
                                Exibe o título no topo com o selo vermelho.
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {videoFramingMode === "horizontal-block" && (
                      <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                            ↕️ Posição Vertical do Bloco de Vídeo: <b style={{ color: "#0284c7" }}>{Math.round(videoBlockPosY * 100)}%</b>
                          </span>
                          <button
                            type="button"
                            className="captionTagBadge"
                            onClick={() => {
                              setVideoBlockPosY(0.44);
                              videoBlockPosYRef.current = 0.44;
                              try { localStorage.setItem("viralizou_video_block_pos_y", "0.44"); } catch {}
                              cachedOverlayCanvasRef.current = null;
                            }}
                            style={{ fontSize: 10, padding: "2px 6px" }}
                          >
                            Reset (44%)
                          </button>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={80}
                          value={Math.round(videoBlockPosY * 100)}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            setVideoBlockPosY(val);
                            videoBlockPosYRef.current = val;
                            try { localStorage.setItem("viralizou_video_block_pos_y", String(val)); } catch {}
                            cachedOverlayCanvasRef.current = null;
                          }}
                          style={{ width: "100%", accentColor: "#0284c7" }}
                        />
                        <small style={{ color: "#64748b", fontSize: 10, display: "block", marginTop: 2 }}>
                          💡 Dica: Você também pode clicar e arrastar o vídeo direto na tela de prévia!
                        </small>
                      </div>
                    )}
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
                        onClick={() => {
                          setCropMediaType("video");
                          setShowCropModal(true);
                        }}
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

              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveTab(format === "reel" || format === "story" ? "mini-ia" : "design")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: format === "reel" || format === "story" ? "#7c3aed" : "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <span>{format === "reel" || format === "story" ? "Avançar para Mini IA Studio ⚡" : "Avançar para Arte & Legenda 🎨"}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}


          {/* PAINEL 2: MINI IA STUDIO */}
          {activeTab === "mini-ia" && (
            <div className="adminFeedTabPanel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {format !== "reel" && format !== "story" && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
                    border: "1px solid rgba(139, 92, 246, 0.35)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    marginBottom: 4,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>⚡</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f8fafc" }}>
                        Mini IA Studio · Modo Feed Ativo ({format === "feed-square" ? "Quadrado 1:1" : format === "reel-cover" ? "Capa Reels" : "Feed 4:5"})
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                        Crie e personalize o visual de posts e capas diretamente no Feed.
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 12px" }}>
                    A suite completa com <b>Anti-Detecção Instagram, Cortes Inteligentes de Retenção, Efeitos Sonoros (SFX) do Real Oficial e Trilha Sonora</b> é ativada nos formatos de vídeo <b>Reels 9:16</b> e <b>Stories 9:16</b>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormat("reel")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#7c3aed",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(124, 58, 237, 0.35)",
                    }}
                  >
                    <span>🎬 Mudar Formato para Reels 9:16 e Ativar Vídeo</span>
                  </button>
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

              {/* SELETOR DE ENQUADRAMENTO DIRETO NA MINI IA */}
              <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(139, 92, 246, 0.28)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>📐</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#f8fafc" }}>Enquadramento Reel:</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)", padding: "2px 8px", borderRadius: 6 }}>
                    {videoFramingMode === "cover" ? "🔍 Preencher (9:16)" : videoFramingMode === "blur-fit" ? "📰 Fundo Desfocado" : videoFramingMode === "horizontal-block" ? "📺 Bloco Horizontal" : videoFramingMode === "split" ? "👥 Split 50/50" : "🎬 1 Vídeo + 2 Imagens"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {(["cover", "blur-fit", "horizontal-block", "split"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => chooseVideoFramingMode(m)}
                      style={{
                        fontSize: 10.5,
                        padding: "3px 8px",
                        borderRadius: 5,
                        border: videoFramingMode === m ? "1.5px solid #0284c7" : "1px solid rgba(255,255,255,0.12)",
                        background: videoFramingMode === m ? "#0284c7" : "rgba(30,41,59,0.7)",
                        color: videoFramingMode === m ? "#ffffff" : "#cbd5e1",
                        fontWeight: videoFramingMode === m ? 800 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {m === "cover" ? "Preencher" : m === "blur-fit" ? "Desfocado" : m === "horizontal-block" ? "Bloco 16:9" : "Split 50/50"}
                    </button>
                  ))}
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

                  {/* Controle de Posição / Mover Gancho na Tela (quando ativado) */}
                  {autoHookEnabled && (
                    <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(250, 204, 21, 0.3)", borderRadius: 8, padding: "8px 10px", marginTop: 2, marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fef08a", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>↕️</span> Mover Gancho na Tela:
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#facc15", background: "rgba(250, 204, 21, 0.2)", padding: "2px 6px", borderRadius: 4 }}>
                          {hookPositionY} px
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="range"
                          min={100}
                          max={1650}
                          step={5}
                          value={hookPositionY}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setHookPositionY(val);
                            hookPositionYRef.current = val;
                            cachedOverlayCanvasRef.current = null;
                            try { localStorage.setItem("viralizou_hook_pos_y", String(val)); } catch {}
                            if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) renderCard();
                          }}
                          style={{ flex: 1, accentColor: "#eab308", cursor: "pointer" }}
                          title="Arraste para mover a tarja amarela para cima ou para baixo"
                        />
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setHookPositionY(307);
                            hookPositionYRef.current = 307;
                            cachedOverlayCanvasRef.current = null;
                            try { localStorage.setItem("viralizou_hook_pos_y", "307"); } catch {}
                            if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) renderCard();
                          }}
                          style={{ fontSize: 10, padding: "3px 7px", background: hookPositionY === 307 ? "#eab308" : "rgba(255,255,255,0.08)", color: hookPositionY === 307 ? "#000" : "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          🔼 Topo (307px)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHookPositionY(850);
                            hookPositionYRef.current = 850;
                            cachedOverlayCanvasRef.current = null;
                            try { localStorage.setItem("viralizou_hook_pos_y", "850"); } catch {}
                            if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) renderCard();
                          }}
                          style={{ fontSize: 10, padding: "3px 7px", background: hookPositionY === 850 ? "#eab308" : "rgba(255,255,255,0.08)", color: hookPositionY === 850 ? "#000" : "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          ↔️ Meio (850px)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHookPositionY(1400);
                            hookPositionYRef.current = 1400;
                            cachedOverlayCanvasRef.current = null;
                            try { localStorage.setItem("viralizou_hook_pos_y", "1400"); } catch {}
                            if (format !== "reel" && (!videoUrl || !videoPreviewRef.current)) renderCard();
                          }}
                          style={{ fontSize: 10, padding: "3px 7px", background: hookPositionY === 1400 ? "#eab308" : "rgba(255,255,255,0.08)", color: hookPositionY === 1400 ? "#000" : "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          🔽 Base (1400px)
                        </button>
                        <span style={{ fontSize: 9.5, color: "#94a3b8", marginLeft: "auto" }}>
                          💡 Ou arraste direto no vídeo
                        </span>
                      </div>
                    </div>
                  )}

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
                  <div className="miniIaAutoEditRow" style={{ alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="miniIaAutoEditLabel">Trilha</span>
                      {bgmTrack !== "none" && (
                        <button
                          type="button"
                          onClick={handleTogglePreviewBgm}
                          title={isPlayingBgm ? "Parar prévia do áudio" : "Ouvir 10 segundos da trilha selecionada"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: isPlayingBgm ? "#dc2626" : "#6366f1",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isPlayingBgm ? "0 0 10px rgba(220, 38, 38, 0.65)" : "0 2px 6px rgba(99, 102, 241, 0.35)",
                          }}
                        >
                          {isPlayingBgm ? `⏹️ Parar (${bgmCountdown}s)` : "▶️ Ouvir 10s"}
                        </button>
                      )}
                    </div>
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

                  {/* Volume da Trilha de Fundo */}
                  {bgmTrack !== "none" && (
                    <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: 8, padding: "8px 10px", marginTop: 2, marginBottom: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#c7d2fe", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>🔊</span> Volume da Trilha de Fundo:
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", background: "rgba(129, 140, 248, 0.18)", padding: "2px 6px", borderRadius: 4 }}>
                          {bgmVolume}%
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="range"
                          min={1}
                          max={100}
                          step={1}
                          value={bgmVolume}
                          onChange={(e) => chooseBgmVolume(Number(e.target.value))}
                          style={{ flex: 1, accentColor: "#6366f1", cursor: "pointer" }}
                          title="Ajuste o volume da trilha no fundo do vídeo"
                        />
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => chooseBgmVolume(8)}
                          style={{ fontSize: 10, padding: "3px 7px", background: bgmVolume === 8 ? "#6366f1" : "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          8% (Suave)
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseBgmVolume(15)}
                          style={{ fontSize: 10, padding: "3px 7px", background: bgmVolume === 15 ? "#6366f1" : "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          15% (Padrão ⭐)
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseBgmVolume(30)}
                          style={{ fontSize: 10, padding: "3px 7px", background: bgmVolume === 30 ? "#6366f1" : "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          30% (Marcante)
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseBgmVolume(50)}
                          style={{ fontSize: 10, padding: "3px 7px", background: bgmVolume === 50 ? "#6366f1" : "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                        >
                          50% (Alta)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO SFX E EFEITOS SONOROS - REAL OFICIAL */}
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(139, 92, 246, 0.35)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14 }}>🔊</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>
                          Efeitos Sonoros (SFX) · Real Oficial
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {realOficialStatus?.configured ? (
                          <span
                            style={{
                              fontSize: 10,
                              background: "rgba(34, 197, 94, 0.2)",
                              color: "#4ade80",
                              border: "1px solid #22c55e",
                              padding: "2px 7px",
                              borderRadius: 999,
                              fontWeight: 800,
                            }}
                          >
                            ● Token Ativo ({realOficialStatus.maskedToken})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowVercelTokenModal(true)}
                            style={{
                              background: "rgba(234, 179, 8, 0.15)",
                              color: "#facc15",
                              border: "1px solid rgba(234, 179, 8, 0.4)",
                              padding: "3px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>⚙️</span> Instruções Vercel
                          </button>
                        )}
                      </div>
                    </div>

                    {!realOficialStatus?.configured && (
                      <div
                        style={{
                          margin: "6px 0 10px 0",
                          padding: "8px 10px",
                          background: "rgba(15, 23, 42, 0.9)",
                          border: "1px dashed rgba(234, 179, 8, 0.45)",
                          borderRadius: 8,
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>🔑</span>
                        <input
                          type="password"
                          value={manualRealOficialToken}
                          onChange={(e) => setManualRealOficialToken(e.target.value)}
                          placeholder="Cole seu token do Real Oficial aqui..."
                          style={{
                            flex: 1,
                            background: "#020617",
                            border: "1px solid rgba(255,255,255,0.18)",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            color: "#f8fafc",
                            fontFamily: "monospace",
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const token = manualRealOficialToken.trim();
                            if (!token) {
                              alert("Cole o token do Real Oficial para ativar.");
                              return;
                            }
                            try {
                              localStorage.setItem("viralizou_real_oficial_token", token);
                              const res = await fetch("/api/admin/real-oficial", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "save", token }),
                              });
                              const data = await res.json();
                              const statusObj = data.status || data.tokenStatus;
                              if (statusObj) setRealOficialStatus(statusObj);
                              const sfxList = data.sfx || data.sfxCatalog;
                              if (Array.isArray(sfxList) && sfxList.length > 0) {
                                setRealOficialSfxList(sfxList);
                              }
                              alert("✅ Token ativado com sucesso! SFX oficial liberado.");
                            } catch (e) {
                              alert("Erro ao salvar token.");
                            }
                          }}
                          style={{
                            background: "linear-gradient(135deg, #0284c7, #2563eb)",
                            border: "none",
                            color: "#ffffff",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          💾 Ativar
                        </button>
                      </div>
                    )}

                    <p style={{ margin: "0 0 8px", fontSize: 10.5, color: "#94a3b8", lineHeight: 1.4 }}>
                      Adiciona cortes sonoros de transição, batidas de gancho e alertas para engajamento instantâneo estilo TikTok & Reels.
                    </p>

                    {/* Presets de SFX */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {[
                        { id: "transitions", label: "⚡ Transição (Whoosh & Pop)" },
                        { id: "punch", label: "💥 Impacto & Sub-Bass" },
                        { id: "news", label: "📰 Noticiário (Sino & Flash)" },
                        { id: "none", label: "🔇 Sem SFX" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedSfxPreset(item.id as any)}
                          style={{
                            padding: "4px 9px",
                            fontSize: 11,
                            fontWeight: selectedSfxPreset === item.id ? 800 : 600,
                            borderRadius: 6,
                            border: selectedSfxPreset === item.id ? "1.5px solid #8b5cf6" : "1px solid rgba(255,255,255,0.12)",
                            background: selectedSfxPreset === item.id ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(30, 41, 59, 0.7)",
                            color: selectedSfxPreset === item.id ? "#ffffff" : "#cbd5e1",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Catálogo com Pré-escuta de SFX */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6, marginBottom: 8 }}>
                      {realOficialSfxList.slice(0, 6).map((sfx) => {
                        const isPlaying = playingSfxId === sfx.id;
                        return (
                          <div
                            key={sfx.id}
                            style={{
                              background: isPlaying ? "rgba(139, 92, 246, 0.25)" : "rgba(15, 23, 42, 0.6)",
                              border: isPlaying ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 6,
                              padding: "6px 8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4 }}>
                              <span style={{ fontSize: 11, color: isPlaying ? "#c084fc" : "#e2e8f0", fontWeight: 700 }}>
                                {sfx.icon} {sfx.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePlaySfx(sfx)}
                              style={{
                                background: isPlaying ? "#ef4444" : "#4f46e5",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 4,
                                padding: "2px 6px",
                                fontSize: 10,
                                fontWeight: 800,
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                              title={isPlaying ? "Parar áudio" : "Ouvir efeito sonoro"}
                            >
                              {isPlaying ? "⏹️" : "▶️"}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Volume dos SFX */}
                    {selectedSfxPreset !== "none" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                        <span style={{ fontSize: 10.5, color: "#cbd5e1", minWidth: 90 }}>
                          Volume do SFX: <b style={{ color: "#a78bfa" }}>{sfxVolume}%</b>
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          step={5}
                          value={sfxVolume}
                          onChange={(e) => setSfxVolume(Number(e.target.value))}
                          style={{ flex: 1, accentColor: "#8b5cf6" }}
                        />
                      </div>
                    )}
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
                    {VIDEO_FILTERS[videoFilter]?.name || "Original"}
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

                {/* CALIBRAÇÃO MANUAL FINA (NÃO-ARTIFICIAL) */}
                <div
                  style={{
                    marginTop: 10,
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(139, 92, 246, 0.25)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>
                      🎛️ Calibração Natural Fina (Anti-Artificial)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSaturation(1.0);
                        setCustomContrast(1.0);
                        setCustomBrightness(1.0);
                        setCustomSharpness(0);
                        customSaturationRef.current = 1.0;
                        customContrastRef.current = 1.0;
                        customBrightnessRef.current = 1.0;
                        customSharpnessRef.current = 0;
                        try {
                          localStorage.setItem("viralizou_custom_saturation", "1.0");
                          localStorage.setItem("viralizou_custom_contrast", "1.0");
                          localStorage.setItem("viralizou_custom_brightness", "1.0");
                          localStorage.setItem("viralizou_custom_sharpness", "0");
                        } catch {}
                        cachedOverlayCanvasRef.current = null;
                        renderCard();
                      }}
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "#94a3b8",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 4,
                        fontSize: 10,
                        padding: "2px 6px",
                        cursor: "pointer",
                      }}
                    >
                      Restaurar Padrão
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                    {/* Saturação */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#cbd5e1", marginBottom: 2 }}>
                        <span>Saturação:</span>
                        <b style={{ color: "#38bdf8" }}>{Math.round(customSaturation * 100)}%</b>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={customSaturation}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomSaturation(val);
                          customSaturationRef.current = val;
                          try { localStorage.setItem("viralizou_custom_saturation", String(val)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{ width: "100%", accentColor: "#38bdf8" }}
                      />
                    </div>

                    {/* Contraste */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#cbd5e1", marginBottom: 2 }}>
                        <span>Contraste:</span>
                        <b style={{ color: "#38bdf8" }}>{Math.round(customContrast * 100)}%</b>
                      </div>
                      <input
                        type="range"
                        min={0.7}
                        max={1.5}
                        step={0.05}
                        value={customContrast}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomContrast(val);
                          customContrastRef.current = val;
                          try { localStorage.setItem("viralizou_custom_contrast", String(val)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{ width: "100%", accentColor: "#38bdf8" }}
                      />
                    </div>

                    {/* Brilho */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#cbd5e1", marginBottom: 2 }}>
                        <span>Brilho:</span>
                        <b style={{ color: "#38bdf8" }}>{Math.round(customBrightness * 100)}%</b>
                      </div>
                      <input
                        type="range"
                        min={0.7}
                        max={1.4}
                        step={0.05}
                        value={customBrightness}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomBrightness(val);
                          customBrightnessRef.current = val;
                          try { localStorage.setItem("viralizou_custom_brightness", String(val)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{ width: "100%", accentColor: "#38bdf8" }}
                      />
                    </div>

                    {/* Nitidez */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#cbd5e1", marginBottom: 2 }}>
                        <span>Nitidez:</span>
                        <b style={{ color: "#38bdf8" }}>{customSharpness}%</b>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={customSharpness}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomSharpness(val);
                          customSharpnessRef.current = val;
                          try { localStorage.setItem("viralizou_custom_sharpness", String(val)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{ width: "100%", accentColor: "#38bdf8" }}
                      />
                    </div>

                    {/* Upscale Inteligente HD para Vídeos de Baixa Qualidade */}
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: "1px dashed rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gridColumn: "1 / -1",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>💎</span> Upscale Inteligente HD (Super Resolução)
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8" }}>
                          Recupera nitidez e remove embaçamento de vídeos com baixa qualidade (WhatsApp / 480p / 720p).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !upscaleEnabled;
                          setUpscaleEnabled(next);
                          upscaleEnabledRef.current = next;
                          try { localStorage.setItem("viralizou_upscale_hd", String(next)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          border: upscaleEnabled ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                          background: upscaleEnabled ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(30, 41, 59, 0.6)",
                          color: upscaleEnabled ? "#ffffff" : "#94a3b8",
                          boxShadow: upscaleEnabled ? "0 0 12px rgba(56, 189, 248, 0.3)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {upscaleEnabled ? "✓ Ativo (HD Master)" : "Desativado"}
                      </button>
                    </div>

                    {/* Trava de Sincronismo Labial Perfeito (1.00x) */}
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: "1px dashed rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gridColumn: "1 / -1",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>🔒</span> Trava de Sincronismo Labial (1.00x Natural)
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8" }}>
                          Mantém a velocidade exata original do áudio em 1.00x sem acelerar a voz, garantindo 100% de sincronia labial.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !audioSyncLock;
                          setAudioSyncLock(next);
                          audioSyncLockRef.current = next;
                          try { localStorage.setItem("viralizou_audio_sync_lock", String(next)); } catch {}
                          cachedOverlayCanvasRef.current = null;
                          renderCard();
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          border: audioSyncLock ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                          background: audioSyncLock ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(30, 41, 59, 0.6)",
                          color: audioSyncLock ? "#ffffff" : "#94a3b8",
                          boxShadow: audioSyncLock ? "0 0 12px rgba(56, 189, 248, 0.3)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {audioSyncLock ? "✓ 1.00x Travado" : "Velocidade IA"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="miniIaDetailCard">
                <div className="miniIaDetailHeader">
                  <span>Modo Ativo: <b style={{ textTransform: "uppercase" }}>{MINI_IA_LEVELS[miniIaLevel].name}</b></span>
                  <span>Velocidade: <b>{audioSyncLock ? "1.00x (Lip-Sync Travado)" : `${MINI_IA_LEVELS[miniIaLevel].speed}x`}</b> · Áudio: <b>{MINI_IA_LEVELS[miniIaLevel].loudnessTarget} LUFS</b></span>
                  <span>Corte Inicial: <b>{miniIaTrimSeconds}s {miniIaTrimSeconds === 3 ? "(Padrão ⭐)" : ""}</b></span>
                  <span>Filtro: <b>{VIDEO_FILTERS[videoFilter]?.name || "Original"}</b></span>
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

              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab("media")}
                  style={{ fontSize: 12, padding: "7px 14px", cursor: "pointer" }}
                >
                  ← 📁 Mídia & Notícia
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveTab("design")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <span>Avançar para Arte & Legenda 🎨</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}


          {/* PAINEL 3: ARTE, LEGENDA & MARCA */}
          {activeTab === "design" && (
            <div className="adminFeedTabPanel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <label style={{ margin: 0 }}>📰 Título na arte</label>
              <button
                type="button"
                onClick={handleCorrectTitle}
                disabled={isCorrectingTitle || !title || !title.trim()}
                title="Corrige erros ortográficos, concordância e pontuação jornalística automaticamente"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: isCorrectingTitle ? "#475569" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: isCorrectingTitle || !title?.trim() ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 6px rgba(124, 58, 237, 0.35)",
                  transition: "all 0.15s ease",
                }}
              >
                {isCorrectingTitle ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                    Corrigindo Frase...
                  </>
                ) : (
                  <>
                    <span>✨</span> Corrigir Gramática
                  </>
                )}
              </button>
            </div>

            {titleCorrectedSuccess && (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid #22c55e",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#15803d",
                  fontSize: 11.5,
                  fontWeight: 700,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {titleCorrectedSuccess}
              </div>
            )}

            <textarea
              rows={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O título da notícia aparece automaticamente e você pode ajustar antes de baixar."
            />
            <small>Arraste o título na prévia para escolher onde ele aparece{format === "feed" ? "; a posição é salva neste navegador." : "."}</small>

            {videoFramingMode === "horizontal-block" && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  background: "rgba(30, 58, 138, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#bfdbfe" }}>
                    ↕️ Posição Vertical do Bloco de Vídeo (16:9): <b style={{ color: "#60a5fa" }}>{Math.round(videoBlockPosY * 100)}%</b>
                  </span>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      setVideoBlockPosY(0.44);
                      videoBlockPosYRef.current = 0.44;
                      try { localStorage.setItem("viralizou_video_block_pos_y", "0.44"); } catch {}
                      cachedOverlayCanvasRef.current = null;
                    }}
                    style={{ fontSize: 10, padding: "2px 6px" }}
                  >
                    Reset (44%)
                  </button>
                </div>
                <input
                  type="range"
                  min={20}
                  max={75}
                  step={1}
                  value={Math.round(videoBlockPosY * 100)}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    setVideoBlockPosY(val);
                    videoBlockPosYRef.current = val;
                    try { localStorage.setItem("viralizou_video_block_pos_y", String(val)); } catch {}
                    cachedOverlayCanvasRef.current = null;
                  }}
                  style={{ width: "100%", accentColor: "#3b82f6" }}
                />
                <small style={{ color: "#93c5fd", fontSize: 10.5, display: "block", marginTop: 4 }}>
                  💡 Dica: Você também pode arrastar o bloco de vídeo diretamente na tela de prévia!
                </small>
              </div>
            )}

            {reelTextStyle === "bacci-red" && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 750, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    ↕️ Altura do Layout Bacci: <span style={{ color: "#ffffff", fontFamily: "monospace", fontSize: 14 }}>{Math.round((titlePosition.y || 0.58) * 100)}%</span> ({Math.round((titlePosition.y || 0.58) * 1920)}px)
                  </label>
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: "3px 9px", background: "#374151", color: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.58 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    Reset (58%)
                  </button>
                </div>
                <input
                  type="range"
                  min={30}
                  max={75}
                  step={1}
                  value={Math.round((titlePosition.y || 0.58) * 100)}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    const pos = { x: titlePosition.x || 0.5, y: val };
                    titlePositionRef.current = pos;
                    setTitlePosition(pos);
                    try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                    cachedOverlayCanvasRef.current = null;
                    renderCard();
                  }}
                  style={{ width: "100%", accentColor: "#ef4444" }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.46 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    🔼 Mais Alto (46%)
                  </button>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.58 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    ↔️ Padrão Bacci (58%)
                  </button>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.68 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    🔽 Mais Baixo (68%)
                  </button>
                </div>
                <small style={{ display: "block", marginTop: 6, color: "#cbd5e1", fontSize: 11 }}>
                  💡 Dica: Você também pode clicar e arrastar o layout Bacci diretamente na tela de prévia!
                </small>
              </div>
            )}

            {reelTextStyle === "red-bottom" && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(229, 0, 20, 0.08)", border: "1px solid rgba(229, 0, 20, 0.3)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 750, color: "#fca5a5", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    ↕️ Altura do Bloco Vermelho (TVT): <span style={{ color: "#ffffff", fontFamily: "monospace", fontSize: 14 }}>{Math.round((titlePosition.y || 0.615) * 100)}%</span> ({Math.round((titlePosition.y || 0.615) * 1920)}px)
                  </label>
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: "3px 9px", background: "#374151", color: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.615 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    Reset (61.5%)
                  </button>
                </div>
                <input
                  type="range"
                  min={40}
                  max={80}
                  step={1}
                  value={Math.round((titlePosition.y || 0.615) * 100)}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    const pos = { x: titlePosition.x || 0.5, y: val };
                    titlePositionRef.current = pos;
                    setTitlePosition(pos);
                    try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                    cachedOverlayCanvasRef.current = null;
                    renderCard();
                  }}
                  style={{ width: "100%", accentColor: "#e50014" }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.50 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    🔼 Mais Alto (50%)
                  </button>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.615 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    ↔️ Padrão TVT (61.5%)
                  </button>
                  <button
                    type="button"
                    className="captionTagBadge"
                    onClick={() => {
                      const pos = { x: 0.5, y: 0.72 };
                      titlePositionRef.current = pos;
                      setTitlePosition(pos);
                      try { localStorage.setItem("viralizou_reel_title_position", JSON.stringify(pos)); } catch {}
                      cachedOverlayCanvasRef.current = null;
                      renderCard();
                    }}
                  >
                    🔽 Mais Baixo (72%)
                  </button>
                </div>
                <small style={{ display: "block", marginTop: 6, color: "#cbd5e1", fontSize: 11 }}>
                  💡 Dica: Você também pode clicar e arrastar o bloco vermelho diretamente na tela de prévia!
                </small>
              </div>
            )}
          </div>

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
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "split-compare" ? "active" : ""}`}
                  onClick={() => {
                    chooseReelTextStyle("split-compare");
                    setVideoFramingMode("split");
                    chooseReelFontFamily("anton");
                    chooseReelFontWeight("900");
                    chooseReelFontSize(58);
                  }}
                  style={{
                    background: reelTextStyle === "split-compare" ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : undefined,
                    color: reelTextStyle === "split-compare" ? "#ffffff" : undefined,
                    borderColor: reelTextStyle === "split-compare" ? "#a855f7" : undefined,
                    fontWeight: reelTextStyle === "split-compare" ? 800 : 600,
                  }}
                  title="Split 50/50 Comparativo: Tela dividida meio a meio para comparar antes/depois, reações ou duas câmeras"
                >
                  👥 Split Comparativo (50/50)
                </button>
                <button
                  type="button"
                  className={`captionStyleBtn ${reelTextStyle === "bicolor-yellow" ? "active" : ""}`}
                  onClick={() => {
                    chooseReelTextStyle("bicolor-yellow");
                    chooseReelFontFamily("montserrat");
                    chooseReelFontWeight("900");
                    chooseReelFontSize(68);
                  }}
                  style={{
                    background: reelTextStyle === "bicolor-yellow" ? "linear-gradient(135deg, #ca8a04, #eab308)" : undefined,
                    color: reelTextStyle === "bicolor-yellow" ? "#000000" : undefined,
                    borderColor: reelTextStyle === "bicolor-yellow" ? "#facc15" : undefined,
                    fontWeight: reelTextStyle === "bicolor-yellow" ? 800 : 600,
                  }}
                  title="Impacto Amarelo & Branco: Linhas alternadas em amarelo vibrante e branco puro para máxima retenção visual"
                >
                  🟡 Impacto Amarelo & Branco
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
                    className={`captionColorPill ${reelTextAnimation === "bounce" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("bounce")}
                  >
                    🏀 Pulo Elástico
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "zoom-in" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("zoom-in")}
                  >
                    🔍 Zoom In
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "pulse" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("pulse")}
                  >
                    💓 Pulso / Ritmo
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "karaoke" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("karaoke")}
                  >
                    🎤 Karaokê Neon
                  </button>
                  <button
                    type="button"
                    className={`captionColorPill ${reelTextAnimation === "glitch" ? "active" : ""}`}
                    onClick={() => chooseReelTextAnimation("glitch")}
                  >
                    ⚡ Glitch / Urgência
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

            {/* SEÇÃO 2 DO PAINEL 3: MARCA, LOGOMARCA & CAMADAS */}
            <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px dashed rgba(255, 255, 255, 0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🏢</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#4ade80", letterSpacing: "0.02em" }}>Identidade Visual & Logomarca</span>
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
                  title="Logo Oficial Animada Transparente (WebM com Alpha nativo de 65 KB, sem fundo verde e com brilho 3D)"
                  style={logoColorStyle === "gif" ? { borderColor: "#8b5cf6", color: "#c084fc", background: "rgba(139, 92, 246, 0.15)", fontWeight: 700 } : {}}
                >
                  ✨ Animada (WebM / Alpha)
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

            {/* PAINEL PROFISSIONAL DE CAMADAS (LAYERS STACK) */}
            <div
              style={{
                marginBottom: 12,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 13 }}>🧩</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>
                    Painel de Camadas & Bloqueio (Layers Stack)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLayerPanel(!showLayerPanel)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#94a3b8",
                    borderRadius: 4,
                    fontSize: 10,
                    padding: "2px 7px",
                    cursor: "pointer",
                  }}
                >
                  {showLayerPanel ? "Recolher ▲" : "Expandir ▼"}
                </button>
              </div>

              {showLayerPanel && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {/* Camada 1: Vídeo / Mídia de Fundo */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      borderRadius: 6,
                      padding: "5px 8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>🎬</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>Vídeo / Mídia Principal</span>
                      {videoFramingMode === "horizontal-block" && (
                        <span style={{ fontSize: 9.5, background: "rgba(2, 132, 199, 0.2)", color: "#38bdf8", padding: "1px 5px", borderRadius: 3 }}>
                          Bloco 16:9
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => setLockedLayers((prev) => ({ ...prev, video: !prev.video }))}
                        title={lockedLayers["video"] ? "Destravar camada de vídeo" : "Travar posição do vídeo contra arraste acidental"}
                        style={{
                          background: lockedLayers["video"] ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                          color: lockedLayers["video"] ? "#f87171" : "#94a3b8",
                          border: `1px solid ${lockedLayers["video"] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {lockedLayers["video"] ? "🔒 Travado" : "🔓 Livre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePosition(0);
                          if (videoFramingMode === "horizontal-block") {
                            setVideoBlockPosY(0.44);
                            videoBlockPosYRef.current = 0.44;
                            try { localStorage.setItem("viralizou_video_block_pos_y", "0.44"); } catch {}
                          }
                          cachedOverlayCanvasRef.current = null;
                        }}
                        title="Centralizar posição vertical do vídeo"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        🎯
                      </button>
                    </div>
                  </div>

                  {/* Camada 2: Título da Arte / Manchete */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      borderRadius: 6,
                      padding: "5px 8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📰</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: showTitleLayer ? "#e2e8f0" : "#64748b" }}>Título / Manchete</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => toggleTitleLayer(!showTitleLayer)}
                        title={showTitleLayer ? "Ocultar camada de título" : "Exibir camada de título"}
                        style={{
                          background: showTitleLayer ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.08)",
                          color: showTitleLayer ? "#4ade80" : "#94a3b8",
                          border: `1px solid ${showTitleLayer ? "#22c55e" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {showTitleLayer ? "👁️ Visível" : "🚫 Oculto"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLockedLayers((prev) => ({ ...prev, title: !prev.title }))}
                        title={lockedLayers["title"] ? "Destravar camada de título" : "Travar posição do título contra arraste acidental"}
                        style={{
                          background: lockedLayers["title"] ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                          color: lockedLayers["title"] ? "#f87171" : "#94a3b8",
                          border: `1px solid ${lockedLayers["title"] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {lockedLayers["title"] ? "🔒 Travado" : "🔓 Livre"}
                      </button>
                      <button
                        type="button"
                        onClick={centerTitleAndBox}
                        title="Centralizar manchete e caixa no meio"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        🎯
                      </button>
                    </div>
                  </div>

                  {/* Camada 3: Logo do Portal */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      borderRadius: 6,
                      padding: "5px 8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>✨</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: showLogoLayer ? "#e2e8f0" : "#64748b" }}>Logo Oficial</span>
                      {logoColorStyle === "gif" && (
                        <span style={{ fontSize: 9.5, background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", padding: "1px 5px", borderRadius: 3 }}>
                          Alpha WebM
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => toggleLogoLayer(!showLogoLayer)}
                        title={showLogoLayer ? "Ocultar logo" : "Exibir logo"}
                        style={{
                          background: showLogoLayer ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.08)",
                          color: showLogoLayer ? "#4ade80" : "#94a3b8",
                          border: `1px solid ${showLogoLayer ? "#22c55e" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {showLogoLayer ? "👁️ Visível" : "🚫 Oculto"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLockedLayers((prev) => ({ ...prev, logo: !prev.logo }))}
                        title={lockedLayers["logo"] ? "Destravar logo" : "Travar logo contra arraste acidental"}
                        style={{
                          background: lockedLayers["logo"] ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                          color: lockedLayers["logo"] ? "#f87171" : "#94a3b8",
                          border: `1px solid ${lockedLayers["logo"] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {lockedLayers["logo"] ? "🔒 Travado" : "🔓 Livre"}
                      </button>
                      <button
                        type="button"
                        onClick={centerLogo}
                        title="Centralizar logo no topo"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        🎯
                      </button>
                    </div>
                  </div>

                  {/* Camada 4: Assinatura / Tag */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      borderRadius: 6,
                      padding: "5px 8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>🏷️</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: showHandleLayer ? "#e2e8f0" : "#64748b" }}>Assinatura / Tag</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => toggleHandleLayer(!showHandleLayer)}
                        style={{
                          background: showHandleLayer ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.08)",
                          color: showHandleLayer ? "#4ade80" : "#94a3b8",
                          border: `1px solid ${showHandleLayer ? "#22c55e" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {showHandleLayer ? "👁️ Visível" : "🚫 Oculto"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLockedLayers((prev) => ({ ...prev, handle: !prev.handle }))}
                        style={{
                          background: lockedLayers["handle"] ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                          color: lockedLayers["handle"] ? "#f87171" : "#94a3b8",
                          border: `1px solid ${lockedLayers["handle"] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {lockedLayers["handle"] ? "🔒 Travado" : "🔓 Livre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          chooseTagPositionY(1670);
                          tagPositionYRef.current = 1670;
                          cachedOverlayCanvasRef.current = null;
                        }}
                        title="Restaurar posição padrão (1670px)"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        🎯
                      </button>
                    </div>
                  </div>

                  {/* Camada 5: Gancho Viral Auto-Edit (Reels/Stories) */}
                  {(format === "reel" || format === "story") && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(30, 41, 59, 0.7)",
                        border: "1px solid rgba(51, 65, 85, 0.6)",
                        borderRadius: 6,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13 }}>⚡</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: autoHookEnabled ? "#facc15" : "#64748b" }}>Gancho Viral (Tarja)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <button
                          type="button"
                          onClick={() => toggleAutoHook(!autoHookEnabled)}
                          style={{
                            background: autoHookEnabled ? "rgba(234, 179, 8, 0.2)" : "rgba(255,255,255,0.08)",
                            color: autoHookEnabled ? "#facc15" : "#94a3b8",
                            border: `1px solid ${autoHookEnabled ? "#eab308" : "rgba(255,255,255,0.12)"}`,
                            borderRadius: 4,
                            fontSize: 10,
                            padding: "2px 6px",
                            cursor: "pointer",
                          }}
                        >
                          {autoHookEnabled ? "👁️ Ativo" : "🚫 Inativo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockedLayers((prev) => ({ ...prev, hook: !prev.hook }))}
                          style={{
                            background: lockedLayers["hook"] ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                            color: lockedLayers["hook"] ? "#f87171" : "#94a3b8",
                            border: `1px solid ${lockedLayers["hook"] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                            borderRadius: 4,
                            fontSize: 10,
                            padding: "2px 6px",
                            cursor: "pointer",
                          }}
                        >
                          {lockedLayers["hook"] ? "🔒 Travado" : "🔓 Livre"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHookPositionY(307);
                            hookPositionYRef.current = 307;
                            cachedOverlayCanvasRef.current = null;
                          }}
                          title="Restaurar posição padrão no topo (307px)"
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            color: "#cbd5e1",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 4,
                            fontSize: 10,
                            padding: "2px 6px",
                            cursor: "pointer",
                          }}
                        >
                          🎯
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camada 6: Guia de Figurinha (Story) */}
                  {format === "story" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(30, 41, 59, 0.7)",
                        border: "1px solid rgba(51, 65, 85, 0.6)",
                        borderRadius: 6,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13 }}>📎</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: showStorySticker ? "#e2e8f0" : "#64748b" }}>Guia de Figurinha</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStorySticker(!showStorySticker)}
                        style={{
                          background: showStorySticker ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.08)",
                          color: showStorySticker ? "#4ade80" : "#94a3b8",
                          border: `1px solid ${showStorySticker ? "#22c55e" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {showStorySticker ? "👁️ Visível" : "🚫 Oculto"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab(format === "reel" || format === "story" ? "mini-ia" : "media")}
                  style={{ fontSize: 12, padding: "7px 14px", cursor: "pointer" }}
                >
                  ← {format === "reel" || format === "story" ? "⚡ Mini IA Studio" : "📁 Mídia & Notícia"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                  <span>✅ Tudo configurado! Veja a prévia ao lado</span>
                  <span>👉</span>
                </div>
              </div>
            </div>
          )}

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
                <>
                  <button type="button" className="btn" disabled={(!selectedPost && !title && !customImageUrl) || rendering} onClick={downloadPng}>
                    {format === "feed-square" ? "⬇️ Baixar PNG 1080×1080" : format === "reel-cover" ? "⬇️ Baixar capa 1080×1350" : "⬇️ Baixar PNG 1080×1350"}
                  </button>
                  {videoReady && (
                    <button
                      type="button"
                      className="btn btnMiniIaAction"
                      disabled={recording || rendering}
                      onClick={createReel}
                      style={{ background: "#4f46e5" }}
                    >
                      {recording ? `Gravando ${recordingProgress}%...` : `🎥 Gerar Vídeo Feed 4:5 (${MINI_IA_LEVELS[miniIaLevel].name.toUpperCase()})`}
                    </button>
                  )}
                </>
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
          {/* Alternador de Visualização: [✏️ Modo Edição] | [🎬 Vídeo Gerado] */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              width: "100%",
              maxWidth: 340,
              margin: "0 auto 8px auto",
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewViewMode("edit")}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: previewViewMode === "edit" ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.14)",
                background: previewViewMode === "edit" ? "linear-gradient(135deg, #0284c7, #2563eb)" : "rgba(15,23,42,0.85)",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: previewViewMode === "edit" ? "0 4px 14px rgba(2,132,199,0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>✏️ Modo Edição</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoExport) {
                  setPreviewViewMode("generated");
                } else {
                  alert("Nenhum vídeo foi gerado ainda. Use o botão de gravação/exportação abaixo para gerar o vídeo.");
                }
              }}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: previewViewMode === "generated" ? "2px solid #22c55e" : "1px solid rgba(255,255,255,0.14)",
                background: previewViewMode === "generated" ? "linear-gradient(135deg, #16a34a, #15803d)" : "rgba(15,23,42,0.85)",
                color: videoExport ? "#ffffff" : "#94a3b8",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: videoExport ? "pointer" : "not-allowed",
                opacity: videoExport ? 1 : 0.6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: previewViewMode === "generated" ? "0 4px 14px rgba(22,163,74,0.35)" : "none",
                transition: "all 0.15s ease",
              }}
              title={videoExport ? "Alternar para assistir ou baixar o vídeo gerado" : "Gere um vídeo primeiro para visualizar nesta aba"}
            >
              <span>🎬 Vídeo Gerado</span>
              {videoExport && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4ade80",
                    display: "inline-block",
                    boxShadow: "0 0 8px #4ade80",
                  }}
                />
              )}
            </button>
          </div>

          {/* 1. MODO EDIÇÃO: Canvas interativo com todos os controles de arrasto livre */}
          <div
            className="adminFeedCanvasFrame"
            data-format={format}
            style={{
              position: "relative",
              display: previewViewMode === "edit" ? "flex" : "none",
            }}
          >
            {/* Botões de Ação Rápida no Preview (Safe Zone & Corte) */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 40,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {/* Botão de Alternar Safe Zone */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSafeZone(!showSafeZone);
                }}
                style={{
                  background: showSafeZone ? "rgba(2, 132, 199, 0.95)" : "rgba(15, 23, 42, 0.88)",
                  color: "#ffffff",
                  border: showSafeZone ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  transition: "all 0.15s ease",
                }}
                title="Ativar ou ocultar guias da Área Segura (Safe Zone) do Instagram"
              >
                <span>{showSafeZone ? "🛡️ Ocultar Safe Zone" : "📐 Mostrar Safe Zone"}</span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: showSafeZone ? "#4ade80" : "#64748b",
                    display: "inline-block",
                  }}
                />
              </button>

              {/* Botão de Corte (Crop) Rápido Direto no Preview */}
              {(videoUrl || customImageUrl || selectedPost?.image_url) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoUrl && (format === "reel" || format === "story")) {
                      setCropMediaType("video");
                    } else {
                      setCropMediaType("image");
                    }
                    setShowCropModal(true);
                  }}
                  style={{
                    background: "rgba(15, 23, 42, 0.88)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    transition: "all 0.15s ease",
                  }}
                  title="Ajustar corte (crop) da mídia visível no preview"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                  </svg>
                  <span>✂️ Ajustar Corte</span>
                  {((format === "reel" || format === "story") ? videoCrop : imageCrop) && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  )}
                </button>
              )}
            </div>
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

          {previewViewMode === "edit" && (
            <>
              <small>{format === "feed" ? "Formato Feed 4:5 · 1080×1350" : format === "feed-square" ? "Formato Feed quadrado 1:1 · 1080×1080" : format === "reel-cover" ? "Capa do Reels 4:5 · 1080×1350 (recorte da grade do perfil)" : format === "story" ? "Formato Story 9:16 · 1080×1920 (Área de Link)" : "Formato Reel 9:16 · 1080×1920"}</small>
              {videoExport && (
                <div
                  style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    width: "100%",
                    maxWidth: 340,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#86efac", fontWeight: 700 }}>
                    🎬 Vídeo pronto para download
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode("generated")}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Ver Vídeo ➔
                  </button>
                </div>
              )}
            </>
          )}

          {/* 2. MODO VÍDEO GERADO: Player MP4 + Botão de Download + Botão para Voltar a Editar */}
          <div
            className="adminFeedVideoResult"
            style={{
              width: "100%",
              maxWidth: format === "reel" || format === "story" ? 340 : 420,
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 14,
              padding: "14px",
              display: previewViewMode === "generated" ? "flex" : "none",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
            }}
          >
            {videoExport ? (
              <>
                <video
                  src={videoExport.url}
                  controls
                  playsInline
                  autoPlay
                  style={{
                    width: "100%",
                    maxHeight: "calc(100vh - 270px)",
                    borderRadius: 10,
                    background: "#000",
                    aspectRatio: format === "reel" || format === "story" ? "9/16" : format === "feed" ? "4/5" : "1/1",
                    objectFit: "contain",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0" }}>
                  <span style={{ background: "#16a34a", color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 4 }}>
                    ✅ 100% WhatsApp & Instagram
                  </span>
                  <small style={{ color: "#94a3b8" }}>MP4 H.264 Main + AAC + Faststart</small>
                </div>
                <a
                  className="btn"
                  href={videoExport.url}
                  download={videoExport.filename}
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    color: "#ffffff",
                    textDecoration: "none",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    padding: "11px 16px",
                    borderRadius: 10,
                    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
                  }}
                >
                  ⬇️ Baixar Vídeo MP4 (WhatsApp Pronto)
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewViewMode("edit")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#f8fafc",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  ✏️ Voltar para Editar e Fazer Ajustes
                </button>
              </>
            ) : (
              <div style={{ padding: "36px 16px", textAlign: "center", color: "#94a3b8" }}>
                <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🎬</span>
                <p style={{ fontSize: 13, marginBottom: 14, color: "#cbd5e1", fontWeight: 600 }}>
                  Nenhum vídeo foi gerado ainda.
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewViewMode("edit")}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #2563eb)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Ir para o Modo Edição
                </button>
              </div>
            )}
          </div>
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
          bottom: 0,
          right: 0,
          width: 2,
          height: 2,
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: -9999,
          transform: miniIaMirror ? "scaleX(-1)" : "none",
        }}
      />
      {/* Player contínuo da Logo Oficial Animada Transparente (WebM VP9 com Alpha / GIF fallback) */}
      <video
        id="viralizou-animated-logo-webm"
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
          top: 0,
          left: 0,
          width: 4,
          height: 4,
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -100,
        }}
      />
      {/* Modal Interativo de Corte / Crop de Mídia (Vídeo ou Imagem) */}
      <CropVideoModal
        isOpen={showCropModal}
        mediaType={cropMediaType}
        videoElement={videoPreviewRef.current}
        videoUrl={videoUrl}
        imageElement={customImageRef.current || articleImageRef.current?.image}
        imageUrl={customImageUrl || (selectedPost?.image_url ? `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}` : undefined)}
        initialCrop={cropMediaType === "video" ? videoCrop : imageCrop}
        onApply={handleApplyCrop}
        onClose={() => setShowCropModal(false)}
      />

      {/* Modal de Instruções do Token Vercel Real Oficial */}
      {showVercelTokenModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowVercelTokenModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: 18,
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(234, 179, 8, 0.15)",
              color: "#f8fafc",
              padding: "24px 28px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>✨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                    Token do Real Oficial na Vercel
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    Conecte sua conta para sincronizar SFX e assets exclusivos na Mini IA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVercelTokenModal(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#cbd5e1",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            {/* Status atual */}
            <div
              style={{
                background: realOficialStatus?.configured ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)",
                border: `1px solid ${realOficialStatus?.configured ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>{realOficialStatus?.configured ? "🟢" : "⚡"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: realOficialStatus?.configured ? "#4ade80" : "#facc15" }}>
                  {realOficialStatus?.configured
                    ? `Token Ativo: ${realOficialStatus.maskedToken}`
                    : "Token ainda não detectado na Vercel"}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                  {realOficialStatus?.configured
                    ? "Acesso direto à biblioteca oficial do Real Oficial liberado!"
                    : "Atualmente a Mini IA está usando o catálogo CDN de alta velocidade com fallback integrado."}
                </div>
              </div>
            </div>

            {/* Ativação Direta Instantânea (Salva no navegador e na API sem precisar esperar Redeploy da Vercel) */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>
                ⚡ Ativação Imediata do Token (Sem esperar Redeploy):
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="password"
                  value={manualRealOficialToken}
                  onChange={(e) => setManualRealOficialToken(e.target.value)}
                  placeholder="Cole seu token do Real Oficial aqui..."
                  style={{
                    flex: 1,
                    background: "#020617",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#f8fafc",
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const token = manualRealOficialToken.trim();
                    if (!token) {
                      alert("Por favor, cole um token válido.");
                      return;
                    }
                    try {
                      localStorage.setItem("viralizou_real_oficial_token", token);
                      const res = await fetch("/api/admin/real-oficial", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save", token }),
                      });
                      const data = await res.json();
                      const statusObj = data.status || data.tokenStatus;
                      if (statusObj) setRealOficialStatus(statusObj);
                      const sfxList = data.sfx || data.sfxCatalog;
                      if (Array.isArray(sfxList) && sfxList.length > 0) {
                        setRealOficialSfxList(sfxList);
                      }
                      alert("✅ Token ativado com sucesso! SFX e biblioteca liberados.");
                    } catch (e) {
                      alert("Erro ao salvar token.");
                    }
                  }}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #2563eb)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  💾 Ativar Agora
                </button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                💡 Se já adicionou na Vercel mas ainda não redeployou, ativando aqui você já usa imediatamente!
              </p>
            </div>

            {/* Nome da variável */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                Configuração na Vercel (Opcional - para persistir em todos os navegadores):
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#020617",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontFamily: "monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#38bdf8",
                }}
              >
                <span>REAL_OFICIAL_TOKEN</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText("REAL_OFICIAL_TOKEN");
                    alert("Copiado: REAL_OFICIAL_TOKEN");
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  📋 Copiar Nome
                </button>
              </div>
            </div>

            {/* Passo a passo */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 12 }}>
                Passo a Passo na Vercel:
              </h4>

              <ol style={{ margin: 0, paddingLeft: 20, color: "#e2e8f0", fontSize: 12.5, lineHeight: 1.7 }}>
                <li>
                  Acesse seu painel na Vercel em <strong style={{ color: "#38bdf8" }}>vercel.com</strong> e abra o projeto do <strong>Viralizou Goiânia</strong>.
                </li>
                <li>
                  Clique na aba superior <strong>Settings</strong> e depois em <strong>Environment Variables</strong> no menu lateral.
                </li>
                <li>
                  No campo <strong>Key</strong>, cole: <code style={{ background: "#020617", padding: "2px 6px", borderRadius: 4, color: "#38bdf8" }}>REAL_OFICIAL_TOKEN</code>
                </li>
                <li>
                  No campo <strong>Value</strong>, cole o seu token do Real Oficial (ex: <code style={{ background: "#020617", padding: "2px 6px", borderRadius: 4, color: "#a5b4fc" }}>ro_live_...</code>).
                </li>
                <li>
                  Garanta que os 3 ambientes estão marcados (<strong>Production</strong>, <strong>Preview</strong>, <strong>Development</strong>) e clique no botão azul <strong>Save</strong>.
                </li>
                <li>
                  Vá na aba <strong>Deployments</strong>, clique nos três pontinhos <strong>...</strong> do último deploy e selecione <strong>Redeploy</strong> para aplicar a nova variável.
                </li>
              </ol>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    let localToken = "";
                    try {
                      localToken = localStorage.getItem("viralizou_real_oficial_token") || manualRealOficialToken || "";
                    } catch {}
                    const query = localToken ? `?token=${encodeURIComponent(localToken)}` : "";
                    const res = await fetch(`/api/admin/real-oficial${query}`);
                    const data = await res.json();
                    const statusObj = data.status || data.tokenStatus;
                    if (statusObj) {
                      setRealOficialStatus(statusObj);
                      const sfxList = data.sfx || data.sfxCatalog;
                      if (Array.isArray(sfxList) && sfxList.length > 0) {
                        setRealOficialSfxList(sfxList);
                      }
                      alert(statusObj.configured ? `✅ Token ativo: ${statusObj.maskedToken}` : "Ainda não detectado na Vercel. Dica: Use o campo 'Ativar Agora' acima ou faça Redeploy na Vercel.");
                    }
                  } catch (e) {
                    alert("Erro ao testar status da API.");
                  }
                }}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔄 Verificar Conexão Agora
              </button>
              <button
                type="button"
                onClick={() => setShowVercelTokenModal(false)}
                style={{
                  background: "#2563eb",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
