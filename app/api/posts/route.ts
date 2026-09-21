
import { NextResponse } from "next/server";
import { createPost, getPosts, storageMode } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { PostStatus, ReviewStatus } from "@/lib/types";

function normalizePublishing(status: unknown, publishedAt: unknown) {
  let nextStatus: PostStatus = status === "draft" ? "draft" : status === "scheduled" ? "scheduled" : "published";
  if (nextStatus === "draft") return { status: nextStatus, published_at: null };
  const iso = publishedAt ? new Date(String(publishedAt)).toISOString() : new Date().toISOString();
  if (nextStatus === "scheduled" && new Date(iso).getTime() <= Date.now()) nextStatus = "published";
  return { status: nextStatus, published_at: iso };
}

function optionalIso(value: unknown) {
  if (!value) return null;
  const d=new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const posts = await getPosts({ includeDrafts: true });
  return NextResponse.json({ posts, mode: storageMode() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const b = await req.json();
    const publishing = normalizePublishing(b.status, b.published_at);
    const reviewStatus: ReviewStatus = b.review_status === "reviewed" ? "reviewed" : b.source_content ? "unreviewed" : "not_required";

    if (b.status === "scheduled" && !b.published_at) {
      return NextResponse.json({ error: "Escolha a data e a hora do agendamento." }, { status: 400 });
    }
    if (b.source_content && publishing.status !== "draft" && reviewStatus !== "reviewed") {
      return NextResponse.json({ error: "Matérias importadas precisam ser revisadas pelo jornalista antes de publicar ou agendar." }, { status: 400 });
    }

    const post = await createPost({
      slug: slugify(b.slug || b.title),
      title: String(b.title || ""),
      excerpt: String(b.excerpt || ""),
      content: String(b.content || ""),
      category: String(b.category || "Goiânia"),
      city: String(b.city || "Goiânia"),
      author: String(b.author || "Redação Viralizougoiania"),
      image_url: String(b.image_url || ""),
      featured: Boolean(b.featured),
      status: publishing.status,
      published_at: publishing.published_at,
      source_name: String(b.source_name || ""),
      source_url: String(b.source_url || ""),
      source_title: String(b.source_title || ""),
      source_excerpt: String(b.source_excerpt || ""),
      source_author: String(b.source_author || ""),
      source_published_at: optionalIso(b.source_published_at),
      source_content: String(b.source_content || ""),
      source_word_count: Number(b.source_word_count || 0),
      source_capture_method: String(b.source_capture_method || ""),
      source_complete: b.source_complete !== false,
      article_section: String(b.article_section || ""),
      image_credit: String(b.image_credit || ""),
      seo_title: String(b.seo_title || ""),
      seo_description: String(b.seo_description || ""),
      seo_keywords: String(b.seo_keywords || ""),
      review_status: reviewStatus,
      rewrite_similarity: b.rewrite_similarity === null || b.rewrite_similarity === undefined ? null : Number(b.rewrite_similarity),
    });

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao publicar" }, { status: 500 });
  }
}
