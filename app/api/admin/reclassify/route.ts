import { NextResponse } from "next/server";
import { reclassifyExternalPosts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await reclassifyExternalPosts();
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await reclassifyExternalPosts();
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
