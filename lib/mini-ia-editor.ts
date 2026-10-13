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

export type MiniIaEditLevel = "leve" | "media" | "alta";

export interface MiniIaLevelConfig {
  id: MiniIaEditLevel;
  name: string;
  badge: string;
  speed: number;
  contrast: number;
  saturation: number;
  brightness: number;
  sharpness: number;
  grain: boolean;
  punchZoom: boolean;
  zoomPeriod: number;
  zoomMax: number;
  loudnessTarget: number;
  description: string;
  recommendationNote: string;
}

export const MINI_IA_LEVELS: Record<MiniIaEditLevel, MiniIaLevelConfig> = {
  leve: {
    id: "leve",
    name: "Leve",
    badge: "🟢 Anti-Detecção Sutil",
    speed: 1.015, // 1.5% mais rápido
    contrast: 1.03,
    saturation: 1.04,
    brightness: 0.01,
    sharpness: 0,
    grain: false,
    punchZoom: false,
    zoomPeriod: 0,
    zoomMax: 0,
    loudnessTarget: -16,
    description: "Preserva a aparência fiel do vídeo original, mas altera a velocidade em +1.5%, normaliza o áudio e limpa metadados para quebrar a assinatura digital (hash).",
    recommendationNote: "Ideal para matérias em que você quer manter o vídeo quase idêntico ao original.",
  },
  media: {
    id: "media",
    name: "Média",
    badge: "🟡 Equilibrada (Recomendada)",
    speed: 1.03, // 3% mais rápido
    contrast: 1.06,
    saturation: 1.10,
    brightness: 0.015,
    sharpness: 0.6,
    grain: false,
    punchZoom: true,
    zoomPeriod: 4.5, // Pulso suave a cada 4.5s
    zoomMax: 0.05, // 5% de zoom
    loudnessTarget: -16,
    description: "Equilíbrio profissional: aumenta a velocidade para +3%, aplica punch zooms suaves a cada 4.5s, realça cores com grade editorial e normaliza áudio para -16 LUFS.",
    recommendationNote: "Recomendado para 95% dos Reels e Stories. Ritmo perfeito e ótima retenção.",
  },
  alta: {
    id: "alta",
    name: "Alta",
    badge: "🔴 Transformação Máxima",
    speed: 1.05, // 5% mais rápido
    contrast: 1.09,
    saturation: 1.20,
    brightness: 0.02,
    sharpness: 1.0,
    grain: true, // Adiciona 2% de ruído analógico
    punchZoom: true,
    zoomPeriod: 3.8, // Pulso a cada 3.8s
    zoomMax: 0.08, // 8% de zoom
    loudnessTarget: -15,
    description: "Transformação radical: velocidade +5%, punch zooms enérgicos a cada 3.8s, cores vibrantes, nitidez aprimorada, vinheta e micro-grão anti-pHash que elimina 100% de hashes repetidos.",
    recommendationNote: "Essencial para vídeos virais baixados de outros perfis ou com risco de strike de originalidade.",
  },
};

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
  framingMode: "cover" | "blur-fit";
  verticalPos: number; // -100 a +100
  editLevel: MiniIaEditLevel;
  mirror?: boolean;
  hasAudio?: boolean;
  width?: number;
  height?: number;
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
    mirror = false,
    hasAudio = true,
    width = 1080,
    height = 1920,
    animatedLogo,
  } = options;

  const cfg = MINI_IA_LEVELS[editLevel] || MINI_IA_LEVELS.media;
  const speed = cfg.speed;

  // 1. Filtros de base no vídeo original
  const mirrorFilter = mirror ? "hflip," : "";
  const speedFilter = `setpts=PTS/${speed}`;

  // 2. Look e color grading da Mini IA
  const colorFilter = `eq=contrast=${cfg.contrast}:brightness=${cfg.brightness}:saturation=${cfg.saturation}`;
  let postFxFilter = colorFilter;

  if (cfg.sharpness > 0) {
    postFxFilter += `,unsharp=3:3:${cfg.sharpness.toFixed(1)}:3:3:0.0`;
  }
  if (cfg.grain) {
    // 2% de micro-grão imperceptível mas destrói qualquer pHash idêntico
    postFxFilter += `,noise=alls=2:allf=t+u,vignette=PI/4.5`;
  }

  // 3. Punch Zoom dinâmico (se ativado pelo nível)
  let zoomExpr = "";
  if (cfg.punchZoom && cfg.zoomPeriod > 0) {
    // Onda suave pulsante no tempo: max zoom durante o pico e retorno suave
    zoomExpr = `,scale=w='trunc(iw*(1+${cfg.zoomMax}*pow(sin(PI*t/${cfg.zoomPeriod}),6))/2)*2':h='trunc(ih*(1+${cfg.zoomMax}*pow(sin(PI*t/${cfg.zoomPeriod}),6))/2)*2':eval=frame,crop=${width}:${height}:(in_w-out_w)/2:(in_h-out_h)/2`;
  }

  let filterComplex = "";
  let baseLayerTag = "base";

  if (framingMode === "blur-fit") {
    // Estilo Jornalístico: Vídeo original centralizado sem cortes + fundo ampliado com desfoque
    filterComplex =
      `[0:v]${speedFilter},${mirrorFilter}split=2[v_bg][v_fg];` +
      `[v_bg]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=22:5,eq=brightness=-0.22[bg];` +
      `[v_fg]scale=${width}:${height}:force_original_aspect_ratio=decrease,${postFxFilter}${zoomExpr}[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[${baseLayerTag}];`;
  } else {
    // Estilo Tela Cheia (Cover): Preenchimento total mantendo enquadramento vertical configurável
    const factor = Math.max(-1, Math.min(1, verticalPos / 100));
    const ratio = ((1 + factor) / 2).toFixed(3);

    baseLayerTag = "bg";
    filterComplex =
      `[0:v]${speedFilter},${mirrorFilter}` +
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
