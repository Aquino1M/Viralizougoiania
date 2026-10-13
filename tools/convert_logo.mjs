/**
 * Script de conversão de "logo em gif.mp4" para GIF sem fundo verde
 * Executa o FFmpeg local para remover o chroma key e gerar:
 * 1. public/logos/logo-viralizou-animada.gif (Logo completa com transparência)
 * 2. public/logos/logo-viralizou-intro.gif (Intro 4.5s com brilho)
 * 3. public/logos/logo-viralizou-animada.webm (WebM com Alpha)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const inputVideo = path.join(projectRoot, "logo em gif.mp4");
const ffmpegExe = path.join(projectRoot, "tools", "ffmpeg.exe");
const logosDir = path.join(projectRoot, "public", "logos");

if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

if (!fs.existsSync(inputVideo)) {
  console.error(`[ERRO] Arquivo de vídeo não encontrado em: ${inputVideo}`);
  process.exit(1);
}

const ffmpegCmd = fs.existsSync(ffmpegExe) ? ffmpegExe : "ffmpeg";
console.log(`[convert-logo] Usando FFmpeg: ${ffmpegCmd}`);
console.log(`[convert-logo] Arquivo de entrada: ${inputVideo}`);

// Filtro chroma key profissional com despill anti-halo verde e paleta com transparência total
const chromaFilter =
  "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,fps=15,scale=480:-1:flags=lanczos,split[s0][s1];" +
  "[s0]palettegen=reserve_transparent=on:transparency_color=00ff00[p];" +
  "[s1][p]paletteuse=alpha_threshold=128";

const outputGif = path.join(logosDir, "logo-viralizou-animada.gif");
const outputIntroGif = path.join(logosDir, "logo-viralizou-intro.gif");
const outputWebm = path.join(logosDir, "logo-viralizou-animada.webm");

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegCmd, args, { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código ${code}`));
    });
    proc.on("error", reject);
  });
}

async function convert() {
  console.log("\n[1/3] Gerando GIF animado completo com fundo transparente...");
  await runCommand(["-y", "-i", inputVideo, "-filter_complex", chromaFilter, outputGif]);

  console.log("\n[2/3] Gerando versão Intro (primeiros 4.5s com brilho da manchete)...");
  await runCommand(["-y", "-ss", "0", "-t", "4.5", "-i", inputVideo, "-filter_complex", chromaFilter, outputIntroGif]);

  console.log("\n[3/3] Gerando versão WebM com canal Alpha transparente...");
  await runCommand([
    "-y",
    "-i", inputVideo,
    "-filter_complex", "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,scale=720:-1:flags=lanczos",
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-auto-alt-ref", "0",
    "-crf", "24",
    "-b:v", "0",
    outputWebm,
  ]);

  const stat = fs.statSync(outputGif);
  console.log(`\n🎉 [SUCESSO] Logo em GIF gerada com ${(stat.size / 1024).toFixed(1)} KB!`);
  console.log(`Arquivos salvos em ${logosDir}:`);
  console.log(`- logo-viralizou-animada.gif`);
  console.log(`- logo-viralizou-intro.gif`);
  console.log(`- logo-viralizou-animada.webm\n`);
}

convert().catch((err) => {
  console.error("[ERRO]", err);
  process.exit(1);
});
