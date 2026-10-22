import { NextResponse } from "next/server";
import { isAdmin, isAdministrator } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/storage";
import fsSync from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function syncUploadedAssets() {
  try {
    const userUploadedLogo = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\05f1ad7a-878c-43ff-9525-efe8bcdf74ea\\.user_uploaded\\media_1791933403602.png";
    const logosDir = path.join(process.cwd(), "public", "logos");
    if (!fsSync.existsSync(logosDir)) {
      fsSync.mkdirSync(logosDir, { recursive: true });
    }
    const destLogo = path.join(logosDir, "logo-circular-vermelha.png");
    if (fsSync.existsSync(userUploadedLogo) && !fsSync.existsSync(destLogo)) {
      fsSync.copyFileSync(userUploadedLogo, destLogo);
    }
  } catch {}
}

export async function GET() {
  try {
    syncUploadedAssets();
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao carregar configurações" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdministrator())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    syncUploadedAssets();
    const body = await req.json();
    const settings = await updateSettings({
      socials: body.socials || {},
      site_name: body.site_name,
      tagline: body.tagline,
      feed_logo: body.feed_logo,
      feed_handle: body.feed_handle,
    });
    return NextResponse.json({ settings, success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar configurações" }, { status: 500 });
  }
}
