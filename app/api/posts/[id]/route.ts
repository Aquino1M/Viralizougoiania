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
    if (b.status === "scheduled" && !b.published_at && !current.published_at) {
      return NextResponse.json({ error: "Escolha a data e a hora do agendamento." }, { status: 400 });
    }
    const nextStatus = b.status !== undefined ? b.status : current.status;
    const nextPublishedAt = b.published_at !== undefined ? b.published_at : current.published_at;
    const publishing = normalizePublishing(nextStatus, nextPublishedAt, current.published_at);

    const post = await updatePost(id, {
      slug: b.slug !== undefined ? slugify(b.slug) : b.title !== undefined ? slugify(b.title) : current.slug,
      title: b.title !== undefined ? b.title : current.title,
      excerpt: b.excerpt !== undefined ? b.excerpt : current.excerpt,
      content: b.content !== undefined ? b.content : current.content,
      category: b.category !== undefined ? b.category : current.category,
      city: b.city !== undefined ? b.city : current.city,
      author: b.author !== undefined ? b.author : current.author,
      image_url: b.image_url !== undefined ? b.image_url : current.image_url,
      image_credit: b.image_credit !== undefined ? b.image_credit : current.image_credit,
      video_url: b.video_url !== undefined ? b.video_url : current.video_url,
      featured: b.featured !== undefined ? Boolean(b.featured) : current.featured,
      status: publishing.status,
      published_at: publishing.published_at,
      source_name: b.source_name !== undefined ? b.source_name : current.source_name,
      source_url: b.source_url !== undefined ? b.source_url : current.source_url,
      source_author: b.source_author !== undefined ? b.source_author : current.source_author,
      source_content: b.source_content !== undefined ? b.source_content : current.source_content,
      seo_title: b.seo_title !== undefined ? b.seo_title : current.seo_title,
      seo_description: b.seo_description !== undefined ? b.seo_description : current.seo_description,
      seo_keywords: b.seo_keywords !== undefined ? b.seo_keywords : current.seo_keywords,
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
