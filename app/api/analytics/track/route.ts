import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordPageview } from "@/lib/audience-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePath(value: unknown) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.length > 500) return "";
  if (path.startsWith("/admin") || path.startsWith("/api")) return "";
  return path;
}

function referrerHost(value: unknown) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return null;
    return new URL(raw).hostname.slice(0, 190) || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return new NextResponse(null, { status: 204 });

  const ua = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i.test(ua)) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => ({}));
  const path = safePath(body.path);
  if (!path) return new NextResponse(null, { status: 204 });

  const cookieStore = await cookies();
  let visitorId = cookieStore.get("vg_vid")?.value || "";
  if (!/^[0-9a-f-]{36}$/i.test(visitorId)) visitorId = randomUUID();

  try {
    await recordPageview(visitorId, path, referrerHost(body.referrer));
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("vg_vid", visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
