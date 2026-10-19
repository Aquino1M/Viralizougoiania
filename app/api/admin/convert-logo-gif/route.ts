import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { runFfmpeg, getFfmpegPath } from "@/lib/ffmpeg";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Gerencia a logo animada transparente do portal (WebM VP9 com Alpha, MOV ProRes ou GIF)
 */
export async function GET() {
  try {
    const projectRoot = process.cwd();
    const logosDir = path.join(projectRoot, "public", "logos");

    const webmPath = path.join(logosDir, "Viralizou_Goiania_logo_animada_transparente.webm");
    const movPath = path.join(logosDir, "Viralizou_Goiania_logo_animada_transparente.mov");
    const introGifPath = path.join(logosDir, "logo-viralizou-intro.gif");
    const gifPath = path.join(logosDir, "logo-viralizou-animada.gif");

    if (fsSync.existsSync(webmPath)) {
      const stat = await fs.stat(webmPath);
      return NextResponse.json({
        ok: true,
        exists: true,
        format: "webm",
        url: "/logos/Viralizou_Goiania_logo_animada_transparente.webm",
        size: stat.size,
      });
    }

    if (fsSync.existsSync(introGifPath)) {
      const stat = await fs.stat(introGifPath);
      return NextResponse.json({
        ok: true,
        exists: true,
        format: "gif",
        url: "/logos/logo-viralizou-intro.gif",
        size: stat.size,
      });
    }

    if (fsSync.existsSync(gifPath)) {
      const stat = await fs.stat(gifPath);
      return NextResponse.json({
        ok: true,
        exists: true,
        format: "gif",
        url: "/logos/logo-viralizou-animada.gif",
        size: stat.size,
      });
    }

    if (fsSync.existsSync(movPath)) {
      const stat = await fs.stat(movPath);
      return NextResponse.json({
        ok: true,
        exists: true,
        format: "mov",
        url: "/logos/Viralizou_Goiania_logo_animada_transparente.mov",
        size: stat.size,
      });
    }

    return NextResponse.json({
      ok: true,
      exists: false,
      message: "Nenhuma logo animada encontrada em public/logos.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro ao verificar logo" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const projectRoot = process.cwd();
  const logosDir = path.join(projectRoot, "public", "logos");
  if (!fsSync.existsSync(logosDir)) {
    await fs.mkdir(logosDir, { recursive: true });
  }

  const outputGif = path.join(logosDir, "logo-viralizou-animada.gif");

  // 1. Prioridade máxima: Usar o WebM transparente já pronto pelo usuário
  const cleanWebm = path.join(logosDir, "Viralizou_Goiania_logo_animada_transparente.webm");
  const cleanMov = path.join(logosDir, "Viralizou_Goiania_logo_animada_transparente.mov");
  const greenMp4 = path.join(projectRoot, "logo em gif.mp4");

  const ffmpegBin = getFfmpegPath();

  if (fsSync.existsSync(cleanWebm) || fsSync.existsSync(cleanMov)) {
    const inputClean = fsSync.existsSync(cleanWebm) ? cleanWebm : cleanMov;
    console.log(`[convert-logo-gif] Convertendo vídeo transparente nativo para GIF: ${inputClean}`);

    // Como já tem canal Alpha nativo, apenas gera paleta com transparência total
    const filter =
      "[0:v]fps=15,scale=480:-1:flags=lanczos,split[s0][s1];" +
      "[s0]palettegen=reserve_transparent=on:transparency_color=00000000[p];" +
      "[s1][p]paletteuse=alpha_threshold=128";

    const res = await runFfmpeg([
      "-y",
      "-i", inputClean,
      "-filter_complex", filter,
      outputGif,
    ]);

    if (res.code === 0) {
      const stat = await fs.stat(outputGif);
      return NextResponse.json({
        ok: true,
        generated: true,
        format: "gif",
        url: "/logos/logo-viralizou-animada.gif",
        webmUrl: "/logos/Viralizou_Goiania_logo_animada_transparente.webm",
        size: stat.size,
      });
    }
  }

  // 2. Fallback: Se só tiver o MP4 antigo com fundo verde
  if (fsSync.existsSync(greenMp4)) {
    console.log(`[convert-logo-gif] Convertendo com filtro chroma key: ${greenMp4}`);
    const chromaFilter =
      "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,fps=15,scale=480:-1:flags=lanczos,split[s0][s1];" +
      "[s0]palettegen=reserve_transparent=on:transparency_color=00ff00[p];" +
      "[s1][p]paletteuse=alpha_threshold=128";

    const res = await runFfmpeg([
      "-y",
      "-i", greenMp4,
      "-filter_complex", chromaFilter,
      outputGif,
    ]);

    if (res.code === 0) {
      const stat = await fs.stat(outputGif);
      return NextResponse.json({
        ok: true,
        generated: true,
        format: "gif",
        url: "/logos/logo-viralizou-animada.gif",
        size: stat.size,
      });
    }
  }

  return NextResponse.json(
    { error: "Nenhum arquivo de logo em vídeo encontrado para converter." },
    { status: 404 }
  );
}
