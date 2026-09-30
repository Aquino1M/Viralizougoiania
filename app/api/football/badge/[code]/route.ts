import { FOOTBALL_TEAMS } from "@/lib/football-data";

export const revalidate = 2592000;

const CACHE_SECONDS = 60 * 60 * 24 * 30;
const STALE_SECONDS = 60 * 60 * 24 * 365;

function fallbackSvg(code: string, primary = "#334155", secondary = "#ffffff") {
  const safeCode = code.replace(/[^A-Z0-9-]/g, "").slice(0, 5) || "FC";
  const safePrimary = /^#[0-9a-f]{6}$/i.test(primary) ? primary : "#334155";
  const safeSecondary = /^#[0-9a-f]{6}$/i.test(secondary) ? secondary : "#ffffff";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="48" fill="#fff"/>
    <circle cx="48" cy="48" r="42" fill="${safePrimary}"/>
    <circle cx="48" cy="48" r="36" fill="none" stroke="${safeSecondary}" stroke-width="3"/>
    <text x="48" y="55" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="${safeSecondary}">${safeCode}</text>
  </svg>`;
}

function fallbackResponse(code: string, primary?: string, secondary?: string) {
  return new Response(fallbackSvg(code, primary, secondary), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode || "").trim().toUpperCase();
  const team = FOOTBALL_TEAMS.find((item) => item.code.toUpperCase() === code);

  if (!team?.badgeUrl) {
    return fallbackResponse(code);
  }

  try {
    const response = await fetch(team.badgeUrl, {
      next: { revalidate: CACHE_SECONDS },
      headers: {
        Accept: "image/avif,image/webp,image/svg+xml,image/png,image/*,*/*;q=0.8",
        "User-Agent": "Viralizougoiania/1.0 football-badge-cache",
      },
      signal: AbortSignal.timeout(8000),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return fallbackResponse(code, team.primaryColor, team.secondaryColor);
    }

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
        "CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
        "Vercel-CDN-Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fallbackResponse(code, team.primaryColor, team.secondaryColor);
  }
}
