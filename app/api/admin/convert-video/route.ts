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
  const inputPath = path.join(tmpDir, `viralizou-convert-in-${id}.webm`);
  const outputPath = path.join(tmpDir, `viralizou-convert-out-${id}.mp4`);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedName = (formData.get("filename") as string | null) || `viralizou-reel-${id}.mp4`;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado para conversão." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(inputPath, buffer);

    // Converte para MP4 padrão oficial H.264 Main Profile + AAC 44.1kHz + faststart
    // 100% aceito no WhatsApp, Instagram, TikTok, Windows Media Player e iOS
    const ffmpegArgs = [
      "-y",
      "-threads", "0",
      "-i", inputPath,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-profile:v", "main",
      "-level", "4.0",
      "-preset", "veryfast",
      "-crf", "22",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-movflags", "+faststart",
      outputPath,
    ];

    const result = await runFfmpeg(ffmpegArgs);
    if (result.code !== 0) {
      console.error("[convert-video] FFmpeg error:", result.stderr);
      throw new Error(`Falha na conversão com FFmpeg (${result.code}).`);
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
    console.error("Erro ao converter vídeo para MP4:", error);
    const msg = (error as any)?.code === "ENOENT"
      ? "FFmpeg não está instalado no PATH do servidor (ENOENT)."
      : error instanceof Error ? error.message : "Não foi possível converter para MP4.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
