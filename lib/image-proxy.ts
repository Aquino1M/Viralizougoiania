import crypto from "node:crypto";

function secret() {
  return process.env.IMAGE_PROXY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "viralizougoiania-local-image-secret";
}

function payload(url: string, width: number) {
  return `${width}:${url}`;
}

export function signImageUrl(url: string, width: number) {
  return crypto.createHmac("sha256", secret()).update(payload(url, width)).digest("hex");
}

export function verifyImageSignature(url: string, width: number, signature: string) {
  const expected = signImageUrl(url, width);
  if (signature.length !== expected.length) return false;
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
  return `/api/image-proxy?url=${encodeURIComponent(parsed.toString())}&w=${safeWidth}&sig=${sig}`;
}
