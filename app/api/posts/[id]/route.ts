import { NextResponse } from "next/server";
import { deletePost, getPostById, updatePost } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { PostStatus } from "@/lib/types";

function normalizePublishing(status: unknown, publishedAt: unknown, currentPublishedAt: string | null) {
  let nextStatus: PostStatus = status === "draft" ? "draft" : status === "scheduled" ? "scheduled" : "published";
  if (nextStatus === "draft") return { status: nextStatus, published_at: null };
  const iso = publishedAt ? new Date(String(publishedAt)).toISOString() : currentPublishedAt || new Date().toISOString();
  if (nextStatus === "scheduled" && new Date(iso).getTime() <= Date.now()) nextStatus = "published";
  return { status: nextStatus, published_at: iso };
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
    const post = await updatePost(id, {
      slug: slugify(b.slug || b.title),
      title: b.title,
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      city: b.city,
      author: b.author,
      image_url: b.image_url,
      image_credit: b.image_credit,
      video_url: b.video_url,
      featured: Boolean(b.featured),
      status: publishing.status,
      published_at: publishing.published_at,
      source_name: b.source_name || "",
      source_url: b.source_url || "",
      source_author: b.source_author || "",
      source_content: b.source_content || "",
      seo_title: b.seo_title || "",
      seo_description: b.seo_description || "",
      seo_keywords: b.seo_keywords || "",
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
