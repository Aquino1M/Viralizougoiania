import crypto from "node:crypto";

type JwtPayload = Record<string, unknown>;

function fromBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseJsonPart(value: string) {
  return JSON.parse(fromBase64Url(value).toString("utf8")) as Record<string, unknown>;
}

async function verifyRs256(signingInput: string, signature: Buffer, jwk: JsonWebKey) {
  const key = await crypto.webcrypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.webcrypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    Buffer.from(signingInput),
  );
}

export async function verifyGitHubActionsOidc(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headPart, bodyPart, sigPart] = parts;
    const header = parseJsonPart(headPart);
    const payload = parseJsonPart(bodyPart) as JwtPayload;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);
    const nbf = Number(payload.nbf || 0);
    if (!exp || exp < now - 30 || (nbf && nbf > now + 30)) return null;
    if (payload.iss !== "https://token.actions.githubusercontent.com") return null;

    const aud = payload.aud;
    const audienceOk = aud === "viralizougoiania" || (Array.isArray(aud) && aud.includes("viralizougoiania"));
    if (!audienceOk) return null;
    if (payload.repository !== "Aquino1M/Viralizougoiania") return null;
    if (payload.ref !== "refs/heads/main") return null;

    const workflowRef = String(payload.workflow_ref || payload.job_workflow_ref || "");
    if (workflowRef && !workflowRef.includes("Aquino1M/Viralizougoiania/.github/workflows/radar-pilot.yml@refs/heads/main")) {
      return null;
    }

    const jwksRes = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
    if (!jwksRes.ok) return null;
    const jwks = await jwksRes.json() as { keys?: JsonWebKey[] };
    const jwk = jwks.keys?.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const valid = await verifyRs256(`${headPart}.${bodyPart}`, fromBase64Url(sigPart), jwk);
    return valid ? payload : null;
  } catch {
    return null;
  }
}
