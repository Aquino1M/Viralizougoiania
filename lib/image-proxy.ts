import crypto from "node:crypto";

function configuredSecret() {
  const explicit = (process.env.IMAGE_PROXY_SECRET || "").trim();
  if (explicit) return explicit;

  const supabase = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const lower = supabase.toLowerCase();
  if (supabase && !lower.includes("seu_service_role_key") && !lower.includes("your_service_role_key") && !lower.includes("troque")) {
    return supabase;
  }

  if (process.env.NODE_ENV !== "production") return "viralizougoiania-local-image-secret";
  return "";
}

function payload(url: string, width: number) {
  return `${width}:${url}`;
}

export function signImageUrl(url: string, width: number) {
  const secret = configuredSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(payload(url, width)).digest("hex");
}

export function verifyImageSignature(url: string, width: number, signature: string) {
  const expected = signImageUrl(url, width);
  if (!expected || !signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function proxyImageUrl(raw: string | undefined | null, width = 1400) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return value;

  const safeWidth = Math.max(320, Math.min(1920, Math.round(width)));
  const sig = signImageUrl(parsed.toString(), safeWidth);
  if (!sig) return value;

  return `/api/image-proxy?url=${encodeURIComponent(parsed.toString())}&w=${safeWidth}&sig=${sig}`;
}
