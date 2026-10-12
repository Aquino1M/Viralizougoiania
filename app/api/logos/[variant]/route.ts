import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Tenta obter da pasta de upload do usuário e persistir em public/logos e public/
    const userUploadedDir = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.user_uploaded";
    const tempMediaDir = "C:\\Users\\Aquino\\.gemini\\antigravity-ide\\brain\\d93440ff-fe58-40ed-94a4-6ff085a0a199\\.tempmediaStorage";

    const candidatePaths = isWhite
      ? [
          path.join(userUploadedDir, "media_1791812215943.png"),
          path.join(tempMediaDir, "media_1791812661864.png"),
          path.join(process.cwd(), "public", "logo-viralizou-branca.png"),
        ]
      : [
          path.join(userUploadedDir, "media_1791812270897.png"),
          path.join(tempMediaDir, "media_1791812668250.png"),
          path.join(process.cwd(), "public", "logo-viralizou-preta.png"),
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

    return Response.json({ error: "Logo não encontrada" }, { status: 404 });
  }
}
