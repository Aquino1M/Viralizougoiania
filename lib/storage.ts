import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AdminUser, Category, CategoryInput, Post, PostInput, PostStatus, SiteSettings } from "@/lib/types";
import { slugify } from "@/lib/slug";

const localFile = path.join(process.cwd(), "data", "posts.json");
const localCategoriesFile = path.join(process.cwd(), "data", "categories.json");
const localSettingsFile = path.join(process.cwd(), "data", "settings.json");
const localAdminsFile = path.join(process.cwd(), "data", "admins.json");

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export function hasSupabaseConfig() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
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
  const key = getSupabaseKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function sb(pathname: string, init?: RequestInit) {
  if (!hasSupabaseConfig()) throw new Error("Supabase não configurado.");
  const base = getSupabaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${res.status}: ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function readLocal(): Promise<Post[]> {
  const raw = await fs.readFile(localFile, "utf8");
  return JSON.parse(raw);
}

async function writeLocal(posts: Post[]) {
  if (process.env.NODE_ENV === "production" && !hasSupabaseConfig()) {
    throw new Error("Persistência local não funciona na Vercel. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  try {
    await fs.writeFile(localFile, JSON.stringify(posts, null, 2), "utf8");
  } catch {}
}

export async function publishDuePosts() {
  const now = new Date().toISOString();
  if (hasSupabaseConfig()) {
    try {
      await sb(`posts?status=eq.scheduled&published_at=lte.${encodeURIComponent(now)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "published", updated_at: now }),
      });
    } catch (err: any) {
      console.warn("Erro ao liberar agendamentos no Supabase:", err.message);
    }
  }
  try {
    const posts = await readLocal();
    let changed = false;
    for (const post of posts) {
      if (post.status === "scheduled" && post.published_at && new Date(post.published_at).getTime() <= Date.now()) {
        post.status = "published";
        post.updated_at = now;
        changed = true;
      }
    }
    if (changed) {
      try {
        await writeLocal(posts);
      } catch {}
    }
  } catch {}
}

export async function getPosts(opts: { includeDrafts?: boolean; category?: string; limit?: number } = {}) {
  await publishDuePosts();
  const { includeDrafts = false, category, limit } = opts;

  let postsList: Post[] = [];

  if (hasSupabaseConfig()) {
    try {
      const filters = ["select=*", "order=published_at.desc.nullslast,created_at.desc"];
      if (!includeDrafts) filters.push("status=eq.published");
      if (category) filters.push(`category=eq.${encodeURIComponent(category)}`);
      if (limit) filters.push(`limit=${limit}`);
      const posts: Post[] = await sb(`posts?${filters.join("&")}`);
      if (Array.isArray(posts) && posts.length > 0) {
        postsList = posts;
      }
    } catch (err: any) {
      console.warn("Aviso ao ler posts do Supabase (fallback local acionado):", err.message);
    }
  }

  if (postsList.length === 0) {
    postsList = await readLocal();
  }

  // Garantia absoluta: qualquer matéria agendada cujo horário já chegou passa a ser tratada como 'published'
  const nowMs = Date.now();
  postsList = postsList.map((p) => {
    if (p.status === "scheduled" && p.published_at && new Date(p.published_at).getTime() <= nowMs) {
      return { ...p, status: "published" as PostStatus };
    }
    return p;
  });

  let result = postsList;
  if (!includeDrafts) result = result.filter((p) => p.status === "published");
  if (category) result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  result = result.sort((a, b) => +new Date(b.published_at || b.created_at) - +new Date(a.published_at || a.created_at));
  if (limit) result = result.slice(0, limit);
  return result;
}

export async function getPostBySlug(slug: string, includeDrafts = false) {
  await publishDuePosts();
  if (hasSupabaseConfig()) {
    try {
      const status = includeDrafts ? "" : "&status=eq.published";
      const rows = await sb(`posts?select=*&slug=eq.${encodeURIComponent(slug)}${status}&limit=1`);
      if (rows?.[0]) return rows[0] as Post;
    } catch (err: any) {
      console.warn("Aviso ao buscar slug no Supabase:", err.message);
    }
  }
  const posts = await readLocal();
  return posts.find((p) => p.slug === slug && (includeDrafts || p.status === "published"));
}

export async function getPostById(id: string) {
  await publishDuePosts();
  if (hasSupabaseConfig()) {
    try {
      const rows = await sb(`posts?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      if (rows?.[0]) return rows[0] as Post;
    } catch (err: any) {
      console.warn("Aviso ao buscar post no Supabase:", err.message);
    }
  }
  return (await readLocal()).find((p) => p.id === id);
}

export async function createPost(input: PostInput) {
  const now = new Date().toISOString();
  let author = input.author || "Redação";
  if ((!input.author || input.author.toLowerCase() === "aquino") && (input.source_author || input.source_name)) {
    author = input.source_author
      ? (input.source_name ? `${input.source_author} | ${input.source_name}` : input.source_author)
      : (input.source_name || "Redação");
  }
  const post: Post = { ...input, author, id: randomUUID(), created_at: now, updated_at: now };
  if (hasSupabaseConfig()) {
    try {
      let rows: any;
      try {
        rows = await sb("posts", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(post),
        });
      } catch (err: any) {
        // Se a coluna video_url ainda não foi adicionada no Supabase pelo schema.sql, tenta sem ela
        if (err.message && err.message.includes("video_url")) {
          const { video_url: _, ...withoutVideo } = post;
          rows = await sb("posts", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(withoutVideo),
          });
        } else {
          throw err;
        }
      }
      if (rows?.[0]) {
        try {
          const posts = await readLocal();
          posts.unshift({ ...post, ...rows[0] });
          await writeLocal(posts);
        } catch {}
        return { ...post, ...rows[0] } as Post;
      }
    } catch (err: any) {
      console.warn("Erro ao salvar post no Supabase:", err.message);
      if (process.env.NODE_ENV === "production") throw err;
    }
  }
  const posts = await readLocal();
  posts.unshift(post);
  await writeLocal(posts);
  return post;
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  let patchInput = { ...input };
  if (
    patchInput.author &&
    patchInput.author.toLowerCase() === "aquino" &&
    (patchInput.source_author || patchInput.source_name)
  ) {
    patchInput.author = patchInput.source_author
      ? (patchInput.source_name ? `${patchInput.source_author} | ${patchInput.source_name}` : patchInput.source_author)
      : (patchInput.source_name || "Redação");
  }
  const patch = { ...patchInput, updated_at: new Date().toISOString() };
  if (hasSupabaseConfig()) {
    try {
      let rows: any;
      try {
        rows = await sb(`posts?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(patch),
        });
      } catch (err: any) {
        if (err.message && err.message.includes("video_url")) {
          const { video_url: _, ...withoutVideo } = patch;
          rows = await sb(`posts?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(withoutVideo),
          });
        } else {
          throw err;
        }
      }
      if (rows?.[0]) {
        try {
          const posts = await readLocal();
          const idx = posts.findIndex((p) => p.id === id);
          if (idx >= 0) {
            posts[idx] = { ...posts[idx], ...rows[0] };
          }
        } catch {}
        return rows[0] as Post;
      }
    } catch (err: any) {
      console.warn("Erro ao atualizar post no Supabase:", err.message);
      if (process.env.NODE_ENV === "production") throw err;
    }
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
    try {
      await sb(`posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err: any) {
      console.warn("Erro ao excluir post no Supabase:", err.message);
      if (process.env.NODE_ENV === "production") throw err;
    }
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
  if (process.env.NODE_ENV === "production" && !hasSupabaseConfig()) {
    throw new Error("Persistência local não funciona na Vercel. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  try {
    await fs.writeFile(localCategoriesFile, JSON.stringify(categories, null, 2), "utf8");
  } catch {}
}

export async function getCategories(opts: { includeInactive?: boolean } = {}) {
  const includeInactive = Boolean(opts.includeInactive);
  if (hasSupabaseConfig()) {
    try {
      const filters = ["select=*", "order=sort_order.asc,name.asc"];
      if (!includeInactive) filters.push("active=eq.true");
      const categories = await sb(`categories?${filters.join("&")}`);
      if (Array.isArray(categories) && categories.length > 0) return categories as Category[];
    } catch (err: any) {
      console.warn("Aviso ao buscar categorias no Supabase:", err.message);
    }
  }
  const categories = await readLocalCategories();
  let filtered = categories;
  if (!includeInactive) filtered = filtered.filter((c) => c.active);
  return filtered.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function getCategoryById(id: string) {
  if (hasSupabaseConfig()) {
    try {
      const rows = await sb(`categories?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      if (rows?.[0]) return rows[0] as Category;
    } catch (err: any) {}
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
    try {
      const rows = await sb("categories", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(category),
      });
      if (rows?.[0]) {
        try {
          const list = await readLocalCategories();
          list.push(rows[0]);
          await writeLocalCategories(list);
        } catch {}
        return rows[0] as Category;
      }
    } catch (err: any) {
      console.warn("Erro ao criar categoria no Supabase:", err.message);
      if (process.env.NODE_ENV === "production") throw err;
    }
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
    try {
      await sb(`posts?category=eq.${encodeURIComponent(oldName)}`, {
        method: "PATCH",
        body: JSON.stringify({ category: newName, updated_at: now }),
      });
    } catch {}
  }
  try {
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
  } catch {}
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
  let updated: Category = { ...current, ...patch };
  if (hasSupabaseConfig()) {
    try {
      const rows = await sb(`categories?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      if (rows?.[0]) updated = rows[0] as Category;
    } catch (err: any) {
      console.warn("Erro ao atualizar categoria no Supabase:", err.message);
    }
  }
  try {
    const categories = await readLocalCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      categories[idx] = updated;
      await writeLocalCategories(categories);
    }
  } catch {}
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
    try {
      await sb(`categories?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {}
  }
  const categories = (await readLocalCategories()).filter((c) => c.id !== id);
  await writeLocalCategories(categories);
}

const defaultSettings: SiteSettings = {
  site_name: "Viralizougoiania",
  tagline: "O que acontece em Goiânia, do seu bairro para a cidade inteira.",
  socials: {
    instagram: "https://instagram.com/viralizougoiania",
    whatsapp: "https://chat.whatsapp.com/exemplo-viralizougoiania",
    tiktok: "https://tiktok.com/@viralizougoiania",
    youtube: "",
    facebook: "",
    twitter: "",
  },
  updated_at: new Date().toISOString(),
};

export async function getSettings(): Promise<SiteSettings> {
  if (hasSupabaseConfig()) {
    try {
      const rows = await sb("settings?id=eq.default&limit=1");
      if (rows?.[0]?.data) return rows[0].data as SiteSettings;
    } catch (err: any) {
      console.warn("Aviso ao buscar configurações no Supabase:", err.message);
    }
  }
  try {
    const raw = await fs.readFile(localSettingsFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return defaultSettings;
  }
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSettings();
  const merged: SiteSettings = {
    ...current,
    ...settings,
    socials: {
      ...current.socials,
      ...(settings.socials || {}),
    },
    updated_at: new Date().toISOString(),
  };

  if (hasSupabaseConfig()) {
    try {
      await sb("settings", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: "default", data: merged, updated_at: merged.updated_at }),
      });
    } catch (err: any) {
      console.warn("Aviso ao atualizar configurações no Supabase:", err.message);
    }
  }

  try {
    await fs.writeFile(localSettingsFile, JSON.stringify(merged, null, 2), "utf8");
  } catch {}
  return merged;
}

