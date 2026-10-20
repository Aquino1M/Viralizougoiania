/**
 * Mini IA de Edição de Vídeo do Viralizou Goiânia
 * Módulo especializado em transformação de mídia para cumprir as diretrizes
 * de originalidade do Instagram Reels, Stories, TikTok e WhatsApp.
 * 
 * Bypassa o Content ID / detecção de conteúdo duplicado do Instagram alterando:
 * 1. Pacing & Cadência de Áudio (atempo 1.015x a 1.05x)
 * 2. Perceptual Video Hashing (pHash) através de punch zooms e micro-grão
 * 3. Color Grading & Histograma de luminância/saturação
 * 4. Normalização de áudio Broadcast/Social (-16 LUFS)
 * 5. Limpeza e reescrita de metadados
 */

import { runFfmpeg } from "./ffmpeg";
export * from "./mini-ia-constants";
import { MINI_IA_LEVELS, type MiniIaEditLevel, VIDEO_FILTERS, type VideoFilterPreset, type VideoCropRect } from "./mini-ia-constants";

/**
 * Detecta se o arquivo possui uma stream de áudio válida inspecionando o cabeçalho via FFmpeg
 */
export async function detectAudioStream(videoPath: string): Promise<boolean> {
  try {
    const probe = await runFfmpeg(["-i", videoPath, "-t", "0.05", "-vn", "-f", "null", "-"]);
    // FFmpeg sempre imprime o layout de streams em stderr
    return /Audio:\s/i.test(probe.stderr || "");
  } catch (err) {
    console.warn("[mini-ia] Erro ao detectar áudio, assumindo ausência:", err);
    return false;
  }
}

export interface VideoProbeInfo {
  duration: number;
  hasAudio: boolean;
}

/**
 * Inspeciona a duração total em segundos e se há áudio presente no vídeo
 */
