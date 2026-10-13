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