// ==========================================
// AUTENTICAÇÃO E LOGINS VIA SUPABASE
// ==========================================

export async function verifyAdminCredentials(
  password: string,
  email?: string,
): Promise<{ ok: boolean; user?: AdminUser; error?: string }> {
  const cleanPass = (password || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanPass) {
    return { ok: false, error: "A senha é obrigatória." };
  }

  // 1. Tenta validar na tabela 'admins' do Supabase
  if (hasSupabaseConfig()) {
    try {
      let query = "admins?select=*&active=eq.true";
      if (cleanEmail) {
        query += `&email=eq.${encodeURIComponent(cleanEmail)}`;
      }
      query += "&limit=20";
      const rows: AdminUser[] = await sb(query);
      if (Array.isArray(rows) && rows.length > 0) {
        if (cleanEmail) {
          const match = rows.find(
            (u) => u.email.toLowerCase() === cleanEmail && (u as any).password === cleanPass,
          );
          if (match) {
            const { password: _, ...safeUser } = match as any;
            return { ok: true, user: safeUser as AdminUser };
          }
        } else {
          // Senha bate com algum dos administradores cadastrados no banco
          const match = rows.find((u) => (u as any).password === cleanPass);
          if (match) {
            const { password: _, ...safeUser } = match as any;
            return { ok: true, user: safeUser as AdminUser };
          }
        }
      }
    } catch (err: any) {
      console.warn("Supabase auth check:", err.message);
    }
  }

  // 2. Chave de acesso / senha mestre configurada no ambiente
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (cleanPass === expected) {
    return {
      ok: true,
      user: {
        id: "env-master-admin",
        email: cleanEmail || "admin@viralizougoiania.com.br",
        name: "Administrador Geral",
        role: "admin",
        active: true,
      },
    };
  }

  return { ok: false, error: "Senha ou usuário incorreto." };
}

