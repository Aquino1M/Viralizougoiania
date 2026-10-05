import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getPostBySlug } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();

  if (!slug) {
    return NextResponse.json({ error: "Informe o link ou slug da notícia." }, { status: 400 });
  }

  try {
    const post = await getPostBySlug(slug, true);
    if (!post) {
      return NextResponse.json(
        { error: "Notícia não encontrada no banco do Viralizougoiania." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      post: {
        slug: post.slug,
        title: post.title,
        image_url: post.image_url || "",
        category: post.category || "Goiânia",
        city: post.city || "Goiânia",
        created_at: post.created_at,
        updated_at: post.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao localizar a notícia." },
      { status: 500 },
    );
  }
}
