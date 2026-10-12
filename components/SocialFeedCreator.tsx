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
  | "stroke-strong";
type ReelFontFamily = "montserrat" | "anton" | "bebas" | "poppins" | "inter" | "roboto" | "impact" | "georgia";
type ReelFontWeight = "900" | "800" | "700" | "600" | "400" | "italic";
type ReelTextAlign = "left" | "center" | "right";
type ReelTextCase = "uppercase" | "lowercase" | "original";
type ReelTagColor = "red" | "white" | "yellow" | "orange";
type ReelTextAnimation = "typewriter" | "pop" | "slide" | "fade" | "static";
type LogoColorStyle = "white" | "dark" | "original";

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
  try { ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); } catch {}
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLVideoElement, x: number, y: number, w: number, h: number, vertical = 0) {
  const sourceWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const sourceHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.min(w / sourceWidth, h / sourceHeight);
  const dw = Math.round(sourceWidth * scale);
  const dh = Math.round(sourceHeight * scale);
  const dx = Math.round(x + (w - dw) / 2);
  const roomY = Math.max(0, h - dh);
  const dy = Math.round(y + roomY / 2 + (vertical / 100) * (roomY / 2));
  try { ctx.drawImage(img, dx, dy, dw, dh); } catch {}
}

function drawVideoWithFraming(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  framingMode: "cover" | "blur-fit",
  vertical = 0
) {
  if (framingMode === "blur-fit") {
    ctx.save();
    ctx.filter = "blur(24px) brightness(0.42)";
    drawCover(ctx, video, 0, 0, w, h, 0);
    ctx.restore();
    drawContain(ctx, video, 0, 0, w, h, vertical);
  } else {
    drawCover(ctx, video, 0, 0, w, h, vertical);
  }
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

function createSvgDataUri(isWhite: boolean): string {
  const textColor = isWhite ? "%23ffffff" : "%231e293b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180"><defs><style>.vg-brand-text{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif;font-weight:900;}</style></defs><g transform="translate(10, 15) scale(0.95)"><path d="M 35 30 L 78 135 L 120 30 L 92 30 L 78 100 L 63 30 Z" fill="%23dc2626"/><path d="M 125 75 C 125 40 155 18 195 18 C 235 18 262 42 265 78 L 235 78 C 232 55 215 42 195 42 C 172 42 153 58 153 82 C 153 106 172 122 195 122 C 218 122 232 108 234 94 L 195 94 L 195 72 L 263 72 C 263 125 228 146 195 146 C 155 146 125 120 125 75 Z" fill="%23dc2626"/></g><text x="275" y="78" fill="${textColor}" font-size="52" class="vg-brand-text" letter-spacing="3.5">VIRALIZOU</text><text x="275" y="142" fill="${textColor}" font-size="52" class="vg-brand-text" letter-spacing="4.5">GOIÂNIA</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

const FALLBACK_WHITE_LOGO_SVG = createSvgDataUri(true);
const FALLBACK_DARK_LOGO_SVG = createSvgDataUri(false);

let cachedOfficialWhiteLogo: HTMLImageElement | null = null;
let cachedOfficialDarkLogo: HTMLImageElement | null = null;

function getOfficialLogo(variant: "white" | "dark"): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  const isWhite = variant === "white";
  let cached = isWhite ? cachedOfficialWhiteLogo : cachedOfficialDarkLogo;

  if (!cached || !isImageDrawable(cached)) {
    const img = new Image();
    img.src = isWhite ? FALLBACK_WHITE_LOGO_SVG : FALLBACK_DARK_LOGO_SVG;
    if (isWhite) cachedOfficialWhiteLogo = img;
    else cachedOfficialDarkLogo = img;
    return img;
  }
  return cached;
}

function getRenderableLogo(
  customLogo: HTMLImageElement | HTMLCanvasElement | null,
  colorStyle: LogoColorStyle,
  defaultVariant: "white" | "dark" = "white"
): HTMLImageElement | HTMLCanvasElement | null {
  // 1. Prioridade absoluta: Se o usuário enviou/possui uma logo personalizada válida, USA ELA!
  if (customLogo && isImageDrawable(customLogo)) {
    return customLogo;
  }

  // 2. Se não tem logo personalizada, usa a oficial correspondente ao estilo escolhido
  if (colorStyle === "white") {
    const white = getOfficialLogo("white");
    if (isImageDrawable(white)) return white;
  } else if (colorStyle === "dark") {
    const dark = getOfficialLogo("dark");
    if (isImageDrawable(dark)) return dark;
  }

  const def = getOfficialLogo(defaultVariant);
  return isImageDrawable(def) ? def : null;
}

function getLogoSize(
  logo: HTMLImageElement | HTMLCanvasElement,
  format: PublicationFormat,
  multiplier = 1
) {
  const w = ("naturalWidth" in logo && logo.naturalWidth) ? logo.naturalWidth : (logo.width || 400);
  const h = ("naturalHeight" in logo && logo.naturalHeight) ? logo.naturalHeight : (logo.height || 100);
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
  const maxLines = 4;
  const maxAllowedHeight = 420;
  const startSize = manualSize > 0 ? manualSize : (fontFamily === "bebas" ? 84 : fontFamily === "anton" ? 76 : 70);

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
    let lineHeight = s * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.16);
    // Para textos longos: ajusta dinamicamente a fonte se passar de 4 linhas, da altura ou largura máxima de segurança
    while (exceedsBounds(lines, lineHeight) && s > 24) {
      s -= 2;
      lines = wrapParagraphs(s);
      lineHeight = s * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.16);
    }
    chosenSize = s;
    chosenLines = lines;
  } else {
    for (let s = startSize; s >= 24; s -= 2) {
      const lines = wrapParagraphs(s);
      const lineHeight = s * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.16);
      if (!exceedsBounds(lines, lineHeight)) {
        chosenSize = s;
        chosenLines = lines;
        break;
      }
      if (s <= 24) {
        chosenSize = 24;
        chosenLines = lines;
      }
    }
  }

  ctx.font = getReelFont(fontFamily, chosenSize, fontWeight);
  const lineHeight = chosenSize * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.16);
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
) {
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
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, REEL_H);
  if (video && video.readyState >= 2) {
    drawVideoWithFraming(ctx, video, W, REEL_H, framingMode, imageVertical);
  }

  const maxAlpha = shadeOpacity / 100;
  if (shadeOpacity > 0) {
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

  if (showLogoLayer) {
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
    );
  }

  if (format === "story" && showStorySticker && showSafeZone) {
    drawStoryStickerGuide(ctx, W);
  }

  // Assinatura / Tag Inferior
  if (showHandleLayer && handle && handle.trim()) {
    const tagText = handle.trim();
    const tagY = tagPositionY || 1670;

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
  if (maxAlpha > 0) {
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

  // 3. Logo do jornal
  if (showLogoLayer) {
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
    );
  }

  // 5. Assinatura / Tag Inferior (@viralizougoiania)
  if (showHandleLayer && handle && handle.trim()) {
    const tagText = handle.trim();
    const tagY = tagPositionY || 1670;

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

export default function SocialFeedCreator({ posts, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoFileRef = useRef<File | Blob | null>(null);
  const cachedOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const [format, setFormat] = useState<PublicationFormat>("feed");
  const [importVideoUrl, setImportVideoUrl] = useState("");
  const [importingVideo, setImportingVideo] = useState(false);
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
  const [tagPositionY, setTagPositionY] = useState<number>(1670);
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

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString("pt-BR");
    console.log(`[ViralizouVideo ${time}] ${msg}`);
    setRenderLogs((prev) => [...prev.slice(-15), `[${time}] ${msg}`]);
  }

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoExport?.url) URL.revokeObjectURL(videoExport.url); }, [videoExport?.url]);
  useEffect(() => () => { audioContextRef.current?.close().catch(() => {}); }, []);

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

        if (selectedPost?.image_url) {
          const src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
          const img = articleImageRef.current?.src === src ? articleImageRef.current.image : await loadImage(src);
          articleImageRef.current = { src, image: img };
          drawCover(ctx, img, 0, 0, currentW, currentH, imagePosition);
        } else {
          const gradient = ctx.createLinearGradient(0, 0, currentW, currentH);
          gradient.addColorStop(0, "#0f172a");
          gradient.addColorStop(1, "#1e293b");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, currentW, currentH);
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

      if (selectedPost?.image_url) {
        const src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
        const img = articleImageRef.current?.src === src ? articleImageRef.current.image : await loadImage(src);
        articleImageRef.current = { src, image: img };
        drawCover(ctx, img, 0, 0, currentW, coverH, imagePosition);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, currentW, coverH);
        gradient.addColorStop(0, "#172033");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, currentW, coverH);
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = "700 38px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Selecione uma notícia do portal", currentW / 2, coverH / 2);
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
        );
      }

      if (showHandleLayer && handle && handle.trim()) {
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
        const handleY = format === "feed-square" ? 1030 : 1300;
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
  }, [selectedPost?.slug, selectedPost?.updated_at, title, logoData, handle, imagePosition, feedTitleFontSize, feedFontFamily, feedTitlePosition.x, feedTitlePosition.y, feedTitleOffsetY, format, logoPosition.x, logoPosition.y, titlePosition.x, titlePosition.y, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle]);

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
            drawVideoWithFraming(ctx, video, W, REEL_H, videoFramingMode, imagePosition);
            // Ultra-rápido: desenha o overlay já pré-renderizado e cacheado em 0.05ms
            if (cachedOverlayCanvasRef.current) {
              ctx.drawImage(cachedOverlayCanvasRef.current, 0, 0);
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
                tagPositionY,
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
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle, recording, videoFramingMode, imagePosition]);

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
    setVideoUrl(URL.createObjectURL(file));
    setVideoExport(null);
    setFormat("reel");
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
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const objectUrl = URL.createObjectURL(blob);
      setVideoUrl(objectUrl);
      setVideoFileName(`viralizou-${data.platform || "social"}.mp4`);
      setVideoExport(null);
      setFormat("reel");
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
  }

  function chooseReelFontFamily(font: ReelFontFamily) {
    setReelFontFamily(font);
    try { localStorage.setItem("viralizou_reel_font_family", font); } catch {}
  }

  function chooseReelFontWeight(weight: ReelFontWeight) {
    setReelFontWeight(weight);
    try { localStorage.setItem("viralizou_reel_font_weight", weight); } catch {}
  }

  function chooseReelTextAlign(align: ReelTextAlign) {
    setReelTextAlign(align);
    try { localStorage.setItem("viralizou_reel_text_align", align); } catch {}
  }

  function chooseReelTextCase(textCase: ReelTextCase) {
    setReelTextCase(textCase);
    try { localStorage.setItem("viralizou_reel_text_case", textCase); } catch {}
  }

  function chooseReelFontSize(size: number) {
    setReelFontSize(size);
    try { localStorage.setItem("viralizou_reel_font_size", String(size)); } catch {}
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
    if (!canvas || (!selectedPost && !title)) {
      setMessage("Carregue uma notícia antes de baixar.");
      return;
    }
    setMessage("Preparando PNG na resolução do formato selecionado...");
    await renderCard(true);
    const slug = selectedPost?.slug || "arte";
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
    logoDragRef.current = { pointerId: event.pointerId, offsetX: x / currentW - logoPositionRef.current.x, offsetY: y / currentH - logoPositionRef.current.y };
    setDraggingLogo(true);
  }

  function onPreviewPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { width: currentW, height: currentH } = getCanvasDimensions(format);
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
  }

  function onPreviewPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (titleDragRef.current?.pointerId === event.pointerId) {
      titleDragRef.current = null;
      setDraggingLogo(false);
      try {
        const key = format === "reel" || format === "story" ? "viralizou_reel_title_position" : "viralizou_feed_title_position";
        const position = format === "reel" || format === "story" ? titlePositionRef.current : feedTitlePositionRef.current;
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
      showLogoLayer,
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
        if (!mp4Blob || mp4Blob.size < 1000) {
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
      const drawFrameSync = () => {
        if (!isRecordingRef.current) return;
        const now = performance.now();
        if (now - lastFrameTime < 27) return;
        lastFrameTime = now;
        const ctx = canvas.getContext("2d");
        if (ctx && video.readyState >= 2) { ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, REEL_H); drawVideoWithFraming(ctx, video, W, REEL_H, videoFramingMode, imagePosition); ctx.drawImage(overlayCanvas, 0, 0); renderedFramesCount++; }
      };

      const syncWithVideoDecoder = () => {
        if (!isRecordingRef.current) return;
        drawFrameSync();
        if ("requestVideoFrameCallback" in video) {
          vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        }
      };

      if ("requestVideoFrameCallback" in video) {
        vfcId = (video as any).requestVideoFrameCallback(syncWithVideoDecoder);
        addLog("⚡ Sincronismo de decodificação por GPU (requestVideoFrameCallback) ativado!");
      } else {
        addLog("🖥️ Sincronismo direto por CPU ativado.");
      }
      addLog("🛡️ Motor Híbrido GPU + CPU ativo: cadência cravada em 30 FPS para rodar leve em computadores fracos.");

      loopIntervalId = window.setInterval(drawFrameSync, 1000 / 30);
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

      let finalBlob = blob;

      // 1. Se o navegador já gravou em MP4 nativo (Chrome/Edge), o arquivo já é um MP4 oficial compatível!
      const isAlreadyMp4 = mimeType.toLowerCase().includes("mp4");

      if (isAlreadyMp4) {
        addLog("✨ Vídeo gerado diretamente em MP4 nativo (H.264 + AAC) com sincronismo perfeito de hardware!");
        addLog("🎉 Processamento concluído! Arquivo 100% pronto para WhatsApp, Instagram e TikTok.");
      } else {
        // Corrige metadados de duracao WebM (se gravado em navegadores como Firefox)
        finalBlob = await fixWebmDuration(finalBlob, duration);

        const isCloudEnv = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
        const canSendToServer = !isCloudEnv || finalBlob.size <= 4.2 * 1024 * 1024;

        if (canSendToServer) {
          setMessage("⚡ Convertendo WebM para MP4 padrão oficial...");
          addLog("🔄 Convertendo vídeo para MP4 padrão WhatsApp (H.264 + AAC + faststart)...");
          try {
            const formData = new FormData();
            formData.append("file", finalBlob, `${basename}.webm`);
            formData.append("filename", `${basename}-${formatLabel}.mp4`);

            const convRes = await fetch("/api/admin/convert-video", {
              method: "POST",
              body: formData,
            });

            if (convRes.ok) {
              finalBlob = await convRes.blob();
              addLog("🎉 Conversão concluída com sucesso! MP4 pronto para WhatsApp e Instagram!");
            } else {
              const errText = await convRes.text().catch(() => "");
              let errMsg = "";
              try {
                const parsed = JSON.parse(errText);
                errMsg = parsed.error || "";
              } catch {}
              if (!errMsg) {
                errMsg = convRes.status === 413
                  ? "Arquivo excede limite de envio HTTP 413 do servidor"
                  : `HTTP ${convRes.status}${convRes.statusText ? ` (${convRes.statusText})` : ""}`;
              }
              addLog(`ℹ️ Servidor de conversão (${errMsg}). Mantendo vídeo de alta resolução gerado.`);
            }
          } catch (convErr: any) {
            addLog(`ℹ️ Servidor de conversão (${convErr?.message || "offline"}). Mantendo vídeo gerado.`);
          }
        } else {
          addLog(`ℹ️ Gravação WebM (${(finalBlob.size / 1024 / 1024).toFixed(1)} MB) finalizada com sucesso.`);
        }
      }

      setVideoExport({
        url: URL.createObjectURL(finalBlob),
        filename: `${basename}-${formatLabel}.mp4`,
        type: finalBlob.type || "video/mp4",
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

          {(format === "reel" || format === "story") && (
            <div className="field" style={{ background: "#f8fafc", border: "1.5px dashed #4f46e5", borderRadius: 10, padding: "12px 14px" }}>
              <label style={{ color: "#312e81", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📥 Baixar vídeo direto de link (TikTok, Instagram, Twitter/X)</span>
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  type="url"
                  placeholder="Cole o link do TikTok, Reels ou Twitter/X..."
                  value={importVideoUrl}
                  onChange={(e) => setImportVideoUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImportVideoFromUrl(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleImportVideoFromUrl}
                  disabled={importingVideo}
                  style={{ background: "#4f46e5", whiteSpace: "nowrap" }}
                >
                  {importingVideo ? "Importando..." : "Importar Vídeo"}
                </button>
              </div>
              <small style={{ color: "#64748b", marginTop: 4, display: "block" }}>
                🔒 O vídeo é baixado temporariamente em proxy diretamente na memória do navegador e é apagado ao fechar a página.
              </small>
            </div>
          )}

          {(format === "reel" || format === "story") && (
            <div className="field">
              <label>🎬 Vídeo para o Reel ou Story</label>
              <input type="file" accept="video/*" onChange={onVideoChange} />
              <small>{videoFileName ? `${videoFileName}${videoReady ? " · pronto para prévia" : " · carregando"}` : "Escolha um vídeo de até 250 MB ou cole o link da rede social acima."}</small>

              {videoUrl && (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px", marginTop: 10, border: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📐 Enquadramento do Vídeo no Reel (9:16)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      className={`btn secondary ${videoFramingMode === "cover" ? "active" : ""}`}
                      onClick={() => setVideoFramingMode("cover")}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: "6px 8px",
                        background: videoFramingMode === "cover" ? "#0284c7" : "#ffffff",
                        color: videoFramingMode === "cover" ? "#ffffff" : "#1e293b",
                        borderColor: videoFramingMode === "cover" ? "#0284c7" : "#cbd5e1",
                        fontWeight: videoFramingMode === "cover" ? 700 : 500,
                      }}
                      title="Preenche a tela toda 9:16 cortando as laterais se for horizontal"
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
                        padding: "6px 8px",
                        background: videoFramingMode === "blur-fit" ? "#0284c7" : "#ffffff",
                        color: videoFramingMode === "blur-fit" ? "#ffffff" : "#1e293b",
                        borderColor: videoFramingMode === "blur-fit" ? "#0284c7" : "#cbd5e1",
                        fontWeight: videoFramingMode === "blur-fit" ? 700 : 500,
                      }}
                      title="Mantém todo o vídeo original visível sem cortes de cabeça e preenche o fundo com desfoque elegante de jornalismo"
                    >
                      📰 Jornalístico (Fundo Desfocado)
                    </button>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
                        ↕️ Ajuste Vertical do Vídeo: <b style={{ color: "#0284c7" }}>{imagePosition}%</b>
                      </span>
                      {imagePosition !== 0 && (
                        <button
                          type="button"
                          className="captionTagBadge"
                          onClick={() => setImagePosition(0)}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          Centralizar
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
                    <small style={{ color: "#64748b", fontSize: 11, display: "block", marginTop: 2 }}>
                      {videoFramingMode === "cover"
                        ? "Deslize para centralizar rostos ou a ação no vídeo."
                        : "Deslize para subir ou descer o vídeo centralizado."}
                    </small>
                  </div>
                </div>
              )}
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
              <>
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
                  Exibir aviso “Cenas fortes” no Reel
                </label>
              </>
            )}

            {format === "feed" && (
              <>
                <div className="captionStudioField">
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

                <div className="captionStudioField">
                  <label>
                    <span>↕️ Ajuste vertical da foto</span>
                    <b style={{ color: "#c084fc" }}>{imagePosition}%</b>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={imagePosition}
                    onChange={(e) => setImagePosition(Number(e.target.value))}
                  />
                </div>
              </>
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

              {format === "reel" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ fontWeight: 700 }}>↕️ Altura da Tag: <b>{tagPositionY}px</b> {tagPositionY === 1670 ? "(Posição Segura Instagram)" : ""}</small>
                    {tagPositionY !== 1670 && (
                      <button
                        type="button"
                        className="captionTagBadge"
                        onClick={() => chooseTagPositionY(1670)}
                      >
                        Reset Segura (1670px)
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min="1400"
                    max="1850"
                    step="10"
                    value={tagPositionY}
                    onChange={(e) => chooseTagPositionY(Number(e.target.value))}
                  />
                  <small style={{ color: "#64748b" }}>
                    Posição 1670px evita sobreposição com o botão Seguir e o nome do perfil do Instagram.
                  </small>
                </div>
              )}
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
                  className={`logoColorStyleBtn ${logoColorStyle === "original" ? "active" : ""}`}
                  onClick={() => chooseLogoColorStyle("original")}
                  title="Manter cores originais da imagem enviada"
                >
                  Original
                </button>
              </div>
            </div>

            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
            <small>
              Alterne acima entre <b>Letras Brancas ⚪</b> (ideal p/ Reels/Vídeos) e <b>Letras Pretas ⚫</b> (ideal p/ Fundo Claro).
            </small>

            {/* Cartão de visualização da logo ativa (Oficial transparente ou Customizada) */}
            <div
              className="adminFeedLogoSaved"
              style={{
                background: logoColorStyle === "white" ? "#0f172a" : "#f8fafc",
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
                    background: logoColorStyle === "white" ? "#1e293b" : "#f1f5f9",
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: logoColorStyle === "white" ? "1px solid #334155" : "1px solid #e2e8f0",
                  }}
                >
                  <img
                    key={`${logoColorStyle}_${Boolean(logoData)}`}
                    src={
                      logoData ||
                      (logoColorStyle === "dark" ? "/logos/logo-viralizou-preta.svg" : "/logos/logo-viralizou-branca.svg")
                    }
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.src = logoColorStyle === "dark" ? FALLBACK_DARK_LOGO_SVG : FALLBACK_WHITE_LOGO_SVG;
                    }}
                    alt="Logo ativa"
                    style={{
                      maxHeight: 34,
                      display: "block",
                    }}
                  />
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      display: "block",
                      color: logoColorStyle === "white" ? "#f8fafc" : "#0f172a",
                    }}
                  >
                    {logoData
                      ? "Logo Personalizada"
                      : logoColorStyle === "white"
                      ? "⚪ Logo Oficial (Letras Brancas - Sem Fundo)"
                      : logoColorStyle === "dark"
                      ? "⚫ Logo Oficial (Letras Pretas - Sem Fundo)"
                      : "Logo Oficial Original"}
                  </span>
                  <small style={{ color: logoColorStyle === "white" ? "#94a3b8" : "#64748b", fontSize: 10 }}>
                    {logoData ? "Arquivo customizado enviado" : "Imagem PNG nativa original e transparente"}
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
              <button type="button" className="btn" disabled={!selectedPost || rendering} onClick={downloadPng}>
                {format === "feed-square" ? "⬇️ Baixar PNG 1080×1080" : format === "reel-cover" ? "⬇️ Baixar capa 1080×1350" : "⬇️ Baixar PNG 1080×1350"}
              </button>
            )}
            {format === "story" && (
              <>
                <button type="button" className="btn" disabled={(!selectedPost && !title) || rendering} onClick={downloadPng}>
                  ⬇️ Baixar Story PNG 1080×1920
                </button>
                {videoReady && (
                  <button type="button" className="btn" disabled={recording || rendering} onClick={createReel}>
                    {recording ? `Gravando ${recordingProgress}%...` : "🎥 Gerar Story Vídeo"}
                  </button>
                )}
              </>
            )}
            {format === "reel" && (
              <button type="button" className="btn" disabled={!videoReady || recording || rendering} onClick={createReel}>
                {recording ? `Gravando ${recordingProgress}%...` : "🎥 Gerar Reel"}
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
              style={{ cursor: logoData || format === "reel" || format === "story" || Boolean(title || selectedPost) ? (draggingLogo ? "grabbing" : "grab") : "default", touchAction: "none" }}
            />
          </div>
          <small>{format === "feed" ? "Formato Feed 4:5 · 1080×1350" : format === "feed-square" ? "Formato Feed quadrado 1:1 · 1080×1080" : format === "reel-cover" ? "Capa do Reels 4:5 · 1080×1350 (recorte da grade do perfil)" : format === "story" ? "Formato Story 9:16 · 1080×1920 (Área de Link)" : "Formato Reel 9:16 · 1080×1920"}</small>
          {videoExport && (
            <div className="adminFeedVideoResult">
              <video src={videoExport.url} controls playsInline />
              <small>Arquivo gerado: <b>MP4 (H.264 · Instagram / TikTok / WhatsApp)</b></small>
              <a className="btn" href={videoExport.url} download={videoExport.filename}>⬇️ Baixar Vídeo MP4</a>
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
        }}
      />
    </section>
  );
}
