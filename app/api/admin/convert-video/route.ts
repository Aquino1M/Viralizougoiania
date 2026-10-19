import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { runFfmpeg } from "@/lib/ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(8).toString("hex");

  let inputPath = "";
  let outputPath = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedName = (formData.get("filename") as string | null) || `viralizou-whatsapp-${id}.mp4`;
    const preset = (formData.get("preset") as string | null) || "whatsapp_standard";
    const customCrf = formData.get("crf") ? Number(formData.get("crf")) : null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado para conversão." }, { status: 400 });
    }

    const extMatch = (file.name || "").match(/\.([a-zA-Z0-9]+)$/);
    const inExt = extMatch ? `.${extMatch[1].toLowerCase()}` : ".mp4";
    inputPath = path.join(tmpDir, `viralizou-in-${id}${inExt}`);
    outputPath = path.join(tmpDir, `viralizou-out-${id}.mp4`);

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const originalSize = originalBuffer.length;
    await fs.writeFile(inputPath, originalBuffer);

    // Configuração oficial de compressão e compatibilidade para WhatsApp (estilo FreeConvert)
    // 100% aceito no WhatsApp (Android, iOS, Web, Desktop), Instagram e TikTok
    let crf = "26";
    let maxrate = "2800k";
    let bufsize = "5600k";
    let scaleFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

    if (preset === "whatsapp_light") {
      // Super compressão (< 16 MB para envio instantâneo sem cortar)
      crf = "28";
      maxrate = "1800k";
      bufsize = "3600k";
      scaleFilter = "scale='min(iw,720)':-2:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2";
    } else if (preset === "whatsapp_hd") {
      // Alta qualidade HD (1080p nítido mantendo compatibilidade)
      crf = "22";
      maxrate = "4500k";
      bufsize = "9000k";
      scaleFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
    } else {
      // Padrão WhatsApp (Recomendado - 60% a 80% menor, sem perda perceptível de qualidade)
      crf = "26";
      maxrate = "2800k";
      bufsize = "5600k";
      scaleFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
    }

    if (customCrf && customCrf >= 18 && customCrf <= 34) {
      crf = String(customCrf);
    }

    const trimStartParam = formData.get("trimStart");
    const trimStart = trimStartParam !== null && trimStartParam !== undefined && trimStartParam !== ""
      ? Math.max(0, Number(trimStartParam) || 0)
      : 0;

    const ffmpegArgs = [
      "-y",
      "-threads", "0",
    ];

    if (trimStart > 0) {
      ffmpegArgs.push("-ss", trimStart.toFixed(2));
    }

    ffmpegArgs.push(
      "-i", inputPath,
      "-vf", scaleFilter,
      "-map", "0:v:0",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-profile:v", "main",
      "-level", "4.0",
      "-preset", "veryfast",
      "-crf", crf,
      "-maxrate", maxrate,
      "-bufsize", bufsize,
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      outputPath
    );

    console.log(`[convert-video] Iniciando compressão WhatsApp: preset=${preset}, crf=${crf}, inSize=${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    const result = await runFfmpeg(ffmpegArgs);
    if (result.code !== 0) {
      console.error("[convert-video] FFmpeg error:", result.stderr);
      throw new Error(`Falha na compressão do vídeo com FFmpeg (${result.code}).`);
    }

    const outputBuffer = await fs.readFile(outputPath);
    const compressedSize = outputBuffer.length;
    const reductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

    console.log(`[convert-video] Compressão finalizada: ${(originalSize / 1024 / 1024).toFixed(2)} MB -> ${(compressedSize / 1024 / 1024).toFixed(2)} MB (-${reductionPercent}%)`);

    const safeFilename = requestedName.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.[^.]+$/, ".mp4");

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(outputBuffer.length),
        "Cache-Control": "no-store",
        "X-Original-Size": String(originalSize),
        "X-Compressed-Size": String(compressedSize),
        "X-Reduction-Percent": String(reductionPercent),
        "Access-Control-Expose-Headers": "Content-Disposition, X-Original-Size, X-Compressed-Size, X-Reduction-Percent",
      },
    });
  } catch (error) {
    console.error("Erro ao converter/comprimir vídeo para WhatsApp:", error);
    const msg = (error as any)?.code === "ENOENT"
      ? "FFmpeg não está instalado no PATH do servidor (ENOENT)."
      : error instanceof Error ? error.message : "Não foi possível comprimir o vídeo para WhatsApp.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  } finally {
    if (inputPath) await fs.unlink(inputPath).catch(() => {});
    if (outputPath) await fs.unlink(outputPath).catch(() => {});
  }
}