export async function getAdmins(): Promise<AdminUser[]> {
  if (hasSupabaseConfig()) {
    try {
      const rows: AdminUser[] = await sb(
        "admins?select=id,email,name,role,active,created_at,updated_at&order=created_at.asc"
      );
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {}
  }
  return await readLocalAdmins();
}

async function readLocalAdmins(): Promise<AdminUser[]> {
  try {
    const raw = await fs.readFile(localAdminsFile, "utf8");
    return JSON.parse(raw);
  } catch {
    const defaults: AdminUser[] = [
      {
        id: "admin-default-1",
        email: "admin@viralizougoiania.com.br",
        name: "Administrador Geral",
        password: "admin123",
        role: "admin",
        active: true,
      },
      {
        id: "admin-default-2",
        email: "redacao@viralizougoiania.com.br",
        name: "Redação Viralizougoiania",
        password: "admin123",
        role: "editor",
        active: true,
      },
      {
        id: "admin-default-3",
        email: "aquino@viralizougoiania.com.br",
        name: "Aquino",
        password: "admin123",
        role: "admin",
        active: true,
      },
    ];
    try {
      await fs.writeFile(localAdminsFile, JSON.stringify(defaults, null, 2), "utf8");
    } catch {}
    return defaults;
  }
}

async function writeLocalAdmins(list: AdminUser[]) {
  try {
    await fs.writeFile(localAdminsFile, JSON.stringify(list, null, 2), "utf8");
  } catch {}
}

export async function createAdmin(input: {
  email: string;
  name: string;
  password: string;
  role?: "admin" | "editor";
  active?: boolean;
}): Promise<AdminUser> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim();
  const cleanPass = input.password.trim();
  const role = input.role || "editor";
  const active = input.active !== false;

  if (!cleanEmail || !cleanPass) throw new Error("E-mail e senha são obrigatórios.");

  const now = new Date().toISOString();
  const newAdmin: AdminUser = {
    id: randomUUID(),
    email: cleanEmail,
    name: cleanName || "Membro da Equipe",
    password: cleanPass,
    role,
    active,
    created_at: now,
    updated_at: now,
  };

  if (hasSupabaseConfig()) {
    try {
      const rows = await sb("admins", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(newAdmin),
      });
      if (rows?.[0]) {
        const { password: _, ...safe } = rows[0];
        return safe as AdminUser;
      }
    } catch (err: any) {
      console.warn("Erro ao criar funcionário no Supabase:", err.message);
      if (err.message && err.message.includes("unique")) {
        throw new Error("Já existe um funcionário com esse e-mail.");
      }
      throw err;
    }
  }

  const list = await readLocalAdmins();
  if (list.some((a) => a.email.toLowerCase() === cleanEmail)) {
    throw new Error("Já existe um funcionário com esse e-mail.");
  }
  list.push(newAdmin);
  await writeLocalAdmins(list);
  const { password: _, ...safe } = newAdmin;
  return safe;
}

