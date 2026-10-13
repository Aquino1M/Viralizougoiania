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
    const framingMode = ((formData.get("framingMode") as string | null) || "cover") as "cover" | "blur-fit";
    const verticalPos = Number(formData.get("vertical") || 0);
    const editLevel = ((formData.get("editLevel") as string | null) || "media") as import("@/lib/mini-ia-editor").MiniIaEditLevel;
    const mirror = String(formData.get("mirror") || "false") === "true";
    const formatType = (formData.get("format") as string | null) || "reel";

    if (!videoFile || !overlayFile) {
      return NextResponse.json({ error: "Vídeo ou imagem de sobreposição ausente." }, { status: 400 });
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const overlayBuffer = Buffer.from(await overlayFile.arrayBuffer());

    console.log(`[render-reel] Recebido vídeo de ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB e overlay de ${(overlayBuffer.length / 1024).toFixed(1)} KB | Framing: ${framingMode} | PosY: ${verticalPos}% | MiniIA: ${editLevel} | Mirror: ${mirror}`);

    await fs.writeFile(videoInputPath, videoBuffer);
    await fs.writeFile(overlayInputPath, overlayBuffer);

    // Determina dimensões com base no formato
    let width = 1080;
    let height = 1920;
    if (formatType === "feed-square") {
      height = 1080;
    } else if (formatType === "feed" || formatType === "reel-cover") {
      height = 1350;
    }

    // Inspeciona duração e stream de áudio do vídeo original
    const { probeVideoInfo, buildMiniIaFilterGraph } = await import("@/lib/mini-ia-editor");
    const videoInfo = await probeVideoInfo(videoInputPath);
    const hasAudio = videoInfo.hasAudio;

    // Corte inicial anti-detecção (padrão oficial: sempre corta 3 segundos se não especificado)
    const trimStartParam = formData.get("trimStart");
    const rawTrimStart = trimStartParam !== null && trimStartParam !== undefined && trimStartParam !== ""
      ? Number(trimStartParam)
      : 3;
    const trimStart = isNaN(rawTrimStart) ? 3 : Math.max(0, rawTrimStart);

    let effectiveTrimStart = trimStart;
    if (videoInfo.duration > 0 && effectiveTrimStart >= videoInfo.duration) {
      effectiveTrimStart = Math.max(0, Math.floor(videoInfo.duration - 1));
      console.log(`[render-reel] Ajustando corte inicial de ${trimStart}s para ${effectiveTrimStart}s (duração total: ${videoInfo.duration.toFixed(1)}s)`);
    }

    console.log(`[render-reel] Vídeo analisado: duração=${videoInfo.duration.toFixed(1)}s | áudio=${hasAudio ? "SIM" : "NÃO"} | corte inicial=${effectiveTrimStart}s`);

    // Suporte para logo animada transparente (WebM VP9 com Alpha, MOV ProRes ou GIF)
    const animatedLogo = String(formData.get("animatedLogo") || "false") === "true";
    const logoX = Number(formData.get("logoX") || "330");
    const logoY = Number(formData.get("logoY") || "100");
    const logoW = Number(formData.get("logoW") || "420");

    let animatedLogoConfig = undefined;
    let animatedLogoPath = "";
    const projectRoot = process.cwd();

    const candidateLogoPaths = [
      path.join(projectRoot, "public", "logos", "Viralizou_Goiania_logo_animada_transparente.webm"),
      path.join(projectRoot, "public", "logos", "Viralizou_Goiania_logo_animada_transparente.mov"),
      path.join(projectRoot, "public", "logos", "logo-viralizou-animada.gif"),
    ];

    if (animatedLogo) {
      for (const cand of candidateLogoPaths) {
        if (await fs.stat(/*turbopackIgnore: true*/ cand).then(() => true).catch(() => false)) {
          animatedLogoPath = cand;
          break;
        }
      }
    }

    const hasAnimatedLogo = Boolean(animatedLogoPath);
    if (hasAnimatedLogo) {
      animatedLogoConfig = {
        inputIndex: 2,
        x: logoX,
        y: logoY,
        width: logoW,
      };
    }

    // Constrói o filtergraph avançado da Mini IA com anti-detecção
    const { filterComplex, hasAudioFilter, speed } = buildMiniIaFilterGraph({
      framingMode,
      verticalPos,
      editLevel,
      mirror,
      hasAudio,
      width,
      height,
      animatedLogo: animatedLogoConfig,
    });

    // Configuração oficial de compatibilidade universal (H.264 / AAC / YUV420P / +faststart)
    // 100% aceito no WhatsApp, Instagram Reels, TikTok, Windows Media Player e iOS
    const ffmpegArgs = [
      "-y",
      "-threads", "0",
    ];

    // Aplica corte inicial nos primeiros segundos para quebrar fingerprint/hash e remover vinhetas
    if (effectiveTrimStart > 0) {
      ffmpegArgs.push("-ss", effectiveTrimStart.toFixed(2));
    }

    ffmpegArgs.push(
      "-i", videoInputPath,
      "-loop", "1",
      "-i", overlayInputPath,
    );

    if (hasAnimatedLogo) {
      if (animatedLogoPath.toLowerCase().endsWith(".gif")) {
        ffmpegArgs.push("-ignore_loop", "0", "-i", animatedLogoPath);
      } else {
        ffmpegArgs.push("-stream_loop", "-1", "-i", animatedLogoPath);
      }
    }

    ffmpegArgs.push(
      "-filter_complex", filterComplex,
      "-map", "[outv]",
    );

    if (hasAudioFilter) {
      ffmpegArgs.push("-map", "[outa]");
    } else if (hasAudio) {
      ffmpegArgs.push("-map", "0:a?");
    }

    ffmpegArgs.push(
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
      "-map_metadata", "-1",
      "-metadata", "title=Viralizou Goiania - Conteudo Original",
      "-metadata", "artist=Viralizou Goiania",
      "-metadata", `comment=Processado com Mini IA (${editLevel.toUpperCase()}) - Velocidade ${speed}x - Corte Inicial ${effectiveTrimStart}s`,
      outputPath
    );

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
