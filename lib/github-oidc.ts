import crypto from "node:crypto";

type JwtPayload = Record<string, unknown>;

export type OidcVerification = {
  payload: JwtPayload | null;
  error: string;
};

function fromBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseJsonPart(value: string) {
  return JSON.parse(fromBase64Url(value).toString("utf8")) as Record<string, unknown>;
}

async function verifyRs256(signingInput: string, signature: Buffer, jwk: Record<string, unknown>) {
  const key = crypto.createPublicKey({ key: jwk as any, format: "jwk" });
  return crypto.verify("RSA-SHA256", Buffer.from(signingInput), key, signature);
}

export async function verifyGitHubActionsOidcDetailed(token: string): Promise<OidcVerification> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { payload: null, error: "jwt_parts" };
    const [headPart, bodyPart, sigPart] = parts;
    const header = parseJsonPart(headPart);
    const payload = parseJsonPart(bodyPart) as JwtPayload;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return { payload: null, error: "jwt_header" };

    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);
    const nbf = Number(payload.nbf || 0);
    if (!exp || exp < now - 30 || (nbf && nbf > now + 30)) return { payload: null, error: "jwt_time" };
    if (payload.iss !== "https://token.actions.githubusercontent.com") return { payload: null, error: "issuer" };

    const aud = payload.aud;
    const allowedAudiences = new Set(["viralizougoiania", "https://github.com/Aquino1M"]);
    const audienceOk = typeof aud === "string" ? allowedAudiences.has(aud) : Array.isArray(aud) && aud.some((value) => allowedAudiences.has(String(value)));
    if (!audienceOk) return { payload: null, error: "audience" };
    if (payload.repository !== "Aquino1M/Viralizougoiania") return { payload: null, error: "repository" };

    const ref = String(payload.ref || "");
    if (ref && ref !== "refs/heads/main") return { payload: null, error: "ref" };

    const workflowRef = String(payload.workflow_ref || payload.job_workflow_ref || "");
    if (workflowRef && !workflowRef.includes("Aquino1M/Viralizougoiania/.github/workflows/radar-pilot.yml@refs/heads/main")) {
      return { payload: null, error: "workflow_ref" };
    }

    const jwksRes = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!jwksRes.ok) return { payload: null, error: "jwks_http_" + jwksRes.status };
    const jwks = await jwksRes.json() as { keys?: Array<Record<string, unknown>> };
    const jwk = jwks.keys?.find((k) => k.kid === header.kid);
    if (!jwk) return { payload: null, error: "kid_not_found" };

    const valid = await verifyRs256(`${headPart}.${bodyPart}`, fromBase64Url(sigPart), jwk);
    if (!valid) return { payload: null, error: "signature" };
    return { payload, error: "" };
  } catch (error) {
    return { payload: null, error: "exception_" + (error instanceof Error ? error.name : "unknown") };
  }
}

export async function verifyGitHubActionsOidc(token: string): Promise<JwtPayload | null> {
  return (await verifyGitHubActionsOidcDetailed(token)).payload;
}
