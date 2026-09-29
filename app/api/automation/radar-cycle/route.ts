import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { verifyGitHubActionsOidcDetailed } from "@/lib/github-oidc";
import { automationConfigured } from "@/lib/automation-state";
import { runServerRadarAutomation } from "@/lib/server-radar-automation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function authorize(req: Request) {
  if (await isAdmin()) return { ok: true, admin: true, source: "admin", error: "" };

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, admin: false, source: "", error: "missing_bearer" };

  const verified = await verifyGitHubActionsOidcDetailed(token);
  if (!verified.payload) return { ok: false, admin: false, source: "", error: verified.error };
  return { ok: true, admin: false, source: "github-actions", error: "" };
}

export async function POST(req: Request) {
  const access = await authorize(req);
  if (!access.ok) return NextResponse.json({ error: "Não autorizado", auth_error: access.error }, { status: 401 });
  if (!automationConfigured()) {
    return NextResponse.json({ error: "Supabase precisa estar configurado para a automação 24/7." }, { status: 503 });
  }

  const url = new URL(req.url);
  const force = access.admin && url.searchParams.get("force") === "1";
  const result = await runServerRadarAutomation({ force });

  return NextResponse.json({
    ...result,
    source: access.source,
    server: "vercel",
  }, { status: result.ok ? 200 : 500 });
}
