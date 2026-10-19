/**
 * Cliente de Integração com a API & CDN do Real Oficial
 * Gerencia tokens, autenticação, catálogo de SFX (efeitos sonoros) e trilhas de fundo para a Mini IA.
 */

export interface RealOficialSfxItem {
  id: string;
  name: string;
  category: "transicao" | "impacto" | "noticia" | "alerta" | "reacao";
  icon: string;
  durationSec: number;
  url: string;
  description: string;
  isExclusive?: boolean;
}

export interface RealOficialTrackItem {
  id: string;
  name: string;
  icon: string;
  tempoBpm: number;
  url: string;
  description: string;
}

export interface RealOficialConfigStatus {
  configured: boolean;
  maskedToken: string;
  apiUrl: string;
  cdnUrl: string;
}

// Catálogo padrão de SFX da CDN do Real Oficial (alta disponibilidade e velocidade)
export const DEFAULT_REAL_OFICIAL_SFX: RealOficialSfxItem[] = [
  {
    id: "whoosh-transicao",
    name: "Whoosh Dinâmico",
    category: "transicao",
    icon: "💨",
    durationSec: 0.6,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/whoosh-transition.mp3",
    description: "Transição rápida e moderna para cortes dinâmicos de vídeo.",
  },
  {
    id: "pop-palavra",
    name: "Pop Viral",
    category: "impacto",
    icon: "🎈",
    durationSec: 0.3,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/pop-clean.mp3",
    description: "Pop nítido perfeito para entrada de palavras-chave e ganchos.",
  },
  {
    id: "ding-plantao",
    name: "Sino de Plantão / Destaque",
    category: "noticia",
    icon: "🔔",
    durationSec: 1.2,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/ding-notification.mp3",
    description: "Campainha suave para chamar atenção em notícias importantes.",
  },
  {
    id: "bass-impacto",
    name: "Sub-Bass Grave",
    category: "impacto",
    icon: "💥",
    durationSec: 1.5,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/bass-drop-impact.mp3",
    description: "Impacto pesado nos primeiros segundos para retenção máxima de Reels.",
  },
  {
    id: "camera-shutter",
    name: "Flash de Câmera",
    category: "noticia",
    icon: "📸",
    durationSec: 0.5,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/camera-shutter.mp3",
    description: "Disparo clássico de máquina fotográfica para imagens e fatos.",
  },
  {
    id: "alerta-urgente",
    name: "Vinheta Alerta Noticioso",
    category: "alerta",
    icon: "🚨",
    durationSec: 1.8,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/boom-urgente.mp3",
    description: "Tom dramático de plantão urgente para denúncias e política.",
  },
  {
    id: "riser-tensao",
    name: "Riser de Tensão",
    category: "transicao",
    icon: "📈",
    durationSec: 2.2,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/tension-riser.mp3",
    description: "Subida contínua de suspense antes do desfecho do vídeo.",
  },
  {
    id: "paper-jornal",
    name: "Virada de Página / Jornal",
    category: "noticia",
    icon: "📰",
    durationSec: 0.7,
    url: "https://cdn.realoficial.com.br/auto-edit-library/sfx/paper-turn.mp3",
    description: "Folear de papel de imprensa para credibilidade jornalística.",
  },
];

// Trilhas de fundo oficiais da biblioteca Real Oficial
export const DEFAULT_REAL_OFICIAL_TRACKS: RealOficialTrackItem[] = [
  {
    id: "energetic",
    name: "Energetic Phonk Remix",
    icon: "🔥",
    tempoBpm: 128,
    url: "https://cdn.realoficial.com.br/auto-edit-library/music/cc0-energetic-phonk-remix.mp3",
    description: "Batida viral energética e motivacional com alta retenção.",
  },
  {
    id: "breaking",
    name: "Plantão / Urgente News Bed",
    icon: "🚨",
    tempoBpm: 135,
    url: "https://cdn.realoficial.com.br/auto-edit-library/music/ai-podcast-news-bed.mp3",
    description: "Trilha de noticiário urgente com tensão e seriedade.",
  },
  {
    id: "suspense",
    name: "Emotional Strings Suspense",
    icon: "🕵️",
    tempoBpm: 95,
    url: "https://cdn.realoficial.com.br/auto-edit-library/music/ai-emotional-strings.mp3",
    description: "Clima misterioso e investigativo para revelações.",
  },
  {
    id: "chill",
    name: "Chill Lo-Fi Rooftops",
    icon: "☕",
    tempoBpm: 85,
    url: "https://cdn.realoficial.com.br/auto-edit-library/music/cc0-chill-roof-tops.mp3",
    description: "Fundo calmo e moderno para matérias informativas e entrevistas.",
  },
];

export function getRealOficialToken(): string {
  const token = (
    process.env.REAL_OFICIAL_TOKEN ||
    process.env.REAL_OFICIAL_API_KEY ||
    process.env.NEXT_PUBLIC_REAL_OFICIAL_TOKEN ||
    ""
  ).trim();
  return token;
}

export function getRealOficialApiUrl(): string {
  return (
    process.env.REAL_OFICIAL_API_URL ||
    process.env.NEXT_PUBLIC_REAL_OFICIAL_API_URL ||
    "https://api.realoficial.com.br"
  ).replace(/\/+$/, "");
}

export function getRealOficialCdnUrl(): string {
  return (
    process.env.REAL_OFICIAL_CDN_URL ||
    process.env.NEXT_PUBLIC_REAL_OFICIAL_CDN_URL ||
    "https://cdn.realoficial.com.br"
  ).replace(/\/+$/, "");
}

export function getRealOficialStatus(): RealOficialConfigStatus {
  const token = getRealOficialToken();
  const configured = token.length > 5;
  const maskedToken = configured
    ? `${token.slice(0, 4)}...${token.slice(-4)}`
    : "";

  return {
    configured,
    maskedToken,
    apiUrl: getRealOficialApiUrl(),
    cdnUrl: getRealOficialCdnUrl(),
  };
}

/**
 * Busca o catálogo atualizado de SFX conectando na API com o REAL_OFICIAL_TOKEN,
 * com fallback seguro para os áudios nativos da CDN.
 */
export async function fetchRealOficialSfxCatalog(): Promise<{
  sfx: RealOficialSfxItem[];
  source: "api" | "cdn-fallback";
  connected: boolean;
}> {
  const token = getRealOficialToken();
  const apiUrl = getRealOficialApiUrl();

  if (token) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${apiUrl}/v1/auto-edit/sfx`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Real-Oficial-Token": token,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const remoteSfx: RealOficialSfxItem[] = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        if (remoteSfx.length > 0) {
          return {
            sfx: remoteSfx,
            source: "api",
            connected: true,
          };
        }
      }
    } catch (err) {
      console.warn("[real-oficial] Falha ao consultar endpoint remoto, usando catálogo CDN:", err);
    }
  }

  return {
    sfx: DEFAULT_REAL_OFICIAL_SFX,
    source: "cdn-fallback",
    connected: Boolean(token),
  };
}
