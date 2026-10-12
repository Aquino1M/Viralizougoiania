import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let cachedFfmpegPath: string | null = null;

/**
 * Procura o executável do FFmpeg em caminhos conhecidos do Windows e no PATH.
 */
export function getFfmpegPath(): string {
  if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  const projectRoot = process.cwd();
  const localToolsPath = path.join(projectRoot, "tools", "ffmpeg.exe");
  if (fs.existsSync(localToolsPath)) {
    cachedFfmpegPath = localToolsPath;
    return localToolsPath;
  }

  const ffmpegStaticPath = path.join(projectRoot, "node_modules", "ffmpeg-static", "ffmpeg.exe");
  if (fs.existsSync(ffmpegStaticPath)) {
    cachedFfmpegPath = ffmpegStaticPath;
    return ffmpegStaticPath;
  }

  const userProfile = process.env.USERPROFILE || "";
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidatePaths = [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
    path.join(userProfile, "scoop", "shims", "ffmpeg.exe"),
    path.join(localAppData, "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(localAppData, "Programs", "ffmpeg", "bin", "ffmpeg.exe"),
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      cachedFfmpegPath = p;
      return p;
    }
  }

  // Verifica se o comando 'where ffmpeg' localiza no PATH
  if (os.platform() === "win32") {
    try {
      const output = execSync("where ffmpeg", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
      const firstLine = output.trim().split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        cachedFfmpegPath = firstLine;
        return firstLine;
      }
    } catch {}
  } else {
    try {
      const output = execSync("which ffmpeg", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
      const firstLine = output.trim().split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        cachedFfmpegPath = firstLine;
        return firstLine;
      }
    } catch {}
  }

  // Retorna padrão "ffmpeg" (caso esteja no PATH mas where não localizou)
  return "ffmpeg";
}

/**
 * Tenta baixar automaticamente o executável estático do FFmpeg caso não exista.
 */
export async function ensureFfmpegAvailable(): Promise<string> {
  const current = getFfmpegPath();
  if (current !== "ffmpeg" && fs.existsSync(current)) {
    return current;
  }

  // Se já existir no PATH (testando chamada simples)
  const isAvailableInPath = await testCommand("ffmpeg");
  if (isAvailableInPath) {
    return "ffmpeg";
  }

  // Tenta baixar o executável para tools/ffmpeg.exe
  const toolsDir = path.join(process.cwd(), "tools");
  const destPath = path.join(toolsDir, "ffmpeg.exe");

  try {
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }

    console.log("[ffmpeg] FFmpeg não encontrado. Baixando binário oficial para tools/ffmpeg.exe...");
    const downloadUrl = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64";
    const res = await fetch(downloadUrl, {
      headers: { "User-Agent": "Viralizougoiania-Server/1.0" },
      signal: AbortSignal.timeout(60000),
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 1000000) {
        fs.writeFileSync(destPath, buffer, { mode: 0o755 });
        console.log(`[ffmpeg] Download concluído com sucesso: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
        cachedFfmpegPath = destPath;
        return destPath;
      }
    }
  } catch (err) {
    console.warn("[ffmpeg] Falha ao baixar ffmpeg automaticamente:", err);
  }

  return current;
}

function testCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const p = spawn(cmd, ["-version"], { windowsHide: true });
      p.on("error", () => resolve(false));
      p.on("close", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

export function runFfmpeg(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise(async (resolve, reject) => {
    let binary = await ensureFfmpegAvailable().catch(() => getFfmpegPath());

    console.log(`[ffmpeg] Executando binário: "${binary}" com ${args.length} argumentos.`);
    const proc = spawn(binary, args, { windowsHide: true });
    let stderr = "";

    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      console.error(`[ffmpeg] Erro ao spawnar "${binary}":`, err);
      reject(err);
    });

    proc.on("close", (code) => {
      console.log(`[ffmpeg] Concluído com código ${code}`);
      if (code !== 0) {
        console.error("[ffmpeg] stderr:", stderr.slice(-1000));
      }
      resolve({ code: code ?? -1, stderr });
    });
  });
}
