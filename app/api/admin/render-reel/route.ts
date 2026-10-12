import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { runFfmpeg } from "@/lib/ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(8).toString("hex");
  const videoInputPath = path.join(tmpDir, `viralizou-render-video-${id}.mp4`);
  const overlayInputPath = path.join(tmpDir, `viralizou-render-overlay-${id}.png`);
  const outputPath = path.join(tmpDir, `viralizou-render-out-${id}.mp4`);

  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const overlayFile = formData.get("overlay") as File | null;
    const requestedName = (formData.get("filename") as string | null) || `viralizou-reel-${id}.mp4`;
    const framingMode = (formData.get("framingMode") as string | null) || "cover";
    const verticalPos = Number(formData.get("vertical") || 0);

    if (!videoFile || !overlayFile) {
      return NextResponse.json({ error: "Vídeo ou imagem de sobreposição ausente." }, { status: 400 });
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const overlayBuffer = Buffer.from(await overlayFile.arrayBuffer());

    console.log(`[render-reel] Recebido vídeo de ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB e overlay de ${(overlayBuffer.length / 1024).toFixed(1)} KB | Framing: ${framingMode} | PosY: ${verticalPos}%`);

    await fs.writeFile(videoInputPath, videoBuffer);
    await fs.writeFile(overlayInputPath, overlayBuffer);

    // Filtros de enquadramento 9:16 (1080x1920) perfeitos para Reels e Stories
    let filterComplex = "";
    if (framingMode === "blur-fit") {
      // Estilo Jornalístico: Vídeo original centralizado sem cortes + fundo ampliado com desfoque
      filterComplex =
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=22:5,eq=brightness=-0.18[bg];" +
        "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];" +
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[base];" +
        "[base][1:v]overlay=x=0:y=0:shortest=1[outv]";
    } else {
      // Estilo Tela Cheia (Cover): Preenchimento 1080x1920 com enquadramento vertical configurável
      const factor = Math.max(-1, Math.min(1, verticalPos / 100));
      const ratio = ((1 + factor) / 2).toFixed(3);
      filterComplex =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,` +
        `crop=1080:1920:(in_w-out_w)/2:${ratio}*(in_h-out_h)[bg];` +
        `[bg][1:v]overlay=x=0:y=0:shortest=1[outv]`;
    }

    // Configuração oficial de compatibilidade universal (H.264 / AAC / YUV420P / +faststart)
    // 100% aceito no WhatsApp, Instagram Reels, TikTok, Windows Media Player e iOS
    const ffmpegArgs = [
      "-y",
      "-threads", "0",
      "-i", videoInputPath,
      "-loop", "1",
      "-i", overlayInputPath,
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-profile:v", "main",
      "-level", "4.0",
      "-preset", "veryfast",
      "-crf", "20",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-shortest",
      "-movflags", "+faststart",
      outputPath,
    ];

    const result = await runFfmpeg(ffmpegArgs);
    if (result.code !== 0) {
      console.error("[render-reel] FFmpeg render error:", result.stderr);
      return NextResponse.json(
        { error: `Erro no FFmpeg (${result.code}): ${result.stderr.slice(-600)}` },
        { status: 500 }
      );
    }

    const outputBuffer = await fs.readFile(outputPath);
    const safeFilename = requestedName.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.[^.]+$/, ".mp4");

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(outputBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao renderizar reel via FFmpeg:", error);
    const msg = (error as any)?.code === "ENOENT"
      ? "FFmpeg não está instalado no PATH do servidor (ENOENT)."
      : error instanceof Error ? error.message : "Não foi possível renderizar o vídeo.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  } finally {
    await fs.unlink(videoInputPath).catch(() => {});
    await fs.unlink(overlayInputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
