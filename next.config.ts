import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// Auto-instalação das 2 logos originais transparentes (Branca e Preta)
try {
  const publicLogosDir = path.join(process.cwd(), "public", "logos");
  if (!fs.existsSync(publicLogosDir)) {
    fs.mkdirSync(publicLogosDir, { recursive: true });
  }

  const userUploadedDir = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.user_uploaded";
  const whiteSrc = path.join(userUploadedDir, "media_1791812215943.png");
  const darkSrc = path.join(userUploadedDir, "media_1791812270897.png");

  const whiteDst = path.join(publicLogosDir, "logo-viralizou-branca.png");
  const darkDst = path.join(publicLogosDir, "logo-viralizou-preta.png");

  if (fs.existsSync(whiteSrc)) {
    fs.copyFileSync(whiteSrc, whiteDst);
    fs.copyFileSync(whiteSrc, path.join(process.cwd(), "public", "logo-viralizou-branca.png"));
  }
  if (fs.existsSync(darkSrc)) {
    fs.copyFileSync(darkSrc, darkDst);
    fs.copyFileSync(darkSrc, path.join(process.cwd(), "public", "logo-viralizou-preta.png"));
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
