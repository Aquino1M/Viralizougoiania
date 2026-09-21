
import { NextResponse } from "next/server";
import { deletePost, getPostById, updatePost } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { PostStatus, ReviewStatus } from "@/lib/types";

function normalizePublishing(status: unknown, publishedAt: unknown, currentPublishedAt: string | null) {
  let nextStatus: PostStatus = status === "draft" ? "draft" : status === "scheduled" ? "scheduled" : "published";
  if (nextStatus === "draft") return { status: nextStatus, published_at: null };
  const iso = publishedAt ? new Date(String(publishedAt)).toISOString() : currentPublishedAt || new Date().toISOString();
  if (nextStatus === "scheduled" && new Date(iso).getTime() <= Date.now()) nextStatus = "published";
  return { status: nextStatus, published_at: iso };
}

function optionalIso(value: unknown) {
  if (!value) return null;
  const d=new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const post = await getPostById(id);
  return post ? NextResponse.json(post) : NextResponse.json({ error: "Não encontrada" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const b = await req.json();
    const current = await getPostById(id);
    if (!current) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    if (b.status === "scheduled" && !b.published_at) {
      return NextResponse.json({ error: "Escolha a data e a hora do agendamento." }, { status: 400 });
    }

    const publishing = normalizePublishing(b.status, b.published_at, current.published_at);
    const sourceContent = String(b.source_content ?? current.source_content ?? "");
    const reviewStatus: ReviewStatus = b.review_status === "reviewed" ? "reviewed" : sourceContent ? "unreviewed" : "not_required";

    if (sourceContent && publishing.status !== "draft" && reviewStatus !== "reviewed") {
      return NextResponse.json({ error: "Matérias importadas precisam ser revisadas pelo jornalista antes de publicar ou agendar." }, { status: 400 });
    }

    const post = await updatePost(id, {
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
      source_content: sourceContent,
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

    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao excluir" }, { status: 500 });
  }
}
