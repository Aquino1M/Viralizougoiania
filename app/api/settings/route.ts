import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao carregar configurações" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const settings = await updateSettings({
      socials: body.socials || {},
      site_name: body.site_name,
      tagline: body.tagline,
    });
    return NextResponse.json({ settings, success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar configurações" }, { status: 500 });
  }
}
