import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Category, CategoryInput, Post, PostInput } from "@/lib/types";
import { slugify } from "@/lib/slug";

const localFile = path.join(process.cwd(), "data", "posts.json");
const localCategoriesFile = path.join(process.cwd(), "data", "categories.json");
function hasSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return false;

  const normalizedUrl = url.toLowerCase();
  const normalizedKey = key.toLowerCase();
  const placeholderUrl =
    normalizedUrl.includes("seu-projeto") ||
    normalizedUrl.includes("your-project") ||
    normalizedUrl.includes("example") ||
    normalizedUrl === "https://supabase.co";
  const placeholderKey =
    normalizedKey.includes("seu_service_role_key") ||
    normalizedKey.includes("your_service_role_key") ||
    normalizedKey.includes("troque") ||
    normalizedKey === "service_role_key";

  if (placeholderUrl || placeholderKey) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co") && key.length > 20;
  } catch {
    return false;
  }
}

function headers(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function sb(pathname: string, init?: RequestInit) {
  if (!hasSupabaseConfig()) throw new Error("Supabase não configurado.");
  const base = process.env.SUPABASE_URL!.trim().replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function readLocal(): Promise<Post[]> {
  const raw = await fs.readFile(localFile, "utf8");
  return JSON.parse(raw);
}

async function writeLocal(posts: Post[]) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Persistência local não funciona na Vercel. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  await fs.writeFile(localFile, JSON.stringify(posts, null, 2), "utf8");
}

async function publishDuePosts() {
  const now = new Date().toISOString();
  if (hasSupabaseConfig()) {
    await sb(`posts?status=eq.scheduled&published_at=lte.${encodeURIComponent(now)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "published", updated_at: now }),
    });
    return;
  }
  if (process.env.NODE_ENV === "production") return;
  const posts = await readLocal();
  let changed = false;
  for (const post of posts) {
    if (post.status === "scheduled" && post.published_at && new Date(post.published_at).getTime() <= Date.now()) {
      post.status = "published";
      post.updated_at = now;
      changed = true;
    }
  }
  if (changed) await writeLocal(posts);
}

export async function getPosts(opts: { includeDrafts?: boolean; category?: string; limit?: number } = {}) {
  await publishDuePosts();
  const { includeDrafts = false, category, limit } = opts;
  let posts: Post[];
  if (hasSupabaseConfig()) {
    const filters = ["select=*", "order=published_at.desc.nullslast,created_at.desc"];
    if (!includeDrafts) filters.push("status=eq.published");
    if (category) filters.push(`category=eq.${encodeURIComponent(category)}`);
    if (limit) filters.push(`limit=${limit}`);
    posts = await sb(`posts?${filters.join("&")}`);
  } else {
    posts = await readLocal();
    if (!includeDrafts) posts = posts.filter((p) => p.status === "published");
    if (category) posts = posts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    posts = posts.sort((a, b) => +new Date(b.published_at || b.created_at) - +new Date(a.published_at || a.created_at));
    if (limit) posts = posts.slice(0, limit);
  }
  return posts;
}

export async function getPostBySlug(slug: string, includeDrafts = false) {
  await publishDuePosts();
  if (hasSupabaseConfig()) {
    const status = includeDrafts ? "" : "&status=eq.published";
    const rows = await sb(`posts?select=*&slug=eq.${encodeURIComponent(slug)}${status}&limit=1`);
    return rows?.[0] as Post | undefined;
  }
  const posts = await readLocal();
  return posts.find((p) => p.slug === slug && (includeDrafts || p.status === "published"));
}

export async function getPostById(id: string) {
  await publishDuePosts();
  if (hasSupabaseConfig()) {
    const rows = await sb(`posts?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows?.[0] as Post | undefined;
  }
  return (await readLocal()).find((p) => p.id === id);
}

export async function createPost(input: PostInput) {
  const now = new Date().toISOString();
  const post: Post = { ...input, id: randomUUID(), created_at: now, updated_at: now };
  if (hasSupabaseConfig()) {
    const rows = await sb("posts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(post),
    });
    return rows[0] as Post;
  }
  const posts = await readLocal();
  posts.unshift(post);
  await writeLocal(posts);
  return post;
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  const patch = { ...input, updated_at: new Date().toISOString() };
  if (hasSupabaseConfig()) {
    const rows = await sb(`posts?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    return rows[0] as Post;
  }
  const posts = await readLocal();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Notícia não encontrada");
  posts[idx] = { ...posts[idx], ...patch } as Post;
  await writeLocal(posts);
  return posts[idx];
}

export async function deletePost(id: string) {
  if (hasSupabaseConfig()) {
    await sb(`posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const posts = (await readLocal()).filter((p) => p.id !== id);
  await writeLocal(posts);
}

export function storageMode() {
  return hasSupabaseConfig() ? "supabase" : process.env.NODE_ENV === "production" ? "readonly-demo" : "local-json";
}


async function readLocalCategories(): Promise<Category[]> {
  const raw = await fs.readFile(localCategoriesFile, "utf8");
  return JSON.parse(raw);
}

async function writeLocalCategories(categories: Category[]) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Persistência local não funciona na Vercel. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  await fs.writeFile(localCategoriesFile, JSON.stringify(categories, null, 2), "utf8");
}

export async function getCategories(opts: { includeInactive?: boolean } = {}) {
  const includeInactive = Boolean(opts.includeInactive);
  let categories: Category[];
  if (hasSupabaseConfig()) {
    const filters = ["select=*", "order=sort_order.asc,name.asc"];
    if (!includeInactive) filters.push("active=eq.true");
    categories = await sb(`categories?${filters.join("&")}`);
  } else {
    categories = await readLocalCategories();
    if (!includeInactive) categories = categories.filter((c) => c.active);
    categories = categories.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  return categories;
}

export async function getCategoryById(id: string) {
  if (hasSupabaseConfig()) {
    const rows = await sb(`categories?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows?.[0] as Category | undefined;
  }
  return (await readLocalCategories()).find((c) => c.id === id);
}

export async function createCategory(input: CategoryInput) {
  const now = new Date().toISOString();
  const category: Category = {
    ...input,
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    id: randomUUID(),
    created_at: now,
    updated_at: now,
  };
  if (hasSupabaseConfig()) {
    const rows = await sb("categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(category),
    });
    return rows[0] as Category;
  }
  const categories = await readLocalCategories();
  if (categories.some((c) => c.name.toLowerCase() === category.name.toLowerCase() || c.slug === category.slug)) {
    throw new Error("Já existe uma aba com esse nome ou endereço.");
  }
  categories.push(category);
  await writeLocalCategories(categories);
  return category;
}

async function renamePostsCategory(oldName: string, newName: string) {
  if (oldName === newName) return;
  const now = new Date().toISOString();
  if (hasSupabaseConfig()) {
    await sb(`posts?category=eq.${encodeURIComponent(oldName)}`, {
      method: "PATCH",
      body: JSON.stringify({ category: newName, updated_at: now }),
    });
    return;
  }
  const posts = await readLocal();
  let changed = false;
  for (const post of posts) {
    if (post.category === oldName) {
      post.category = newName;
      post.updated_at = now;
      changed = true;
    }
  }
  if (changed) await writeLocal(posts);
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const current = await getCategoryById(id);
  if (!current) throw new Error("Aba não encontrada.");
  const patch = {
    ...input,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.slug !== undefined || input.name !== undefined ? { slug: slugify(input.slug || input.name || current.name) } : {}),
    updated_at: new Date().toISOString(),
  };
  let updated: Category;
  if (hasSupabaseConfig()) {
    const rows = await sb(`categories?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    updated = rows[0] as Category;
  } else {
    const categories = await readLocalCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Aba não encontrada.");
    const nextName = String(patch.name ?? current.name);
    const nextSlug = String(patch.slug ?? current.slug);
    if (categories.some((c) => c.id !== id && (c.name.toLowerCase() === nextName.toLowerCase() || c.slug === nextSlug))) {
      throw new Error("Já existe outra aba com esse nome ou endereço.");
    }
    categories[idx] = { ...categories[idx], ...patch } as Category;
    updated = categories[idx];
    await writeLocalCategories(categories);
  }
  if (updated.name !== current.name) await renamePostsCategory(current.name, updated.name);
  return updated;
}

export async function deleteCategory(id: string) {
  const current = await getCategoryById(id);
  if (!current) throw new Error("Aba não encontrada.");
  const posts = await getPosts({ includeDrafts: true });
  const total = posts.filter((p) => p.category === current.name).length;
  if (total > 0) throw new Error(`Esta aba tem ${total} notícia(s). Renomeie ou mova as notícias antes de excluir; você também pode apenas desativar a aba.`);
  if (hasSupabaseConfig()) {
    await sb(`categories?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const categories = (await readLocalCategories()).filter((c) => c.id !== id);
  await writeLocalCategories(categories);
}
