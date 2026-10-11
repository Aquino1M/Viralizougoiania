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
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
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

const logoProcessCache = new Map<string, HTMLCanvasElement>();

function getRenderableLogo(
  logo: HTMLImageElement | null,
  colorStyle: LogoColorStyle
): HTMLCanvasElement | HTMLImageElement | null {
  if (!logo || !logo.complete || !logo.naturalWidth) return null;
  if (colorStyle === "original") return logo;

  const key = `${logo.src.slice(0, 100)}_${logo.naturalWidth}x${logo.naturalHeight}_${colorStyle}`;
  const existing = logoProcessCache.get(key);
  if (existing) return existing;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = logo.naturalWidth;
    canvas.height = logo.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return logo;

    ctx.drawImage(logo, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 15) continue; // pixel transparente

      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      // Preserva o símbolo "VG" que é vermelho vivo/vibrante
      const isRed = r > 140 && (r - g) > 55 && (r - b) > 55 && r > (g + b) * 0.85;
      if (isRed) continue;

      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      if (colorStyle === "white") {
        // Converte letras escuras/pretas/cinzas/douradas em branco puro e luminoso
        if (lum < 235) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
        }
      } else if (colorStyle === "dark") {
        // Converte letras brancas/claras em preto/grafite escuro
        if (lum > 115) {
          d[i] = 18;
          d[i + 1] = 18;
          d[i + 2] = 18;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    logoProcessCache.set(key, canvas);
    return canvas;
  } catch {
    return logo;
  }
}

