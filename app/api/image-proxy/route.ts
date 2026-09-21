import { NextRequest } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { verifyImageSignature } from "@/lib/image-proxy";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

function isPrivateIp(ip: string) {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (/^(fc|fd|fe8|fe9|fea|feb)/i.test(ip)) return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return isPrivateIp(mapped);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

async function safeUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("URL inválida"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocolo não permitido");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw new Error("Host não permitido");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Endereço privado não permitido");
  } else {
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) throw new Error("Endereço não permitido");
  }
  return url;
}

function optimizeUpstream(raw: string, width: number) {
  try {
    const url = new URL(raw);
    if (/\.glbimg\.com$/i.test(url.hostname) || /(^|\.)glbimg\.com$/i.test(url.hostname)) {
      url.pathname = url.pathname.replace(/\/\d+x0\//, `/${width}x0/`);
      return url.toString();
    }
    if (url.hostname.endsWith("unsplash.com")) {
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", "78");
      url.searchParams.set("auto", "format");
      return url.toString();
    }
  } catch {}
  return raw;
}

async function fetchImage(raw: string) {
  let current = await safeUrl(raw);
  for (let i = 0; i < 4; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      cache: "force-cache",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Viralizougoiania-ImageProxy/1.0",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });
    if ([301,302,303,307,308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirecionamento inválido");
      current = await safeUrl(new URL(location, current).toString());
      continue;
    }
    if (!res.ok) throw new Error("Imagem indisponível");
    const type = res.headers.get("content-type") || "";
    if (!type.toLowerCase().startsWith("image/")) throw new Error("O endereço não é uma imagem");
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("Imagem muito grande");
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Error("Imagem muito grande");
    return { bytes, type };
  }
  throw new Error("Muitos redirecionamentos");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  const signature = req.nextUrl.searchParams.get("sig") || "";
  const widthRaw = Number(req.nextUrl.searchParams.get("w") || 1400);
  const width = Math.max(320, Math.min(1920, Number.isFinite(widthRaw) ? Math.round(widthRaw) : 1400));

  if (!raw || !signature || !verifyImageSignature(raw, width, signature)) {
    return new Response("Imagem não autorizada", { status: 403 });
  }

  try {
    const optimized = optimizeUpstream(raw, width);
    const { bytes, type } = await fetchImage(optimized);
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não foi possível carregar a imagem", { status: 502 });
  }
}
