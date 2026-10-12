import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

function runFfmpeg(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { windowsHide: true });
    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => resolve({ code: code ?? -1, stderr }));
  });
}

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

    if (!videoFile || !overlayFile) {
      return NextResponse.json({ error: "Vídeo ou imagem de sobreposição ausente." }, { status: 400 });
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const overlayBuffer = Buffer.from(await overlayFile.arrayBuffer());

    await fs.writeFile(videoInputPath, videoBuffer);
    await fs.writeFile(overlayInputPath, overlayBuffer);

    // FFmpeg sobrepõe a arte visual pré-renderizada (legenda, logo, selo) diretamente sobre o vídeo
    // Mantém a proporção exata 9:16 (1080x1920) e taxa de quadros estável a 30 FPS
    const ffmpegArgs = [
      "-y",
      "-i", videoInputPath,
      "-loop", "1",
      "-i", overlayInputPath,
      "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[bg][1:v]overlay=0:0:shortest=1[outv]",
      "-map", "[outv]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "ultrafast",
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
      console.error("FFmpeg render error:", result.stderr);
      throw new Error("Falha na renderização de vídeo pelo FFmpeg.");
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível renderizar o vídeo." },
      { status: 500 }
    );
  } finally {
    await fs.unlink(videoInputPath).catch(() => {});
    await fs.unlink(overlayInputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
