import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const commonPaths = [
    "ffmpeg",
    "ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(process.env.USERPROFILE || "", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(process.env.USERPROFILE || "", "scoop", "shims", "ffmpeg.exe"),
    path.join(process.env.ProgramData || "", "chocolatey", "bin", "ffmpeg.exe"),
  ];

  const foundPaths = commonPaths.filter((p) => {
    if (p === "ffmpeg" || p === "ffmpeg.exe") return false;
    try {
      return fs.existsSync(/*turbopackIgnore: true*/ p);
    } catch {
      return false;
    }
  });

  return new Promise<NextResponse>((resolve) => {
    exec("ffmpeg -version", (err, stdout, stderr) => {
      resolve(
        NextResponse.json({
          inPath: !err,
          stdout: stdout ? stdout.slice(0, 300) : null,
          stderr: stderr ? stderr.slice(0, 300) : null,
          error: err ? err.message : null,
          foundDiskPaths: foundPaths,
          envPath: process.env.PATH?.split(";").slice(0, 10),
        })
      );
    });
  });
}
