import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getPostBySlug } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validRemoteImage(raw: string) {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "Slug obrigatório." }, { status: 400 });

  const post = await getPostBySlug(slug, true);
  if (!post?.image_url) return NextResponse.json({ error: "Notícia sem imagem." }, { status: 404 });

  const imageUrl = validRemoteImage(post.image_url);
  if (!imageUrl) return NextResponse.json({ error: "URL de imagem inválida." }, { status: 400 });

  try {
    const response = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 Viralizougoiania Feed Creator",
        Referer: imageUrl.origin + "/",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Não foi possível carregar a imagem da notícia." }, { status: 502 });
    }

    const length = Number(response.headers.get("content-length") || 0);
    if (length > 15_000_000) {
      return NextResponse.json({ error: "Imagem muito grande para gerar a arte." }, { status: 413 });
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar a imagem da notícia." }, { status: 502 });
  }
}
