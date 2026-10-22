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
  const videoInputPath = path.join(tmpDir, `viralizou-render-video-${id}.mp4`);
  const overlayInputPath = path.join(tmpDir, `viralizou-render-overlay-${id}.png`);
  const outputPath = path.join(tmpDir, `viralizou-render-out-${id}.mp4`);

  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const overlayFile = formData.get("overlay") as File | null;
    const requestedName = (formData.get("filename") as string | null) || `viralizou-reel-${id}.mp4`;
    const framingMode = ((formData.get("framingMode") as string | null) || "cover") as "cover" | "blur-fit" | "horizontal-block" | "split" | "split-1v2i";
    const splitVideoSide = (formData.get("splitVideoSide") as "left" | "right" | null) || "right";
    const splitHeaderH = formData.get("splitHeaderH") ? Number(formData.get("splitHeaderH")) : undefined;
    const verticalPos = Number(formData.get("vertical") || 0);
    const videoBlockPosY = formData.get("videoBlockPosY") ? Number(formData.get("videoBlockPosY")) : undefined;
    const customSaturation = formData.get("customSaturation") ? Number(formData.get("customSaturation")) : undefined;
    const customContrast = formData.get("customContrast") ? Number(formData.get("customContrast")) : undefined;
    const customBrightness = formData.get("customBrightness") ? Number(formData.get("customBrightness")) : undefined;
    const customSharpness = formData.get("customSharpness") ? Number(formData.get("customSharpness")) : undefined;
    const editLevel = ((formData.get("editLevel") as string | null) || "media") as import("@/lib/mini-ia-editor").MiniIaEditLevel;
    const mirror = String(formData.get("mirror") || "false") === "true";
    const formatType = (formData.get("format") as string | null) || "reel";
    const videoFilter = ((formData.get("videoFilter") as string | null) || "none") as import("@/lib/mini-ia-constants").VideoFilterPreset;
    const cropX = formData.get("cropX") ? Number(formData.get("cropX")) : undefined;
    const cropY = formData.get("cropY") ? Number(formData.get("cropY")) : undefined;
    const cropW = formData.get("cropW") ? Number(formData.get("cropW")) : undefined;
    const cropH = formData.get("cropH") ? Number(formData.get("cropH")) : undefined;
    const crop = (cropW && cropH && cropW > 0 && cropH > 0)
      ? { x: cropX || 0, y: cropY || 0, width: cropW, height: cropH }
      : undefined;
    const bgmTrack = (formData.get("bgmTrack") as string | null) || "none";
    const bgmVolume = Number(formData.get("bgmVolume") || 15);
    const sfxPreset = (formData.get("sfxPreset") as string | null) || "none";
    const sfxVolume = Number(formData.get("sfxVolume") || 70);
    const upscale = formData.get("upscale") !== "false";
    const audioSyncLock = formData.get("audioSyncLock") === "true";

    if (!videoFile || !overlayFile) {
      return NextResponse.json({ error: "Vídeo ou imagem de sobreposição ausente." }, { status: 400 });
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const overlayBuffer = Buffer.from(await overlayFile.arrayBuffer());

    console.log(`[render-reel] Recebido vídeo de ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB e overlay de ${(overlayBuffer.length / 1024).toFixed(1)} KB | Framing: ${framingMode} | PosY: ${verticalPos}% | MiniIA: ${editLevel} | Mirror: ${mirror} | SFX: ${sfxPreset} (${sfxVolume}%)`);

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

    // Corte inicial anti-detecção: se for 0 ou não informado, NUNCA corta
    const trimStartParam = formData.get("trimStart");
    const rawTrimStart = trimStartParam !== null && trimStartParam !== undefined && trimStartParam !== ""
      ? Number(trimStartParam)
      : 0;
    const trimStart = isNaN(rawTrimStart) ? 0 : Math.max(0, rawTrimStart);

    let effectiveTrimStart = trimStart;
    if (videoInfo.duration > 0 && effectiveTrimStart >= videoInfo.duration) {
      effectiveTrimStart = Math.max(0, Math.floor(videoInfo.duration - 1));
      console.log(`[render-reel] Ajustando corte inicial de ${trimStart}s para ${effectiveTrimStart}s (duração total: ${videoInfo.duration.toFixed(1)}s)`);
    }

    const requestedClipDuration = Number(formData.get("trimDuration"));
    const clipDuration = Math.min(
      Number.isFinite(requestedClipDuration) && requestedClipDuration > 0 ? requestedClipDuration : 179.5,
      179.5,
      Math.max(0, videoInfo.duration - effectiveTrimStart)
    );
    if (clipDuration < 1) {
      return NextResponse.json({ error: "O trecho selecionado precisa ter pelo menos 1 segundo." }, { status: 400 });
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
      path.join(projectRoot, "public", "logos", "logo-viralizou-intro.gif"),
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

    // Constrói o filtergraph avançado da Mini IA com anti-detecção e color grading personalizado
    const { filterComplex, hasAudioFilter, speed } = buildMiniIaFilterGraph({
      framingMode,
      verticalPos,
      videoBlockPosY,
      customSaturation,
      customContrast,
      customBrightness,
      customSharpness,
      editLevel,
      mirror,
      hasAudio,
      width,
      height,
      splitVideoSide,
      splitHeaderH,
      animatedLogo: animatedLogoConfig,
      videoFilter,
      crop,
      upscale,
      audioSyncLock,
    });
    const targetVideoBitrate = Math.min(4_000_000, Math.max(1_500_000, Math.floor((70 * 1024 * 1024 * 8) / (clipDuration / Math.max(speed, 0.1)) - 128_000)));

    // Configuração oficial de compatibilidade universal (H.264 / AAC / YUV420P / +faststart)
    // 100% aceito no WhatsApp, Instagram Reels, TikTok, Windows Media Player e iOS
    const ffmpegArgs = [
      "-y",
      "-threads", "0",
    ];

    // Aplica corte inicial nos primeiros segundos para quebrar fingerprint/hash e remover vinhetas
    if (effectiveTrimStart > 0) {
      ffmpegArgs.push("-accurate_seek", "-ss", effectiveTrimStart.toFixed(2));
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
      "-maxrate", String(targetVideoBitrate),
      "-bufsize", String(targetVideoBitrate * 2),
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-shortest",
      "-movflags", "+faststart",
      "-map_metadata", "-1",
      "-metadata", "title=Viralizou Goiania - Conteudo Original",
      "-metadata", "artist=Viralizou Goiania",
      "-metadata", `comment=Processado com Mini IA (${editLevel.toUpperCase()}) - Velocidade ${speed}x - SFX: ${sfxPreset} - Corte Inicial ${effectiveTrimStart}s`,
      "-t", (clipDuration / Math.max(speed, 0.1)).toFixed(2),
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
    if (outputBuffer.length > 95 * 1024 * 1024) {
      return NextResponse.json({ error: "A exportação ultrapassou o limite seguro de 95 MiB. Reduza o trecho selecionado." }, { status: 413 });
    }
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
