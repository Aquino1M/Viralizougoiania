const CP1252_DECODE: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
  0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž",
  0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
  0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

const CP1252_ENCODE = new Map<string, number>(
  Object.entries(CP1252_DECODE).map(([byte, char]) => [char, Number(byte)])
);

function decodeWindows1252(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(bytes.length, start + chunkSize);
    const chars = new Array<string>(end - start);
    for (let i = start; i < end; i++) {
      const byte = bytes[i];
      chars[i - start] = CP1252_DECODE[byte] ?? String.fromCharCode(byte);
    }
    chunks.push(chars.join(""));
  }
  return chunks.join("");
}

function normalizeCharset(value = ""): string {
  const raw = value.trim().toLowerCase().replace(/["']/g, "");
  if (!raw) return "";
  if (raw === "utf8") return "utf-8";
  if (raw === "latin1" || raw === "latin-1" || raw === "iso-8859-1" || raw === "iso8859-1") return "windows-1252";
  if (raw === "cp1252" || raw === "windows1252") return "windows-1252";
  return raw;
}

function sniffCharset(bytes: Uint8Array, contentType = ""): string {
  const header = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
  if (header) return normalizeCharset(header);

  const head = decodeWindows1252(bytes.subarray(0, Math.min(bytes.length, 4096)));
  const xml = head.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i)?.[1];
  if (xml) return normalizeCharset(xml);
  const metaCharset = head.match(/<meta[^>]*charset\s*=\s*["']?([^"'\s/>]+)/i)?.[1];
  if (metaCharset) return normalizeCharset(metaCharset);
  const metaContent = head.match(/<meta[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^;"'\s]+)/i)?.[1];
  return normalizeCharset(metaContent || "");
}

function decodeWithCharset(bytes: Uint8Array, charset: string): string | null {
  const normalized = normalizeCharset(charset);
  try {
    if (normalized === "windows-1252") {
      try {
        return new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
      } catch {
        return decodeWindows1252(bytes);
      }
    }
    if (normalized === "utf-8" || normalized === "") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    return new TextDecoder(normalized, { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function brokenScore(value: string): number {
  let score = 0;
  score += (value.match(/\uFFFD/g) || []).length * 50;
  score += (value.match(/(?:Ã.|Â.|â[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]|ðŸ)/g) || []).length * 8;
  score += (value.match(/[\u0080-\u009f]/g) || []).length * 3;
  return score;
}

function encodeAsWindows1252(value: string): Uint8Array | null {
  const bytes: number[] = [];
  for (const char of value) {
    const cp = char.codePointAt(0)!;
    if (cp <= 0xff) {
      bytes.push(cp);
      continue;
    }
    const mapped = CP1252_ENCODE.get(char);
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    return null;
  }
  return new Uint8Array(bytes);
}

export function repairMojibake(value = ""): string {
  if (!value || !/(?:Ã.|Â.|â.|ðŸ|\uFFFD)/.test(value)) return value;

  // U+FFFD já representa byte perdido; a recuperação real é feita ao reler a fonte.
  // Aqui corrigimos apenas mojibake reversível, como BrasÃ­lia -> Brasília.
  const bytes = encodeAsWindows1252(value);
  if (!bytes) return value;

  try {
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return brokenScore(repaired) < brokenScore(value) ? repaired : value;
  } catch {
    return value;
  }
}

export function hasBrokenEncoding(value: string | null | undefined): boolean {
  if (!value) return false;
  return /\uFFFD|(?:Ã.|Â.|â[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]|ðŸ)/.test(value);
}

export function decodeBytesSmart(bytes: Uint8Array, contentType = "", maxChars = Number.POSITIVE_INFINITY): string {
  const declared = sniffCharset(bytes, contentType);
  const labels = Array.from(new Set([declared, "utf-8", "windows-1252"].filter(Boolean)));
  const candidates: string[] = [];

  for (const label of labels) {
    const decoded = decodeWithCharset(bytes, label);
    if (decoded !== null) candidates.push(repairMojibake(decoded));
  }

  if (!candidates.length) candidates.push(decodeWindows1252(bytes));

  candidates.sort((a, b) => brokenScore(a) - brokenScore(b));
  return candidates[0].slice(0, maxChars);
}

export async function readResponseTextSmart(response: Response, maxChars = Number.POSITIVE_INFINITY): Promise<string> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  return decodeBytesSmart(bytes, response.headers.get("content-type") || "", maxChars);
}
