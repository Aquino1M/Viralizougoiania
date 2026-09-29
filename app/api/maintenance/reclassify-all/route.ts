import { NextResponse } from "next/server";
import { reclassifyExternalPosts } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN = "vg-reclassify-20260929-7f3a9c";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result = await reclassifyExternalPosts();
  return NextResponse.json({ ok: true, ...result, executed_at: new Date().toISOString() });
}