function getLogoSize(
  logo: HTMLImageElement | HTMLCanvasElement,
  format: PublicationFormat,
  multiplier = 1
) {
  const w = "naturalWidth" in logo && logo.naturalWidth ? logo.naturalWidth : logo.width;
  const h = "naturalHeight" in logo && logo.naturalHeight ? logo.naturalHeight : logo.height;
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
  let maxLines = 4;
  let startSize = manualSize > 0 ? manualSize : (fontFamily === "bebas" ? 88 : fontFamily === "anton" ? 78 : 72);

  let chosenSize = startSize;
  let chosenLines: string[] = [];

  if (manualSize > 0) {
    ctx.font = getReelFont(fontFamily, manualSize, fontWeight);
    chosenLines = wrapText(ctx, text, maxWidth);
    chosenSize = manualSize;
  } else {
    for (let s = startSize; s >= 24; s -= 2) {
      ctx.font = getReelFont(fontFamily, s, fontWeight);
      const lines = wrapText(ctx, text, maxWidth);
      const lineHeight = s * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.18);
      if (lines.length <= maxLines && lines.length * lineHeight <= 540) {
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
  const lineHeight = chosenSize * (fontFamily === "bebas" ? 1.08 : fontFamily === "anton" ? 1.12 : 1.18);
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
  const layout = getReelTitleLayout(ctx, headline, fontFamily, fontWeight, textCase, fontSize, maxWidth);
  if (!layout.lines.length) return;

  const animDuration = Math.min(2.5, Math.max(0.6, duration > 0 ? duration * 0.25 : 2.0));
  const rawProgress = Math.min(1, Math.max(0, currentTime / animDuration));

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  const centerX = position.x * W;
  const centerY = position.y * canvasHeight;

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

  const blockLeft = centerX - layout.width / 2;
  const blockRight = centerX + layout.width / 2;
  const fontString = getReelFont(fontFamily, layout.fontSize, fontWeight);

  // 1. ESTILO CAIXA NOTICIOSA (Estilo O Grito - Foto 3 do jornalista)
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
    ctx.restore();
    return;
  }

  // 2. ESTILO SELO DE CATEGORIA (Estilo Jornal Opção - Foto 2 do jornalista)
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
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = centerX;
        if (textAlign === "left") drawX = blockLeft;
        else if (textAlign === "right") drawX = blockRight;
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }

    ctx.save();
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(0, canvasHeight - 12, W, 12);
    ctx.restore();

    ctx.restore();
    return;
  }

  // 3. ESTILO BARRA LATERAL VERMELHA (Estilo Destaque / Foto 5 do jornalista)
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
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = blockLeft;
        if (textAlign === "center") drawX = centerX;
        else if (textAlign === "right") drawX = blockRight;
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }
    ctx.restore();
    return;
  }

  // 4. ESTILO EDITORIAL SERIFADO (Estilo Metrópoles - Foto 4 do jornalista)
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
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.textAlign = textAlign;
        let drawX = centerX;
        if (textAlign === "left") drawX = blockLeft;
        else if (textAlign === "right") drawX = blockRight;
        ctx.fillText(line, drawX, curY);
        ctx.restore();
      }
      curY += layout.lineHeight;
    }
    ctx.restore();
    return;
  }

  // 5. ESTILOS FAIXA / HIGHLIGHT / STROKE / STANDARD (Linha por linha ajustada sem sobreposição)
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

      let boxBg = "#ffffff";
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

      const strokeW = Math.max(4, Math.round(layout.fontSize * 0.08));
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
  showStorySticker: boolean = true,
  format: PublicationFormat = "reel",
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  (ctx as any).textRendering = "geometricPrecision";

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, REEL_H);
  if (video && video.readyState >= 2) drawCover(ctx, video, 0, 0, W, REEL_H);

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
    const renderLogo = getRenderableLogo(logo, logoColorStyle);
    if (renderLogo) {
      const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
      ctx.drawImage(renderLogo, logoPosition.x * W - width / 2, logoPosition.y * REEL_H - height / 2, width, height);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = logoColorStyle === "dark" ? "#111111" : "#ffffff";
      ctx.font = "900 57px Arial, sans-serif";
      ctx.fillText("VIRALIZOU", W / 2 - 22, 1200);
      ctx.fillStyle = "#ff5a1f";
      ctx.font = "900 35px Arial, sans-serif";
      ctx.fillText("GOIÂNIA", W / 2 + 214, 1200);
    }
  }

  if (showTitleLayer) {
    const currentTime = video ? video.currentTime : 10;
    const duration = video && Number.isFinite(video.duration) ? video.duration : 10;
    drawReelHeadline(
      ctx,
      headline,
      category,
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

  if (format === "story" && showStorySticker) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    const stkW = 580;
    const stkH = 110;
    const stkX = (W - stkW) / 2;
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
    ctx.fillText("🔗 ÁREA DA FIGURINHA DE LINK / ENQUETE 👆", W / 2, stkY + stkH / 2);
    ctx.restore();
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
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [reelTextAnimation, setReelTextAnimation] = useState<ReelTextAnimation>("typewriter");
  const [showStrongSceneWarning, setShowStrongSceneWarning] = useState(false);
  const [shadeOpacity, setShadeOpacity] = useState<number>(85);
  const [showOverlayLayer, setShowOverlayLayer] = useState<boolean>(false);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(true);
  const [showLogoLayer, setShowLogoLayer] = useState<boolean>(true);
  const [showTitleLayer, setShowTitleLayer] = useState<boolean>(true);
  const [showHandleLayer, setShowHandleLayer] = useState<boolean>(true);
  const [showStorySticker, setShowStorySticker] = useState<boolean>(true);
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
  }, []);

  async function renderCard() {
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
          if (logoData) {
            try {
              if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
              const renderLogo = getRenderableLogo(logoImageRef.current, logoColorStyle);
              if (renderLogo) {
                const { width, height } = getLogoSize(renderLogo, "story", logoScale / 100);
                ctx.drawImage(renderLogo, logoPositionRef.current.x * currentW - width / 2, logoPositionRef.current.y * currentH - height / 2, width, height);
              }
            } catch { logoImageRef.current = null; }
          } else {
            ctx.textAlign = "center";
            ctx.fillStyle = logoColorStyle === "dark" ? "#111111" : "#ffffff";
            ctx.font = "900 57px Arial, sans-serif";
            ctx.fillText("VIRALIZOU", currentW / 2 - 22, 1050);
            ctx.fillStyle = "#ff5a1f";
            ctx.font = "900 35px Arial, sans-serif";
            ctx.fillText("GOIÂNIA", currentW / 2 + 214, 1050);
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

        if (showStorySticker) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 8]);
          ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
          const stkW = 580;
          const stkH = 110;
          const stkX = (currentW - stkW) / 2;
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
          ctx.fillText("🔗 ÁREA DA FIGURINHA DE LINK / ENQUETE 👆", currentW / 2, stkY + stkH / 2);
          ctx.restore();
        }

        if (showHandleLayer && handle && handle.trim()) {
          ctx.save();
          ctx.font = `800 ${handleFontSize}px "Montserrat", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(handle.trim(), currentW / 2, tagPositionY || 1670);
          ctx.restore();
        }

        if (showSafeZone) {
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
          showSafeZone,
          logoColorStyle,
          showOverlayLayer ? shadeOpacity : 0,
          showLogoLayer,
          showTitleLayer,
          showHandleLayer,
          showStorySticker,
          format,
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
        if (logoData) {
          try {
            if (!logoImageRef.current || logoImageRef.current.src !== logoData) logoImageRef.current = await loadImage(logoData);
            const logo = logoImageRef.current;
            const renderLogo = getRenderableLogo(logo, logoColorStyle);
            if (renderLogo) {
              const { width, height } = getLogoSize(renderLogo, format, logoScale / 100);
              const logoY = format === "feed-square" ? logoPosition.y * currentH - 40 : logoPosition.y * currentH;
              ctx.drawImage(renderLogo, logoPosition.x * currentW - width / 2, logoY - height / 2, width, height);
            }
          } catch {
            logoImageRef.current = null;
            setLogoData("");
          }
        } else {
          ctx.textAlign = "center";
          ctx.fillStyle = logoColorStyle === "dark" ? "#111111" : "#ffffff";
          ctx.font = "900 57px Arial, sans-serif";
          const defaultLogoY = format === "feed-square" ? 680 : 838;
          ctx.fillText("VIRALIZOU", currentW / 2 - 22, defaultLogoY);
          ctx.fillStyle = "#ff5a1f";
          ctx.font = "900 35px Arial, sans-serif";
          ctx.fillText("GOIÂNIA", currentW / 2 + 214, defaultLogoY);
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

      if (showSafeZone) {
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

  // Loop de pré-visualização interativa do Reel e Story
  useEffect(() => {
    const video = videoPreviewRef.current;
    if ((format !== "reel" && format !== "story") || !videoUrl || !video) return;
    let frameId = 0;
    let videoFrameId = 0;
    // Preview is deliberately capped at 24 fps. A full 1080x1920 composition
    // at source 60 fps repeatedly recalculates expensive text effects.
    let lastRenderedAt = 0;
    const previewInterval = 1000 / 24;
    const draw = (timestamp = 0) => {
      if (!isRecordingRef.current) {
        if (timestamp - lastRenderedAt >= previewInterval) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (ctx && video.readyState >= 2) {
            drawReelFrame(
              ctx,
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
              showSafeZone,
              logoColorStyle,
              showOverlayLayer ? shadeOpacity : 0,
              showLogoLayer,
              showTitleLayer,
              showHandleLayer,
              showStorySticker,
              format,
            );
            lastRenderedAt = timestamp;
          }
        }
      }
      if (typeof (video as any).requestVideoFrameCallback === "function") {
        videoFrameId = (video as any).requestVideoFrameCallback(draw);
      } else {
        frameId = requestAnimationFrame(draw);
      }
    };
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    if (typeof (video as any).requestVideoFrameCallback === "function") {
      videoFrameId = (video as any).requestVideoFrameCallback(draw);
    } else {
      frameId = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(frameId);
      if (videoFrameId && typeof (video as any).cancelVideoFrameCallback === "function") {
        (video as any).cancelVideoFrameCallback(videoFrameId);
      }
    };
  }, [format, videoUrl, title, handle, logoData, selectedPost?.title, reelTextStyle, reelFontFamily, reelFontWeight, reelTextAlign, reelTextCase, reelFontSize, tagColor, tagPositionY, showSafeZone, reelTextAnimation, showStrongSceneWarning, logoScale, handleFontSize, shadeOpacity, showOverlayLayer, showLogoLayer, showTitleLayer, showHandleLayer, showStorySticker, logoColorStyle]);

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
    await renderCard();
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
        const layout = getReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize);
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

    const logo = logoImageRef.current;
    if (!logoData || !logo?.naturalWidth) return;

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
        const layout = ctx ? getReelTitleLayout(ctx, title || selectedPost?.title || "", reelFontFamily, reelFontWeight, reelTextCase, reelFontSize) : { width: 0, height: 0 };
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
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      "video/webm",
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      "video/mp4",
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

      // 4. Captura stream do Canvas. Exporta a 24 fps para manter a composição
      // do canvas abaixo do custo de renderizar um frame novo a cada 16 ms.
      canvasStream = canvas.captureStream(24);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
        audioBitsPerSecond: 128_000,
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
      const formatLabel = format === "story" ? "story" : "reel";
      const basename = (selectedPost?.slug || videoFileName.replace(/\.[^.]+$/, "") || `viralizou-${formatLabel}`)
        .replace(/[^a-zA-Z0-9_-]/g, "-") || `viralizou-${formatLabel}`;

      setVideoExport({
        url: URL.createObjectURL(blob),
        filename: `${basename}-${formatLabel}.${extension}`,
        type: blob.type,
      });
      setRecordingProgress(100);
      setMessage(`✅ Vídeo (${formatLabel.toUpperCase()}) pronto em ${extension.toUpperCase()}! Áudio e vídeo sincronizados.`);
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
                  {format === "story" && <label className="captionSafeZoneToggle"><span>Área de figurinha</span><input type="checkbox" checked={showStorySticker} onChange={(e) => toggleStorySticker(e.target.checked)} /></label>}
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
                </button>
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

            {logoData && (
              <>
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
                        background: logoColorStyle === "white" ? "transparent" : "#f1f5f9",
                        padding: "4px 8px",
                        borderRadius: 6,
                      }}
                    >
                      <img
                        src={logoData}
                        alt="Logo escolhida"
                        style={{
                          maxHeight: 34,
                          display: "block",
                          filter:
                            logoColorStyle === "white"
                              ? "drop-shadow(0 0 1px #fff) invert(1) hue-rotate(180deg)"
                              : undefined,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: logoColorStyle === "white" ? "#f8fafc" : "#0f172a",
                      }}
                    >
                      {logoColorStyle === "white"
                        ? "⚪ Letras Brancas (Fundo Escuro)"
                        : logoColorStyle === "dark"
                        ? "⚫ Letras Pretas (Fundo Claro)"
                        : "Cores Originais"}
                    </span>
                  </div>
                  <button type="button" className="btn secondary" onClick={removeLogo} style={{ fontSize: 11, padding: "3px 8px" }}>
                    Remover
                  </button>
                </div>
                <div className="adminFeedActions" style={{ marginTop: 8 }}>
                  <button type="button" className="btn secondary" onClick={centerLogo}>🎯 Centralizar logo</button>
                  <small>Arraste a logo na prévia. A posição fica salva no painel.</small>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>🔎 Tamanho da logo · {logoScale}%</label>
                  <input type="range" min="50" max="150" step="5" value={logoScale} onChange={(e) => saveReelLogoScale(Number(e.target.value))} />
                </div>
              </>
            )}
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