export async function updateAdmin(
  id: string,
  patch: { email?: string; name?: string; password?: string; role?: "admin" | "editor"; active?: boolean }
): Promise<AdminUser> {
  const body: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.email !== undefined) body.email = patch.email.trim().toLowerCase();
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.password !== undefined && patch.password.trim()) body.password = patch.password.trim();
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.active !== undefined) body.active = patch.active;

  if (hasSupabaseConfig()) {
    try {
      const rows = await sb(`admins?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      if (rows?.[0]) {
        const { password: _, ...safe } = rows[0];
        return safe as AdminUser;
      }
    } catch (err: any) {
      console.warn("Erro ao atualizar funcionário no Supabase:", err.message);
      throw err;
    }
  }

  const list = await readLocalAdmins();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Funcionário não encontrado.");
  list[idx] = { ...list[idx], ...body };
  await writeLocalAdmins(list);
  const { password: _, ...safe } = list[idx];
  return safe;
}

export async function deleteAdmin(id: string): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      await sb(`admins?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      return;
    } catch (err: any) {
      console.warn("Erro ao excluir funcionário no Supabase:", err.message);
      throw err;
    }
  }
  const list = await readLocalAdmins();
  const filtered = list.filter((a) => a.id !== id);
  await writeLocalAdmins(filtered);
}
