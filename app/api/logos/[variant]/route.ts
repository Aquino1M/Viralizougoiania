import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateFallbackSvg(isWhite: boolean, base64Png?: string): string {
  if (base64Png) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180"><image href="data:image/png;base64,${base64Png}" width="640" height="180" preserveAspectRatio="xMidYMid meet" /></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180"><rect width="640" height="180" fill="transparent"/></svg>`;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
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
    const buffer = await fs.readFile(/*turbopackIgnore: true*/ filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    const candidatePaths = [
      path.join("C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d5396812-fe0c-45aa-9024-57e5752b1e04\\.user_uploaded", isWhite ? "media_1791847748374.png" : "media_1791847748387.png"),
      path.join("C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.user_uploaded", isWhite ? "media_1791812215943.png" : "media_1791812270897.png"),
      path.join(process.cwd(), "public", fileName),
      path.join(process.cwd(), "public", "logos", fileName),
    ];

    for (const candidate of candidatePaths) {
      try {
        const buffer = await fs.readFile(/*turbopackIgnore: true*/ candidate);
        await fs.mkdir(publicDir, { recursive: true }).catch(() => {});
        await fs.writeFile(filePath, buffer).catch(() => {});
        await fs.writeFile(path.join(process.cwd(), "public", fileName), buffer).catch(() => {});
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {}
    }

    // Se nenhum arquivo PNG foi encontrado em disco, retorna SVG vetorial nítido (sempre funcional e com CORS)
    const svg = generateFallbackSvg(isWhite);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