export async function probeVideoInfo(videoPath: string): Promise<VideoProbeInfo> {
  try {
    const probe = await runFfmpeg(["-i", videoPath, "-t", "0.05", "-vn", "-f", "null", "-"]);
    const text = probe.stderr || "";
    const hasAudio = /Audio:\s/i.test(text);
    let duration = 0;
    const match = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseFloat(match[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
    return { duration, hasAudio };
  } catch (err) {
    console.warn("[mini-ia] Erro ao inspecionar info do vídeo:", err);
    return { duration: 0, hasAudio: false };
  }
}

export interface BuildFilterGraphOptions {
  framingMode: "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i";
  verticalPos: number; // -100 a +100
  editLevel: MiniIaEditLevel;
  videoFilter?: VideoFilterPreset;
  mirror?: boolean;
  crop?: VideoCropRect;
  hasAudio?: boolean;
  width?: number;
  height?: number;
  customSaturation?: number;
  customContrast?: number;
  customBrightness?: number;
  customSharpness?: number;
  videoBlockPosY?: number;
  splitVideoSide?: "left" | "right";
  splitHeaderH?: number;
  animatedLogo?: {
    inputIndex: number;
    x: number;
    y: number;
    width: number;
  };
}

/**
 * Constrói o filtergraph oficial do FFmpeg para a Mini IA de Edição
 */
export function buildMiniIaFilterGraph(options: BuildFilterGraphOptions): {
  filterComplex: string;
  hasAudioFilter: boolean;
  speed: number;
} {
  const {
    framingMode,
    verticalPos,
    editLevel,
    videoFilter = "none",
    mirror = false,
    crop,
    hasAudio = true,
    width = 1080,
    height = 1920,
    customSaturation,
    customContrast,
    customBrightness,
    customSharpness,
    videoBlockPosY,
    animatedLogo,
  } = options;

  const cfg = MINI_IA_LEVELS[editLevel] || MINI_IA_LEVELS.media;
  const speed = cfg.speed;

  // 1. Filtros de base no vídeo original (Crop personalizado, espelhamento e velocidade)
  const cropFilter = crop && crop.width > 0 && crop.height > 0
    ? `crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)},`
    : "";
  const mirrorFilter = mirror ? "hflip," : "";
  const speedFilter = `setpts=PTS/${speed}`;

  // 2. Look e color grading da Mini IA (com personalização de saturação, contraste, brilho e nitidez)
  const conMult = typeof customContrast === "number" ? (customContrast > 3 ? customContrast / 100 : customContrast) : 1.0;
  const effContrast = Math.max(0.2, (cfg.contrast || 1.0) * conMult);

  const satMult = typeof customSaturation === "number" ? (customSaturation > 3 ? customSaturation / 100 : customSaturation) : 1.0;
  const effSaturation = Math.max(0, (cfg.saturation || 1.0) * satMult);

  const rawBri = typeof customBrightness === "number" ? customBrightness : 1.0;
  const briOffset = (rawBri > 3 ? rawBri / 100 : rawBri) - 1.0;
  const effBrightness = Math.max(-0.8, Math.min(0.8, (cfg.brightness || 0.0) + briOffset));

  const rawSharp = typeof customSharpness === "number" ? customSharpness : cfg.sharpness;
  const effSharpness = rawSharp > 3 ? (rawSharp / 100) * 1.5 : rawSharp;

  const colorFilter = `eq=contrast=${effContrast.toFixed(2)}:brightness=${effBrightness.toFixed(2)}:saturation=${effSaturation.toFixed(2)}`;
  let postFxFilter = colorFilter;

  if (effSharpness > 0) {
    postFxFilter += `,unsharp=3:3:${effSharpness.toFixed(1)}:3:3:0.0`;
  }
  if (cfg.grain && editLevel === "alta") {
    // Micro-grão sutil anti-pHash
    postFxFilter += `,noise=alls=2:allf=t+u,vignette=PI/4.5`;
  }

  // Aplica o filtro de color grading estilizado (Cinema, Dark Moody, Cyberpunk, etc.)
  if (videoFilter && videoFilter !== "none") {
    const filterCfg = VIDEO_FILTERS[videoFilter];
    if (filterCfg && filterCfg.ffmpegFilter) {
      postFxFilter += `,${filterCfg.ffmpegFilter}`;
    }
  }

  // 3. Punch Zoom dinâmico (se ativado pelo nível)
  let zoomExpr = "";
  if (cfg.punchZoom && cfg.zoomPeriod > 0) {
    // Onda suave pulsante no tempo: max zoom durante o pico e retorno suave
    zoomExpr = `,scale=w='trunc(iw*(1+${cfg.zoomMax}*pow(sin(PI*t/${cfg.zoomPeriod}),6))/2)*2':h='trunc(ih*(1+${cfg.zoomMax}*pow(sin(PI*t/${cfg.zoomPeriod}),6))/2)*2':eval=frame,crop=${width}:${height}:(in_w-out_w)/2:(in_h-out_h)/2`;
  }

  let filterComplex = "";
  let baseLayerTag = "base";

  if (framingMode === "horizontal-block") {
    // Bloco Horizontal Noticioso (16:9 posicionado livremente com fundo de desfoque atmosférico)
    const normalizedY = typeof videoBlockPosY === "number"
      ? Math.max(0.1, Math.min(0.85, videoBlockPosY))
      : Math.max(0.1, Math.min(0.85, 0.5 + (verticalPos / 200)));
    const posYExpr = `max(0\\,min(H-h\\,round(H*${normalizedY.toFixed(3)}-h/2)))`;

    filterComplex =
      `[0:v]${cropFilter}${speedFilter},${mirrorFilter}split=2[v_bg][v_fg];` +
      `[v_bg]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=24:5,eq=brightness=-0.35[bg];` +
      `[v_fg]scale=${width}:-2:flags=lanczos,${postFxFilter}[fg];` +
      `[bg][fg]overlay=(W-w)/2:${posYExpr}[${baseLayerTag}];`;
  } else if (framingMode === "split") {
    // Split 50/50: Superior focado/aproximado + Inferior contextual aberto
    const halfH = Math.floor(height / 2);
    filterComplex =
      `[0:v]${cropFilter}${speedFilter},${mirrorFilter}split=2[v_top][v_bottom];` +
      `[v_top]scale=${width}:${halfH}:force_original_aspect_ratio=increase,crop=${width}:${halfH},${postFxFilter}[top_crop];` +
      `[v_bottom]scale=${width}:${halfH}:force_original_aspect_ratio=decrease,pad=${width}:${halfH}:(ow-iw)/2:(oh-ih)/2:black,${postFxFilter}[bottom_fit];` +
      `[top_crop][bottom_fit]vstack[${baseLayerTag}];`;
  } else if (framingMode === "split-1v2i") {
    // 1 Vídeo com 2 Imagens Divididas Lateralmente (Estilo Copaíba Notícias)
    const headerH = typeof options.splitHeaderH === "number" ? options.splitHeaderH : 340;
    const vidW = Math.floor(width / 2);
    const vidH = Math.max(100, height - headerH);
    const vidSide = options.splitVideoSide || "right";
    const vidX = vidSide === "right" ? vidW : 0;
    const vidY = headerH;

    baseLayerTag = "base";
    filterComplex =
      `[0:v]${cropFilter}${speedFilter},${mirrorFilter}` +
      `scale=${vidW}:${vidH}:force_original_aspect_ratio=increase,` +
      `crop=${vidW}:${vidH},` +
      `${postFxFilter}${zoomExpr},` +
      `pad=${width}:${height}:${vidX}:${vidY}:black[${baseLayerTag}];`;
  } else if (framingMode === "blur-fit") {
    // Estilo Jornalístico: Vídeo original centralizado sem cortes + fundo ampliado com desfoque
    filterComplex =
      `[0:v]${cropFilter}${speedFilter},${mirrorFilter}split=2[v_bg][v_fg];` +
      `[v_bg]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=22:5,eq=brightness=-0.22[bg];` +
      `[v_fg]scale=${width}:${height}:force_original_aspect_ratio=decrease,${postFxFilter}${zoomExpr}[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[${baseLayerTag}];`;
  } else {
    // Estilo Tela Cheia (Cover): Preenchimento total mantendo enquadramento vertical configurável
    const factor = Math.max(-1, Math.min(1, verticalPos / 100));
    const ratio = ((1 + factor) / 2).toFixed(3);

    baseLayerTag = "bg";
    filterComplex =
      `[0:v]${cropFilter}${speedFilter},${mirrorFilter}` +
      `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
      `crop=${width}:${height}:(in_w-out_w)/2:${ratio}*(in_h-out_h),` +
      `${postFxFilter}${zoomExpr}[${baseLayerTag}];`;
  }

  // Se houver logo animada (GIF/WebM), escala e sobrepõe antes da arte overlay estática
  if (animatedLogo) {
    const animW = Math.max(100, Math.round(animatedLogo.width));
    const animX = Math.round(animatedLogo.x);
    const animY = Math.round(animatedLogo.y);
    filterComplex +=
      `[${animatedLogo.inputIndex}:v]scale=${animW}:-1:flags=lanczos[anim_logo];` +
      `[${baseLayerTag}][anim_logo]overlay=x=${animX}:y=${animY}:shortest=1[with_logo];` +
      `[with_logo][1:v]overlay=x=0:y=0:shortest=1[outv]`;
  } else {
    filterComplex += `[${baseLayerTag}][1:v]overlay=x=0:y=0:shortest=1[outv]`;
  }

  // 4. Áudio com alteração de tempo (atempo) e normalização Loudnorm
  let hasAudioFilter = false;
  if (hasAudio) {
    hasAudioFilter = true;
    let audioFilters = `[0:a]atempo=${speed},loudnorm=I=${cfg.loudnessTarget}:TP=-1.5:LRA=11`;
    if (editLevel !== "leve") {
      audioFilters += `,alimiter=limit=0.95`;
    }
    audioFilters += `[outa]`;
    filterComplex += `;${audioFilters}`;
  }

  return { filterComplex, hasAudioFilter, speed };
}
