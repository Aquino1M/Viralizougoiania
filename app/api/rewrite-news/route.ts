
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { rewriteNews } from "@/lib/news-rewriter";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const sourceContent = String(body.source_content || "").trim();

    if (!sourceContent) {
      return NextResponse.json({ error: "Importe primeiro o corpo completo da notícia." }, { status: 400 });
    }

    const result = await rewriteNews({
      source_name: String(body.source_name || "Fonte externa"),
      source_url: String(body.source_url || ""),
      source_author: String(body.source_author || ""),
      source_published_at: body.source_published_at ? String(body.source_published_at) : null,
      source_content: sourceContent,
      source_title: String(body.source_title || ""),
      source_excerpt: String(body.source_excerpt || ""),
      article_section: String(body.article_section || ""),
      categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
      source_complete: body.source_complete !== false,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao reescrever a notícia." },
      { status: 500 },
    );
  }
}
