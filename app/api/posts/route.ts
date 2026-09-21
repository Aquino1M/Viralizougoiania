import { NextResponse } from "next/server";
import { createPost, getPosts, storageMode } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { PostStatus } from "@/lib/types";

function normalizePublishing(status: unknown, publishedAt: unknown) {
  let nextStatus: PostStatus = status === "draft" ? "draft" : status === "scheduled" ? "scheduled" : "published";
  if (nextStatus === "draft") return { status: nextStatus, published_at: null };
  const iso = publishedAt ? new Date(String(publishedAt)).toISOString() : new Date().toISOString();
  if (nextStatus === "scheduled" && new Date(iso).getTime() <= Date.now()) nextStatus = "published";
  return { status: nextStatus, published_at: iso };
}

export async function GET() {
  const admin = await isAdmin();
  const posts = await getPosts({ includeDrafts: admin });
  return NextResponse.json({ posts, mode: storageMode() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const b = await req.json();
    const publishing = normalizePublishing(b.status, b.published_at);
    if (b.status === "scheduled" && !b.published_at) {
      return NextResponse.json({ error: "Escolha a data e a hora do agendamento." }, { status: 400 });
    }
    const post = await createPost({
      slug: slugify(b.slug || b.title),
      title: b.title,
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      city: b.city || "Goiânia",
      author: b.author || "Redação Viralizougoiania",
      image_url: b.image_url || "",
      featured: Boolean(b.featured),
      status: publishing.status,
      published_at: publishing.published_at,
      source_name: b.source_name || "",
      source_url: b.source_url || "",
    });
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao publicar" }, { status: 500 });
  }
}
