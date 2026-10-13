import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// Auto-instalação das 2 logos originais transparentes (Branca e Preta)
try {
  const publicLogosDir = path.join(process.cwd(), "public", "logos");
  if (!fs.existsSync(publicLogosDir)) {
    fs.mkdirSync(publicLogosDir, { recursive: true });
  }

  const possibleUploadDirs = [
    "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d5396812-fe0c-45aa-9024-57e5752b1e04\\.user_uploaded",
    "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.user_uploaded",
  ];

  let whiteSrc = "";
  let darkSrc = "";

  for (const dir of possibleUploadDirs) {
    const w1 = path.join(dir, "media_1791847748374.png");
    const w2 = path.join(dir, "media_1791812215943.png");
    if (!whiteSrc && fs.existsSync(w1)) whiteSrc = w1;
    else if (!whiteSrc && fs.existsSync(w2)) whiteSrc = w2;

    const d1 = path.join(dir, "media_1791847748387.png");
    const d2 = path.join(dir, "media_1791812270897.png");
    if (!darkSrc && fs.existsSync(d1)) darkSrc = d1;
    else if (!darkSrc && fs.existsSync(d2)) darkSrc = d2;
  }

  const whiteDst = path.join(publicLogosDir, "logo-viralizou-branca.png");
  const darkDst = path.join(publicLogosDir, "logo-viralizou-preta.png");

  if (whiteSrc && fs.existsSync(whiteSrc)) {
    fs.copyFileSync(whiteSrc, whiteDst);
    fs.copyFileSync(whiteSrc, path.join(process.cwd(), "public", "logo-viralizou-branca.png"));
  }
  if (darkSrc && fs.existsSync(darkSrc)) {
    fs.copyFileSync(darkSrc, darkDst);
    fs.copyFileSync(darkSrc, path.join(process.cwd(), "public", "logo-viralizou-preta.png"));
  }

  const introGif = path.join(publicLogosDir, "logo-viralizou-intro.gif");
  const animGif = path.join(publicLogosDir, "logo-viralizou-animada.gif");
  if (fs.existsSync(introGif) && !fs.existsSync(animGif)) {
    try { fs.copyFileSync(introGif, animGif); } catch {}
  }
} catch (e) {
  // Ignora se estiver rodando em ambiente sem permissão ou na nuvem
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },
};

export default nextConfig;
