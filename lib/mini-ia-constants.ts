/**
 * Constantes e Tipagens Compartilhadas da Mini IA de Edição
 * Arquivo universal (100% puro TS) para uso tanto no cliente (React / Navegador) quanto no servidor.
 * SEM dependências do Node.js (como child_process ou fs) para garantir compatibilidade com Turbopack / Vercel.
 */

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

export interface VideoCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type VideoFilterPreset = "none" | "natural" | "cinema" | "dark_moody" | "cyberpunk" | "vintage" | "noir" | "hdr";

export interface VideoFilterConfig {
  id: VideoFilterPreset;
  name: string;
  badge: string;
  icon: string;
  canvasFilter: string;
  ffmpegFilter: string;
  description: string;
}

export const VIDEO_FILTERS: Record<VideoFilterPreset, VideoFilterConfig> = {
  none: {
    id: "none",
    name: "Original",
    badge: "Padrão",
    icon: "✨",
    canvasFilter: "none",
    ffmpegFilter: "",
    description: "Cores originais do vídeo sem qualquer filtro.",
  },
  natural: {
    id: "natural",
    name: "Natural Realçado",
    badge: "Cores Vivas",
    icon: "🌿",
    canvasFilter: "contrast(1.08) brightness(1.02) saturate(1.12)",
    ffmpegFilter: "eq=contrast=1.08:brightness=0.02:saturation=1.12",
    description: "Realce sutil e equilibrado preservando a fidelidade das cores naturais.",
  },
  cinema: {
    id: "cinema",
    name: "Cinema",
    badge: "Teal & Orange",
    icon: "🎬",
    canvasFilter: "contrast(1.15) brightness(1.02) saturate(1.22) hue-rotate(354deg)",
    ffmpegFilter: "eq=contrast=1.15:brightness=0.02:saturation=1.22,colorbalance=rs=0.08:gs=-0.04:bs=-0.12:rm=0.05:gm=-0.02:bm=-0.08",
    description: "Look de filme com sombras frias teal e realce de pele alaranjado.",
  },
  dark_moody: {
    id: "dark_moody",
    name: "Dark Moody",
    badge: "Tenso & Escuro",
    icon: "🏙️",
    canvasFilter: "contrast(1.28) brightness(0.92) saturate(0.85)",
    ffmpegFilter: "eq=contrast=1.28:brightness=-0.08:saturation=0.85",
    description: "Contraste dramático e sombras profundas para notícias de impacto.",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    badge: "Neon Pop",
    icon: "⚡",
    canvasFilter: "contrast(1.22) brightness(1.05) saturate(1.55) hue-rotate(12deg)",
    ffmpegFilter: "eq=contrast=1.22:brightness=0.05:saturation=1.55,hue=h=12",
    description: "Cores neon vibrantes e alta saturação com estética moderna.",
  },
  vintage: {
    id: "vintage",
    name: "Vintage",
    badge: "VHS Anos 90",
    icon: "🎞️",
    canvasFilter: "contrast(1.08) brightness(1.02) sepia(0.35) saturate(0.9)",
    ffmpegFilter: "eq=contrast=1.08:brightness=0.02:saturation=0.9,colorchannelmixer=rr=1.0:rg=0.1:rb=0:gr=0:gg=0.9:gb=0.1:br=0:bg=0.1:bb=0.7",
    description: "Tom quente nostálgico inspirado em câmeras analógicas.",
  },
  noir: {
    id: "noir",
    name: "Preto & Branco",
    badge: "Noir Dramático",
    icon: "🖤",
    canvasFilter: "grayscale(1) contrast(1.35) brightness(0.95)",
    ffmpegFilter: "hue=s=0,eq=contrast=1.35:brightness=-0.05",
    description: "Monocromático de alto contraste e foco total na ação.",
  },
  hdr: {
    id: "hdr",
    name: "HDR Vivid",
    badge: "Ultra Nitidez",
    icon: "🌟",
    canvasFilter: "contrast(1.18) brightness(1.06) saturate(1.35)",
    ffmpegFilter: "eq=contrast=1.18:brightness=0.06:saturation=1.35,unsharp=5:5:0.8:5:5:0.0",
    description: "Brilho e definição aumentados para destacar o vídeo no feed.",
  },
};

export type BgmTrackPreset = "energetic" | "breaking" | "suspense" | "chill" | "none";

export interface BgmTrackConfig {
  id: BgmTrackPreset;
  name: string;
  icon: string;
  tempoBpm: number;
  description: string;
}

export const BGM_TRACKS: Record<BgmTrackPreset, BgmTrackConfig> = {
  energetic: {
    id: "energetic",
    name: "Energetic",
    icon: "🔥",
    tempoBpm: 128,
    description: "Batida viral energética e motivacional com alta retenção.",
  },
  breaking: {
    id: "breaking",
    name: "Plantão / Urgente",
    icon: "🚨",
    tempoBpm: 135,
    description: "Trilha de noticiário urgente com tensão e seriedade.",
  },
  suspense: {
    id: "suspense",
    name: "Suspense",
    icon: "🕵️",
    tempoBpm: 95,
    description: "Clima misterioso e investigativo para revelações.",
  },
  chill: {
    id: "chill",
    name: "Chill / Lo-Fi",
    icon: "☕",
    tempoBpm: 85,
    description: "Fundo calmo e moderno para matérias informativas.",
  },
  none: {
    id: "none",
    name: "Sem Trilha",
    icon: "🔇",
    tempoBpm: 0,
    description: "Apenas o áudio original do vídeo.",
  },
};

export interface AutoEditAnalysis {
  hook: string;
  keywordsCount: number;
  zoomsCount: number;
  brollCount: number;
  animatedScenesCount: number;
  reactionsCount: number;
  bgmTrack: BgmTrackPreset;
  cutPauses: boolean;
  videoFilter: VideoFilterPreset;
}
