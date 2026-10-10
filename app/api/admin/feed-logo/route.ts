import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json({ logo: settings.feed_logo || "" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar a logo" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const logo = typeof body.logo === "string" ? body.logo.trim() : "";

    if (logo && !logo.startsWith("data:image/") && !logo.startsWith("http://") && !logo.startsWith("https://")) {
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 });
    }

    const updated = await updateSettings({ feed_logo: logo });
    return NextResponse.json({ success: true, logo: updated.feed_logo || "" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar a logo no Supabase" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    await updateSettings({ feed_logo: "" });
    return NextResponse.json({ success: true, message: "Logo removida com sucesso" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao remover logo" },
      { status: 500 }
    );
  }
}
