import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateFallbackSvg(isWhite: boolean): string {
  const textColor = isWhite ? "#ffffff" : "#1e293b";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&amp;display=swap');
      .vg-brand-text { font-family: 'Montserrat', sans-serif; font-weight: 900; }
    </style>
  </defs>
  <!-- Símbolo VG estilizado em Vermelho -->
  <g transform="translate(10, 15) scale(0.95)">
    <!-- Letra V com arco envolvente -->
    <path d="M 35 30 L 78 135 L 120 30 L 92 30 L 78 100 L 63 30 Z" fill="#dc2626" />
    <!-- Letra G circular integrada -->
    <path d="M 125 75 C 125 40 155 18 195 18 C 235 18 262 42 265 78 L 235 78 C 232 55 215 42 195 42 C 172 42 153 58 153 82 C 153 106 172 122 195 122 C 218 122 232 108 234 94 L 195 94 L 195 72 L 263 72 C 263 125 228 146 195 146 C 155 146 125 120 125 75 Z" fill="#dc2626" />
  </g>
  <!-- Texto VIRALIZOU GOIÂNIA -->
  <text x="275" y="78" fill="${textColor}" font-size="52" class="vg-brand-text" letter-spacing="3.5">VIRALIZOU</text>
  <text x="275" y="142" fill="${textColor}" font-size="52" class="vg-brand-text" letter-spacing="4.5">GOIÂNIA</text>
</svg>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> }
) {
  const { variant } = await params;
  const isWhite = variant.toLowerCase().includes("white") || variant.toLowerCase().includes("branc");

  const publicDir = path.join(process.cwd(), "public", "logos");
  const fileName = isWhite ? "logo-viralizou-branca.png" : "logo-viralizou-preta.png";
  const filePath = path.join(publicDir, fileName);

  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    const userUploadedDir = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.user_uploaded";
    const tempMediaDir = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.tempmediaStorage";

    const candidatePaths = isWhite
      ? [
          path.join(userUploadedDir, "media_1791812215943.png"),
          path.join(tempMediaDir, "media_1791812661864.png"),
          path.join(process.cwd(), "public", "logo-viralizou-branca.png"),
          path.join(process.cwd(), "public", "logos", "logo-viralizou-branca.png"),
        ]
      : [
          path.join(userUploadedDir, "media_1791812270897.png"),
          path.join(tempMediaDir, "media_1791812668250.png"),
          path.join(process.cwd(), "public", "logo-viralizou-preta.png"),
          path.join(process.cwd(), "public", "logos", "logo-viralizou-preta.png"),
        ];

    for (const candidate of candidatePaths) {
      try {
        const buffer = await fs.readFile(candidate);
        await fs.mkdir(publicDir, { recursive: true }).catch(() => {});
        await fs.writeFile(filePath, buffer).catch(() => {});
        await fs.writeFile(path.join(process.cwd(), "public", fileName), buffer).catch(() => {});
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {}
    }

    // Se nenhum arquivo PNG foi encontrado em disco, retorna SVG vetorial nítido (nunca quebra)
    const svg = generateFallbackSvg(isWhite);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
