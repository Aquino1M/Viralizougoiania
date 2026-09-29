import { NextRequest, NextResponse } from "next/server";
import { reclassifyExternalPosts } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ONE_TIME_KEY = "vg-reclass-20260929-7f3b91c2";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result = await reclassifyExternalPosts();
  return NextResponse.json({ ok: true, ...result, executed_at: new Date().toISOString() });
}
