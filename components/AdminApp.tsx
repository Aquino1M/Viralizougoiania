"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser, Category, ImportedNews, Post, PostStatus, SocialLinks } from "@/lib/types";
import { slugify } from "@/lib/slug";
import { formatViralizouArticle } from "@/lib/rewrite";

type View = "list" | "form" | "import" | "categories" | "socials" | "queue" | "admins";
type FormState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  source_content: string;
  category: string;
  city: string;
  author: string;
  image_url: string;
  image_credit: string;
  featured: boolean;
  status: PostStatus;
  published_at: string;
  source_name: string;
  source_url: string;
  source_author: string;
  video_url: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  is_reviewed: boolean;
};

type CategoryDraft = { name: string; slug: string };

const blank: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  source_content: "",
  category: "Goiânia",
  city: "Goiânia",
  author: "Aquino",
  image_url: "",
  image_credit: "",
  featured: false,
  status: "published",
  published_at: "",
  source_name: "",
  source_url: "",
  source_author: "",
  video_url: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  is_reviewed: true,
};

type RadarSource = {
  name: string;
  url: string;
  label: string;
  region: "goias" | "brasil";
  tag: string;
};

const RADAR_SOURCES: RadarSource[] = [
  // GOIÁS & GOIÂNIA
  { name: "G1 Goiás", url: "https://g1.globo.com/rss/g1/go/goias/", label: "G1 Goiás", region: "goias", tag: "Tempo Real" },
  { name: "A Redação", url: "https://aredacao.com.br/feed/", label: "A Redação Goiânia", region: "goias", tag: "Capital" },
  { name: "Diário de Goiás", url: "https://diariodegoias.com.br/feed/", label: "Diário de Goiás", region: "goias", tag: "Notícias & Política" },
  { name: "Curta Mais", url: "https://curtamais.com.br/goiania/feed/", label: "Curta Mais Goiânia", region: "goias", tag: "Eventos & Gastronomia" },
  { name: "Dia Online", url: "https://diaonline.ig.com.br/feed/", label: "Dia Online", region: "goias", tag: "Goiás" },
  { name: "Portal 6", url: "https://portal6.com.br/feed/", label: "Portal 6 Goiás", region: "goias", tag: "Interior" },
  { name: "Goiás 24 Horas", url: "https://goias24horas.com.br/feed/", label: "Goiás 24 Horas", region: "goias", tag: "Notícias" },

  // GRANDES JORNAIS DO BRASIL
  { name: "G1 Brasil", url: "https://g1.globo.com/rss/g1/", label: "G1 Brasil", region: "brasil", tag: "Nacional" },
  { name: "CNN Brasil", url: "https://www.cnnbrasil.com.br/feed/", label: "CNN Brasil", region: "brasil", tag: "Ao Vivo" },
  { name: "Metrópoles", url: "https://www.metropoles.com/feed", label: "Metrópoles", region: "brasil", tag: "Brasil" },
  { name: "Folha de S.Paulo", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", label: "Folha de S.Paulo", region: "brasil", tag: "Em Cima da Hora" },
  { name: "UOL Notícias", url: "https://rss.uol.com.br/feed/noticias.xml", label: "UOL Notícias", region: "brasil", tag: "Geral" },
  { name: "G1 Política", url: "https://g1.globo.com/rss/g1/politica/", label: "G1 Política", region: "brasil", tag: "Brasília" },
  { name: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/", label: "G1 Economia", region: "brasil", tag: "Mercado" },
  { name: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", label: "Agência Brasil", region: "brasil", tag: "Oficial" },
];

function formatRadarDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    const timeFormatted = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const isToday = new Date().toDateString() === d.toDateString();

    if (diffMin >= 0 && diffMin < 60) {
      return `Hoje às ${timeFormatted} (há ${diffMin} min)`;
    }
    if (isToday) {
      return `Hoje às ${timeFormatted}`;
    }
    const dateFormatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${dateFormatted} às ${timeFormatted}`;
  } catch {
    return "";
  }
}

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusLabel(status: PostStatus) {
  if (status === "draft") return "Rascunho";
  if (status === "scheduled") return "Agendada";
  return "Publicada";
}

export default function AdminApp() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [socials, setSocials] = useState<SocialLinks>({
    instagram: "",
    whatsapp: "",
    tiktok: "",
    youtube: "",
    facebook: "",
    twitter: "",
  });
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [mode, setMode] = useState("");
  const [view, setView] = useState<View>("list");
  const [form, setForm] = useState<FormState>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importItems, setImportItems] = useState<ImportedNews[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [radarRegion, setRadarRegion] = useState<"goias" | "brasil">("goias");
  const [activeSourceUrl, setActiveSourceUrl] = useState<string>("https://g1.globo.com/rss/g1/go/goias/");
  const [queueInterval, setQueueInterval] = useState<number>(10);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "editor" as "admin" | "editor",
  });
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string; newPassword: string } | null>(null);
  const [passwordModalSaving, setPasswordModalSaving] = useState(false);
  const router = useRouter();

  // Matérias agendadas na fila, ordenadas por horário de publicação
  const queuedPosts = useMemo(
    () =>
      posts
        .filter((p) => p.status === "scheduled")
        .sort((a, b) => +new Date(a.published_at || 0) - +new Date(b.published_at || 0)),
    [posts],
  );

  // Calcula o próximo horário livre na fila
  function getNextQueueTime(intervalMin = queueInterval): string {
    const future = queuedPosts.filter((p) => p.published_at && new Date(p.published_at).getTime() > Date.now());
    let baseTime = Date.now();
    if (future.length > 0) {
      const last = future[future.length - 1];
      baseTime = Math.max(Date.now(), new Date(last.published_at!).getTime());
    }
    const next = new Date(baseTime + intervalMin * 60 * 1000);
    return next.toISOString();
  }

  // Verifica periodicamente se chegou a hora de liberar matérias da fila
  useEffect(() => {
    const intervalTimer = setInterval(() => {
      fetch("/api/posts/publish-due")
        .then(() => load())
        .catch(() => {});
    }, 30000);
    return () => clearInterval(intervalTimer);
  }, []);

  function syncCategoryDrafts(nextCategories: Category[]) {
    setCategoryDrafts(Object.fromEntries(nextCategories.map((c) => [c.id, { name: c.name, slug: c.slug }])));
  }

  async function loadAdmins() {
    try {
      const res = await fetch("/api/admins", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch {
      // ignore
    }
  }

  async function load() {
    setLoading(true);
    const [postsResponse, categoriesResponse, settingsResponse, adminsResponse] = await Promise.all([
      fetch("/api/posts", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/admins", { cache: "no-store" }).catch(() => null),
    ]);
    if (postsResponse.status === 401 || categoriesResponse.status === 401) {
      router.push("/admin/login");
      return;
    }
    const [postsData, categoriesData, settingsData] = await Promise.all([
      postsResponse.json(),
      categoriesResponse.json(),
      settingsResponse.ok ? settingsResponse.json() : { settings: {} },
    ]);
    if (adminsResponse && adminsResponse.ok) {
      try {
        const adminsData = await adminsResponse.json();
        setAdmins(adminsData.admins || []);
      } catch {}
    }
    setPosts(postsData.posts || []);
    const nextCategories = (categoriesData.categories || []) as Category[];
    setCategories(nextCategories);
    syncCategoryDrafts(nextCategories);
    if (settingsData.settings?.socials) {
      setSocials(settingsData.settings.socials);
    }
    setMode(postsData.mode || categoriesData.mode || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => posts.filter((p) => (p.title + p.category + p.city).toLowerCase().includes(search.toLowerCase())),
    [posts, search],
  );

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categories],
  );

  function edit(p: Post) {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      source_content: p.source_content || p.content,
      category: p.category,
      city: p.city,
      author: p.author || "Aquino",
      image_url: p.image_url,
      image_credit: p.image_credit || "",
      featured: p.featured,
      status: p.status,
      published_at: localDateTime(p.published_at),
      source_name: p.source_name || "",
      source_url: p.source_url || "",
      source_author: p.source_author || "",
      video_url: p.video_url || "",
      seo_title: p.seo_title || p.title,
      seo_description: p.seo_description || p.excerpt,
      seo_keywords: p.seo_keywords || "",
      is_reviewed: true,
    });
    setView("form");
    setMessage("");
  }

  function create() {
    const firstActive = orderedCategories.find((c) => c.active)?.name || "Goiânia";
    setForm({ ...blank, category: firstActive });
    setView("form");
    setMessage("");
  }

  function reformatContent() {
    const raw = form.source_content || form.content;
    const formatted = formatViralizouArticle({
      title: form.title,
      excerpt: form.excerpt,
      sourceText: raw,
      sourceName: form.source_name,
    });
    setForm((curr) => ({ ...curr, content: formatted }));
    setMessage("Matéria reescrita e formatada com sucesso no padrão do portal!");
  }

  async function queueFromRadar(item: ImportedNews) {
    setImporting(true);
    setImportMessage(`Adicionando "${item.title.slice(0, 45)}..." à fila de postagem...`);
    try {
      let activeItem = item;
      if (
        item.source_url &&
        (!item.source_content || item.source_content.split("\n\n").length < 2 || item.source_content.length < 300)
      ) {
        try {
          const r = await fetch("/api/import-news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: item.source_url, mode: "article" }),
          });
          if (r.ok) {
            const d = await r.json();
            if (d.items?.[0]) activeItem = { ...item, ...d.items[0] };
          }
        } catch {}
      }

      let targetCategory = "Goiânia";
      if (activeItem.category) {
        const match = categories.find((c) => c.name.toLowerCase() === activeItem.category!.toLowerCase());
        targetCategory = match ? match.name : activeItem.category;
      } else {
        targetCategory = orderedCategories.find((c) => c.active)?.name || "Goiânia";
      }

      const rawSource = activeItem.source_content || activeItem.content || activeItem.excerpt || activeItem.title;
      const formatted = formatViralizouArticle({
        title: activeItem.title,
        excerpt: activeItem.excerpt,
        sourceText: rawSource,
        sourceName: activeItem.source_name,
      });

      const nextSlot = getNextQueueTime();

      const payload = {
        title: activeItem.title,
        slug: slugify(activeItem.title),
        excerpt: activeItem.excerpt || activeItem.title,
        content: formatted,
        source_content: rawSource,
        category: targetCategory,
        city: "Goiânia",
        author: "Aquino",
        image_url: activeItem.image_url || "",
        image_credit: activeItem.image_credit || (activeItem.source_author ? `Reportagem: ${activeItem.source_author}` : `Foto: Reprodução / ${activeItem.source_name || "Divulgação"}`),
        video_url: activeItem.video_url || "",
        featured: false,
        status: "scheduled" as PostStatus,
        published_at: nextSlot,
        source_name: activeItem.source_name,
        source_url: activeItem.source_url,
        source_author: activeItem.source_author || "",
        seo_title: activeItem.title,
        seo_description: activeItem.excerpt || activeItem.title,
        seo_keywords: `Goiânia, ${targetCategory}`,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao agendar notícia na fila.");
      }

      await load();
      const d = new Date(nextSlot);
      const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setImportMessage(`✅ Notícia agendada na Fila! Será liberada automaticamente às ${timeStr}.`);
    } catch (err: any) {
      setImportMessage(`Erro ao agendar na fila: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function reorderQueue(intervalMin = queueInterval) {
    if (queuedPosts.length === 0) return;
    setLoading(true);
    let startTime = Date.now();
    for (let i = 0; i < queuedPosts.length; i++) {
      const p = queuedPosts[i];
      const newTime = new Date(startTime + (i + 1) * intervalMin * 60 * 1000).toISOString();
      await fetch(`/api/posts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published_at: newTime }),
      });
    }
    await load();
    setMessage(`Fila reorganizada com sucesso! ${queuedPosts.length} matérias distribuídas a cada ${intervalMin} minutos.`);
  }

  async function publishNow(p: Post) {
    setLoading(true);
    const now = new Date().toISOString();
    try {
      const res = await fetch(`/api/posts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", published_at: now }),
      });
      if (res.ok) {
        setMessage(`Matéria "${p.title.slice(0, 35)}..." publicada agora mesmo no portal!`);
      } else {
        const err = await res.json();
        setMessage(`Erro ao publicar: ${err.error || "Não foi possível liberar a matéria."}`);
      }
    } catch (e: any) {
      setMessage(`Erro: ${e.message}`);
    }
    await load();
  }

  async function adjustQueueTime(p: Post, minutesOffset: number) {
    setLoading(true);
    const base = p.published_at ? new Date(p.published_at).getTime() : Date.now();
    const newTime = new Date(base + minutesOffset * 60 * 1000).toISOString();
    await fetch(`/api/posts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published_at: newTime }),
    });
    await load();
  }

    async function useImported(item: ImportedNews) {
    let activeItem = item;
    // Se o item veio de feed RSS e tem URL original, busca a matéria completa com todos os parágrafos
    if (
      item.source_url &&
      (!item.source_content || item.source_content.split("\n\n").length < 2 || item.source_content.length < 300)
    ) {
      setImporting(true);
      setImportMessage("Carregando matéria completa da fonte original...");
      try {
        const r = await fetch("/api/import-news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.source_url, mode: "article" }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.items?.[0]) {
            activeItem = { ...item, ...d.items[0] };
          }
        }
      } catch (err) {
        console.warn("Aviso ao buscar matéria completa:", err);
      } finally {
        setImporting(false);
      }
    }

    let targetCategory = "Goiânia";
    if (activeItem.category) {
      const match = categories.find((c) => c.name.toLowerCase() === activeItem.category!.toLowerCase());
      targetCategory = match ? match.name : activeItem.category;
    } else {
      targetCategory = orderedCategories.find((c) => c.active)?.name || "Goiânia";
    }

    const rawSource = activeItem.source_content || activeItem.content || activeItem.excerpt || activeItem.title;
    const formatted = formatViralizouArticle({
      title: activeItem.title,
      excerpt: activeItem.excerpt,
      sourceText: rawSource,
      sourceName: activeItem.source_name,
    });

    setForm({
      ...blank,
      category: targetCategory,
      title: activeItem.title,
      slug: slugify(activeItem.title),
      excerpt: activeItem.excerpt || activeItem.title,
      image_url: activeItem.image_url,
      image_credit: activeItem.image_credit || (activeItem.source_author ? `Reportagem: ${activeItem.source_author} • Fonte: ${activeItem.source_name}` : `Foto: Reprodução / ${activeItem.source_name || "Divulgação"}`),
      video_url: activeItem.video_url || "",
      status: "published",
      published_at: localDateTime(activeItem.published_at || new Date().toISOString()),
      source_name: activeItem.source_name,
      source_url: activeItem.source_url,
      source_author: activeItem.source_author || "",
      source_content: rawSource,
      content: formatted,
      seo_title: activeItem.title,
      seo_description: activeItem.excerpt,
      seo_keywords: `${targetCategory}, Goiânia, Notícias de Goiânia, ${activeItem.source_name}`,
      is_reviewed: true,
    });
    setView("form");
    setMessage(`Matéria completa pronta no tema "${targetCategory}"! Pronta para postar.`);
  }


  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
    };
    const r = await fetch(form.id ? `/api/posts/${form.id}` : "/api/posts", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) {
      setMessage(d.error || "Erro ao salvar");
      return;
    }
    setMessage(form.status === "scheduled" ? "Notícia agendada com sucesso." : "Notícia publicada com sucesso.");
    await load();
    setView("list");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta notícia?")) return;
    const r = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) {
      alert(d.error || "Erro ao excluir");
      return;
    }
    await load();
    router.refresh();
  }

  function openRadar() {
    setView("import");
    setImportMessage("");
    if (importItems.length === 0) {
      importNews("feed", activeSourceUrl || "https://g1.globo.com/rss/g1/go/goias/");
    }
  }

  async function importNews(importMode: "article" | "feed", overrideUrl?: string) {
    const targetUrl = (overrideUrl || importUrl).trim();
    if (!targetUrl) {
      setImportMessage("Cole o link da matéria, do site ou do feed RSS.");
      return;
    }
    if (overrideUrl) {
      setImportUrl(overrideUrl);
    }
    setImporting(true);
    setImportMessage("");
    setImportItems([]);
    const r = await fetch("/api/import-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl, mode: importMode }),
    });
    const d = await r.json();
    setImporting(false);
    if (!r.ok) {
      setImportMessage(d.error || "Não foi possível importar.");
      return;
    }
    const items = (d.items || []) as ImportedNews[];
    setImportItems(items);
    setImportMessage(
      importMode === "feed"
        ? `📡 Radar Goiás: ${items.length} notícias encontradas e categorizadas.`
        : "Matéria completa importada com sucesso!",
    );
    if (importMode === "article" && items[0]) useImported(items[0]);
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryMessage("Erro: digite o nome da nova aba.");
      return;
    }
    setCategorySaving(true);
    setCategoryMessage("");
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name), active: true }),
    });
    const d = await r.json();
    setCategorySaving(false);
    if (!r.ok) {
      setCategoryMessage(`Erro: ${d.error || "não foi possível criar a aba."}`);
      return;
    }
    setNewCategoryName("");
    setCategoryMessage(`Aba “${d.name}” criada e adicionada ao menu.`);
    await load();
    router.refresh();
  }

  async function patchCategory(id: string, payload: Record<string, unknown>, successMessage: string) {
    setCategorySaving(true);
    setCategoryMessage("");
    const r = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    setCategorySaving(false);
    if (!r.ok) {
      setCategoryMessage(`Erro: ${d.error || "não foi possível editar a aba."}`);
      return false;
    }
    setCategoryMessage(successMessage);
    await load();
    router.refresh();
    return true;
  }

  async function saveCategory(category: Category) {
    const draft = categoryDrafts[category.id] || { name: category.name, slug: category.slug };
    await patchCategory(
      category.id,
      { name: draft.name, slug: draft.slug },
      `Aba “${draft.name}” atualizada. As notícias acompanham a mudança de nome.`,
    );
  }

  async function toggleCategory(category: Category) {
    await patchCategory(
      category.id,
      { active: !category.active },
      !category.active ? `Aba “${category.name}” ativada no menu.` : `Aba “${category.name}” ocultada do menu.`,
    );
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const index = orderedCategories.findIndex((c) => c.id === category.id);
    const other = orderedCategories[index + direction];
    if (!other) return;
    setCategorySaving(true);
    setCategoryMessage("");
    const first = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: other.sort_order }),
    });
    if (!first.ok) {
      const d = await first.json();
      setCategorySaving(false);
      setCategoryMessage(`Erro: ${d.error || "não foi possível reordenar."}`);
      return;
    }
    const second = await fetch(`/api/categories/${other.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: category.sort_order }),
    });
    if (!second.ok) {
      const d = await second.json();
      setCategorySaving(false);
      setCategoryMessage(`Erro: ${d.error || "não foi possível concluir a reordenação."}`);
      await load();
      return;
    }
    setCategorySaving(false);
    setCategoryMessage("Ordem das abas atualizada.");
    await load();
    router.refresh();
  }

  async function removeCategory(category: Category) {
    if (!confirm(`Excluir a aba “${category.name}”? Se houver notícias nela, a exclusão será bloqueada.`)) return;
    setCategorySaving(true);
    setCategoryMessage("");
    const r = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const d = await r.json();
    setCategorySaving(false);
    if (!r.ok) {
      setCategoryMessage(`Erro: ${d.error || "não foi possível excluir a aba."}`);
      return;
    }
    setCategoryMessage(`Aba “${category.name}” excluída.`);
    await load();
    router.refresh();
  }

  async function saveSocials(e: FormEvent) {
    e.preventDefault();
    setSocialSaving(true);
    setSocialMessage("");
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socials }),
    });
    const d = await r.json();
    setSocialSaving(false);
    if (!r.ok) {
      setSocialMessage(`Erro: ${d.error || "não foi possível salvar as redes sociais."}`);
      return;
    }
    setSocialMessage("Redes sociais atualizadas com sucesso! Elas já aparecem no rodapé do portal.");
    router.refresh();
  }

  async function handleCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminLoading(true);
    setAdminMessage("");
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminMessage(`Erro: ${data.error || "Não foi possível cadastrar."}`);
      } else {
        setAdminMessage(`✅ ${newAdmin.role === "admin" ? "Administrador" : "Funcionário(a)"} "${newAdmin.name}" cadastrado com sucesso!`);
        setNewAdmin({ name: "", email: "", password: "", role: "editor" });
        await loadAdmins();
      }
    } catch (err: any) {
      setAdminMessage(`Erro: ${err.message || "Falha na comunicação."}`);
    } finally {
      setAdminLoading(false);
    }
  }

  async function toggleAdminActive(admin: AdminUser) {
    setAdminLoading(true);
    setAdminMessage("");
    try {
      const res = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !admin.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminMessage(`Erro: ${data.error || "Não foi possível alterar status."}`);
      } else {
        setAdminMessage(`Status de "${admin.name}" alterado para ${!admin.active ? "Ativo" : "Bloqueado"}.`);
        await loadAdmins();
      }
    } catch (err: any) {
      setAdminMessage(`Erro: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  }

  async function toggleAdminRole(admin: AdminUser) {
    const newRole = admin.role === "admin" ? "editor" : "admin";
    setAdminLoading(true);
    setAdminMessage("");
    try {
      const res = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminMessage(`Erro: ${data.error || "Não foi possível alterar cargo."}`);
      } else {
        setAdminMessage(`Cargo de "${admin.name}" atualizado para ${newRole === "admin" ? "Administrador" : "Editor / Repórter"}.`);
        await loadAdmins();
      }
    } catch (err: any) {
      setAdminMessage(`Erro: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  }

  async function saveNewPassword(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!passwordModal || !passwordModal.newPassword) return;
    setPasswordModalSaving(true);
    try {
      const res = await fetch(`/api/admins/${passwordModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordModal.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminMessage(`Erro: ${data.error || "Não foi possível alterar a senha."}`);
      } else {
        setAdminMessage(`🔑 Senha de "${passwordModal.name}" atualizada com sucesso!`);
        setPasswordModal(null);
      }
    } catch (err: any) {
      setAdminMessage(`Erro: ${err.message}`);
    } finally {
      setPasswordModalSaving(false);
    }
  }

  async function removeAdmin(admin: AdminUser) {
    if (!confirm(`Tem certeza que deseja excluir o acesso de "${admin.name}" (${admin.email})?`)) return;
    setAdminLoading(true);
    setAdminMessage("");
    try {
      const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setAdminMessage(`Erro: ${data.error || "Não foi possível excluir o funcionário."}`);
      } else {
        setAdminMessage(`Acesso de "${admin.name}" removido com sucesso.`);
        await loadAdmins();
      }
    } catch (err: any) {
      setAdminMessage(`Erro: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const published = posts.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;

  return (
    <div className="adminShell">
      <div className="adminTop">
        <div className="container">
          <strong>Viralizougoiania • Painel Editorial</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/" target="_blank" className="btn secondary">Ver Portal</a>
            <button className="btn secondary" onClick={logout}>Sair</button>
          </div>
        </div>
      </div>

      <div className="container adminContent">
        <div className="adminGrid">
          <aside className="adminSide">
            <a href="#" onClick={(e) => { e.preventDefault(); setView("list"); }}>📰 Notícias</a>
            <a href="#" onClick={(e) => { e.preventDefault(); create(); }}>✍️ Nova postagem</a>
            <a href="#" onClick={(e) => { e.preventDefault(); openRadar(); }}>📡 Radar Notícias</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView("queue"); setMessage(""); }} style={{ display: "flex", alignItems: "center" }}>
              🕒 Fila de Postagem
              {queuedPosts.length > 0 && <span className="sidebarBadge">{queuedPosts.length}</span>}
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView("categories"); setCategoryMessage(""); }}>🗂️ Abas / editorias</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView("socials"); setSocialMessage(""); }}>📱 Redes Sociais</a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView("admins");
                setAdminMessage("");
                loadAdmins();
              }}
              style={{ display: "flex", alignItems: "center" }}
            >
              👥 Funcionários & Senhas
              {admins.length > 0 && <span className="sidebarBadge" style={{ background: "#475569" }}>{admins.length}</span>}
            </a>
            <a href="/" target="_blank">🌐 Abrir portal</a>
          </aside>

          <main>
            <div className="stats">
              <div className="stat"><b>{posts.length}</b><span>Total</span></div>
              <div className="stat"><b>{published}</b><span>Publicadas</span></div>
              <div className="stat"><b>{scheduled}</b><span>Agendadas</span></div>
              <div className="stat"><b>{admins.length}</b><span>Equipe / Logins</span></div>
            </div>

            {mode === "readonly-demo" && (
              <div className="notice">O site está na Vercel sem banco configurado. Configure o Supabase para salvar publicações permanentemente.</div>
            )}
            {mode === "local-json" && (
              <div className="notice">Modo local ativo: notícias, abas e redes sociais salvas nos arquivos da pasta <b>data</b>.</div>
            )}
            {message && <div className={message.includes("Erro") ? "notice error" : "notice"}>{message}</div>}

            {view === "list" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>Notícias de Goiânia</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>Gerencie matérias publicadas, agendamentos e manchetes do portal.</div>
                  </div>
                  <button className="btn" onClick={create}>+ Nova notícia</button>
                </div>
                <input
                  placeholder="Buscar por título, editoria ou região..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", padding: 11, border: "1px solid #d9e0de", borderRadius: 9, marginBottom: 14 }}
                />
                {loading ? (
                  <div className="empty">Carregando...</div>
                ) : (
                  <table className="postTable">
                    <thead><tr><th>Título</th><th>Editoria</th><th>Status</th><th>Publicação</th><th>Destaque</th><th>Ações</th></tr></thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id}>
                          <td><b>{p.title}</b><br /><span style={{ color: "#7b8581" }}>{p.city}</span></td>
                          <td><span className="storyTag">{p.category}</span></td>
                          <td><span className={`status ${p.status}`}>{statusLabel(p.status)}</span></td>
                          <td>{p.published_at ? new Date(p.published_at).toLocaleString("pt-BR") : "—"}</td>
                          <td>{p.featured ? "⭐ Sim" : "—"}</td>
                          <td><div className="actions"><button className="btn secondary" onClick={() => edit(p)}>Editar</button><button className="btn danger" onClick={() => remove(p.id)}>Excluir</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Radar Notícias em Tempo Real */}
            {view === "import" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>📡 Radar de Notícias — Tempo Real</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>
                      Puxe as últimas notícias dos principais jornais de Goiânia/Goiás e de todo o Brasil. Imagens e vídeos vêm via link original (economizando espaço).
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      disabled={importing}
                      onClick={() => importNews("feed", activeSourceUrl)}
                    >
                      {importing ? "Carregando..." : "🔄 Atualizar Notícias"}
                    </button>
                    <button className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                  </div>
                </div>

                {/* Abas de Região: Goiânia/Goiás vs Brasil */}
                <div className="radarRegionNav">
                  <button
                    type="button"
                    className={`radarRegionBtn ${radarRegion === "goias" ? "active" : ""}`}
                    onClick={() => {
                      setRadarRegion("goias");
                      const firstGo = RADAR_SOURCES.find((s) => s.region === "goias");
                      if (firstGo && activeSourceUrl !== firstGo.url) {
                        setActiveSourceUrl(firstGo.url);
                        importNews("feed", firstGo.url);
                      }
                    }}
                  >
                    📍 Notícias de Goiânia & Goiás
                  </button>
                  <button
                    type="button"
                    className={`radarRegionBtn ${radarRegion === "brasil" ? "active" : ""}`}
                    onClick={() => {
                      setRadarRegion("brasil");
                      const firstBr = RADAR_SOURCES.find((s) => s.region === "brasil");
                      if (firstBr && activeSourceUrl !== firstBr.url) {
                        setActiveSourceUrl(firstBr.url);
                        importNews("feed", firstBr.url);
                      }
                    }}
                  >
                    🇧🇷 Grandes Jornais do Brasil
                  </button>
                </div>

                {/* Botões de Fontes de Notícias */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {RADAR_SOURCES.filter((s) => s.region === radarRegion).map((src) => {
                    const isActive = activeSourceUrl === src.url;
                    return (
                      <button
                        key={src.name + src.url}
                        type="button"
                        className={`radarSourceBtn ${isActive ? "active" : ""}`}
                        disabled={importing}
                        onClick={() => {
                          setActiveSourceUrl(src.url);
                          importNews("feed", src.url);
                        }}
                      >
                        ⚡ <b>{src.label}</b>
                        <span style={{ opacity: 0.8, fontSize: 10 }}>({src.tag})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="importBox" style={{ padding: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Ou cole o link direto de outra matéria para importar:</label>
                  <div className="importRow">
                    <input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="Cole aqui o link de uma notícia específica..."
                    />
                    <button className="btn secondary" disabled={importing} onClick={() => importNews("article")}>
                      {importing ? "Buscando..." : "Importar link avulso"}
                    </button>
                  </div>
                </div>

                {importMessage && <div className={importItems.length ? "notice" : "notice error"}>{importMessage}</div>}

                {importing && (
                  <div className="empty" style={{ padding: 30 }}>
                    📡 Carregando notícias em tempo real...
                  </div>
                )}

                {!importing && importItems.length === 0 && (
                  <div className="empty">
                    Nenhuma notícia carregada no momento. Clique em um dos jornais acima para puxar as notícias.
                  </div>
                )}

                <div className="importResults">
                  {importItems.map((item, i) => {
                    const isAlreadyPosted = posts.some((p) => {
                      // 1. Slug idêntico
                      if (p.slug && item.title && p.slug === slugify(item.title)) return true;

                      // 2. URL original igual (ignorando http/https, query params e barra final)
                      if (p.source_url && item.source_url) {
                        const cleanP = p.source_url.split("?")[0].replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
                        const cleanItem = item.source_url.split("?")[0].replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
                        if (cleanP === cleanItem) return true;
                      }

                      // 3. Título igual ou similar
                      if (p.title && item.title) {
                        const cleanPTitle = p.title.trim().toLowerCase().replace(/[^\w\s]/g, "");
                        const cleanItemTitle = item.title.trim().toLowerCase().replace(/[^\w\s]/g, "");
                        if (cleanPTitle === cleanItemTitle) return true;
                        if (cleanPTitle.length > 20 && cleanItemTitle.length > 20) {
                          if (cleanPTitle.includes(cleanItemTitle) || cleanItemTitle.includes(cleanPTitle)) return true;
                        }
                      }
                      return false;
                    });

                    return (
                    <article className={`importCard ${isAlreadyPosted ? "alreadyPosted" : ""}`} key={`${item.source_url}-${i}`}>
                      {item.image_url ? (
                        <div style={{ position: "relative" }}>
                          <img src={item.image_url} alt="" />
                          {item.video_url && (
                            <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                              🎬 VÍDEO
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="importPlaceholder">
                          {item.video_url ? "🎬 Notícia com Vídeo" : "Sem Imagem"}
                        </div>
                      )}
                      <div>
                        {/* Linha superior: Fonte, Aba, Badges e Horário de Postagem no canto direito */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="kicker">{item.source_name}</span>
                            {item.category && (
                              <span className="radarCategoryBadge">
                                🏷️ Aba: <b>{item.category}</b>
                              </span>
                            )}
                            {item.video_url && (
                              <span className="radarVideoBadge">
                                🎬 Vídeo disponível
                              </span>
                            )}
                            {item.source_author && (
                              <span className="radarReporterBadge" title={`Reportagem: ${item.source_author}`}>
                                ✍️ Por <b>{item.source_author}</b>
                              </span>
                            )}
                            {isAlreadyPosted && (
                              <span className="radarAlreadyPostedBadge">
                                ✅ Já Publicada no Jornal
                              </span>
                            )}
                          </div>

                          {/* Hora da publicação (exatamente onde solicitado) */}
                          {item.published_at && (
                            <span className="radarTimeBadge" title={new Date(item.published_at).toLocaleString("pt-BR")}>
                              🕒 {formatRadarDate(item.published_at)}
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: 18, lineHeight: 1.25, margin: "4px 0 8px" }}>{item.title}</h3>
                        {item.excerpt && <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>{item.excerpt}</p>}
                        <div className="actions" style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn" onClick={() => useImported(item)}>
                            {isAlreadyPosted ? "⚡ Postar Novamente" : `⚡ Postar Agora (Aba: ${item.category || "Goiânia"})`}
                          </button>
                          <button
                            type="button"
                            className="btnQueue"
                            disabled={importing}
                            onClick={() => queueFromRadar(item)}
                            title="Programa esta matéria para ser postada automaticamente na ordem da fila"
                          >
                            🕒 Enviar p/ Fila (+{queueInterval}m)
                          </button>
                          <a className="btn secondary" href={item.source_url} target="_blank" rel="noreferrer">
                            Ver fonte original
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
                </div>
              </section>
            )}

            {/* Fila de Postagem Automática */}
            {view === "queue" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>🕒 Fila de Postagem Automática</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>
                      As matérias agendadas entram na fila e são liberadas automaticamente pelo portal no horário programado.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => reorderQueue(queueInterval)}>
                      ⚡ Reorganizar Fila (a cada {queueInterval} min)
                    </button>
                    <button className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                  </div>
                </div>

                {message && <div className={message.includes("Erro") ? "notice error" : "notice"}>{message}</div>}

                {/* Toolbar de Controle da Fila */}
                <div className="queueToolbar">
                  <div className="queueIntervalBox">
                    <label style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                      ⏱️ Intervalo entre postagens:
                    </label>
                    <select
                      value={queueInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQueueInterval(val);
                      }}
                    >
                      <option value={5}>A cada 5 minutos</option>
                      <option value={10}>A cada 10 minutos (Padrão)</option>
                      <option value={15}>A cada 15 minutos</option>
                      <option value={20}>A cada 20 minutos</option>
                      <option value={30}>A cada 30 minutos</option>
                      <option value={45}>A cada 45 minutos</option>
                      <option value={60}>A cada 1 hora</option>
                    </select>
                  </div>

                  <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
                    {queuedPosts.length === 0 ? (
                      "Nenhuma matéria na fila de espera."
                    ) : (
                      <span>
                        📦 <b>{queuedPosts.length}</b> notícia(s) na fila • Próxima sai:{" "}
                        <b>
                          {queuedPosts[0]?.published_at
                            ? new Date(queuedPosts[0].published_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </b>
                      </span>
                    )}
                  </div>
                </div>

                {queuedPosts.length === 0 && (
                  <div className="empty" style={{ padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🕒</div>
                    <b>A fila de postagem está vazia!</b>
                    <p style={{ margin: "6px 0 16px", color: "#64748b", fontSize: 13 }}>
                      Vá até o <b>Radar Notícias</b> e clique no botão azul <b>"Enviar p/ Fila"</b> em qualquer notícia para agendar sua publicação automática.
                    </p>
                    <button className="btn" onClick={() => openRadar()}>
                      Ir para o Radar Notícias
                    </button>
                  </div>
                )}

                <div className="queueAdminList">
                  {queuedPosts.map((p, idx) => {
                    const d = p.published_at ? new Date(p.published_at) : new Date();
                    const diffMin = Math.round((d.getTime() - Date.now()) / 60000);
                    const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

                    return (
                      <article className="queueCard" key={p.id}>
                        <div style={{ display: "flex", gap: 14, alignItems: "center", flex: "1 1 450px" }}>
                          <span className="queueOrderBadge">#{idx + 1}</span>
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt=""
                              style={{ width: 85, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                            />
                          ) : (
                            <div style={{ width: 85, height: 60, background: "#f1f5f9", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10, color: "#64748b" }}>
                              Sem foto
                            </div>
                          )}
                          <div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span className="storyTag">{p.category}</span>
                              <span className="queueTimeBadge">
                                🕒 {dateStr} às {timeStr} {diffMin > 0 ? `(daqui a ${diffMin} min)` : "(pronta para liberar)"}
                              </span>
                            </div>
                            <h3 style={{ fontSize: 15, margin: "2px 0 4px", lineHeight: 1.3 }}>{p.title}</h3>
                            <small style={{ color: "#64748b" }}>{p.city} • Autor: {p.author}</small>
                          </div>
                        </div>

                        <div className="actions" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "7px 12px", fontSize: 11 }}
                            onClick={() => publishNow(p)}
                            title="Publica imediatamente esta notícia sem esperar o horário"
                          >
                            🚀 Publicar Agora
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "7px 10px", fontSize: 11 }}
                            onClick={() => adjustQueueTime(p, -queueInterval)}
                            title={`Adiantar em ${queueInterval} minutos`}
                          >
                            ⬆️ -{queueInterval}m
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "7px 10px", fontSize: 11 }}
                            onClick={() => adjustQueueTime(p, queueInterval)}
                            title={`Adiar em ${queueInterval} minutos`}
                          >
                            ⬇️ +{queueInterval}m
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "7px 11px", fontSize: 11 }}
                            onClick={() => edit(p)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            style={{ padding: "7px 11px", fontSize: 11 }}
                            onClick={() => remove(p.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Redes Sociais */}
            {view === "socials" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>📱 Redes Sociais do Portal</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>
                      Cadastre os links das redes oficiais do Viralizougoiania. Elas aparecem com destaque no rodapé do portal.
                    </div>
                  </div>
                  <button className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                </div>

                {socialMessage && <div className={socialMessage.includes("Erro") ? "notice error" : "notice"}>{socialMessage}</div>}

                <form onSubmit={saveSocials} className="socialForm">
                  <div className="field">
                    <label>📸 Instagram (Link ou perfil)</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/viralizougoiania"
                      value={socials.instagram || ""}
                      onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>💬 WhatsApp (Link do Grupo VIP, Comunidade ou Canal)</label>
                    <input
                      type="url"
                      placeholder="https://chat.whatsapp.com/... ou https://wa.me/5562..."
                      value={socials.whatsapp || ""}
                      onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>🎵 TikTok</label>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@viralizougoiania"
                      value={socials.tiktok || ""}
                      onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>▶️ YouTube</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/@viralizougoiania"
                      value={socials.youtube || ""}
                      onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>📘 Facebook</label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/viralizougoiania"
                      value={socials.facebook || ""}
                      onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>✖️ X (Twitter)</label>
                    <input
                      type="url"
                      placeholder="https://x.com/viralizougoiania"
                      value={socials.twitter || ""}
                      onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                    />
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <button className="btn" disabled={socialSaving}>
                      {socialSaving ? "Salvando..." : "💾 Salvar Redes Sociais"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Funcionários e Administradores */}
            {view === "admins" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>👥 Funcionários, Editores & Administradores</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>
                      Cadastre logins e senhas individuais para jornalistas e administradores do portal.
                    </div>
                  </div>
                  <button className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                </div>

                {adminMessage && (
                  <div className={adminMessage.startsWith("Erro") ? "notice error" : "notice"}>
                    {adminMessage}
                  </div>
                )}

                {/* Formulário de Cadastro */}
                <form className="adminUserCreateForm" onSubmit={handleCreateAdmin}>
                  <div className="adminUserCreateHeader">
                    <div>
                      <b style={{ fontSize: 15, color: "#0f172a" }}>➕ Cadastrar Novo Colaborador / Administrador</b>
                      <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Crie o login e senha para que o membro da equipe acesse a área editorial em <b>/admin/login</b>.
                      </span>
                    </div>
                  </div>

                  <div className="adminUserFormGrid">
                    <div className="field">
                      <label>Nome Completo do Colaborador</label>
                      <input
                        required
                        placeholder="Ex: Amanda Castro ou Carlos Pereira"
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label>E-mail de Login</label>
                      <input
                        type="email"
                        required
                        placeholder="ex: amanda@viralizougoiania.com.br"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label>Senha de Acesso</label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        placeholder="Defina uma senha (ex: equipe2026)"
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      />
                      <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>
                        O usuário entrará informando este e-mail e senha.
                      </small>
                    </div>

                    <div className="field">
                      <label>Função / Permissão</label>
                      <select
                        value={newAdmin.role}
                        onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as "admin" | "editor" })}
                      >
                        <option value="editor">📝 Editor / Repórter (Cria matérias, usa Radar e Fila)</option>
                        <option value="admin">🛡️ Administrador (Acesso total + gerencia equipe)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button className="btn" disabled={adminLoading}>
                      {adminLoading ? "Cadastrando..." : "➕ Salvar & Liberar Acesso"}
                    </button>
                  </div>
                </form>

                {/* Lista de Colaboradores */}
                <div style={{ marginTop: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                      Equipe e Usuários Cadastrados ({admins.length})
                    </h2>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      Sincronizado com o Supabase (Tabela <code>admins</code>)
                    </span>
                  </div>

                  {admins.length === 0 ? (
                    <div className="empty">Nenhum funcionário cadastrado no momento. Preencha o formulário acima.</div>
                  ) : (
                    <div className="adminUserList">
                      {admins.map((u) => {
                        const initials = u.name
                          ? u.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()
                          : "U";
                        return (
                          <div key={u.id} className={`adminUserCard ${!u.active ? "disabled" : ""}`}>
                            <div className="adminUserInfo">
                              <div className="adminUserAvatar">{initials}</div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <b style={{ fontSize: 14, color: "#0f172a" }}>{u.name}</b>
                                  <span className={`adminRoleBadge ${u.role}`}>
                                    {u.role === "admin" ? "🛡️ Administrador" : "📝 Editor / Repórter"}
                                  </span>
                                  <span className={`adminStatusBadge ${u.active ? "active" : "inactive"}`}>
                                    {u.active ? "🟢 Ativo" : "🔴 Bloqueado"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                  <span>✉️ <b>{u.email}</b></span>
                                  {u.created_at && (
                                    <span style={{ marginLeft: 12 }}>
                                      📅 Cadastrado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="adminUserActions">
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => setPasswordModal({ id: u.id, name: u.name, newPassword: "" })}
                                title="Redefinir a senha deste colaborador"
                              >
                                🔑 Alterar Senha
                              </button>
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => toggleAdminRole(u)}
                                title="Alternar cargo entre Administrador e Editor"
                              >
                                {u.role === "admin" ? "Tornar Editor" : "Tornar Admin"}
                              </button>
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => toggleAdminActive(u)}
                                title={u.active ? "Bloquear acesso ao painel" : "Desbloquear acesso ao painel"}
                              >
                                {u.active ? "⏸️ Bloquear" : "▶️ Ativar"}
                              </button>
                              <button
                                type="button"
                                className="btn danger"
                                onClick={() => removeAdmin(u)}
                                title="Excluir usuário permanentemente"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal de Redefinir Senha */}
                {passwordModal && (
                  <div className="adminModalOverlay" onClick={() => setPasswordModal(null)}>
                    <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
                      <div className="adminModalHeader">
                        <b style={{ fontSize: 16, color: "#0f172a" }}>🔑 Redefinir Senha</b>
                        <button
                          type="button"
                          className="adminModalClose"
                          onClick={() => setPasswordModal(null)}
                        >
                          ✕
                        </button>
                      </div>
                      <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 16px" }}>
                        Digite a nova senha de acesso para <b>{passwordModal.name}</b>:
                      </p>
                      <form onSubmit={saveNewPassword}>
                        <div className="field">
                          <label>Nova Senha</label>
                          <input
                            type="text"
                            required
                            minLength={4}
                            autoFocus
                            placeholder="Digite a nova senha"
                            value={passwordModal.newPassword}
                            onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => setPasswordModal(null)}
                            disabled={passwordModalSaving}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="btn"
                            disabled={passwordModalSaving || !passwordModal.newPassword}
                          >
                            {passwordModalSaving ? "Salvando..." : "Salvar Senha"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Abas e Editorias */}
            {view === "categories" && (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h1>Abas e Editorias</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>Crie, renomeie, organize ou esconda as abas do menu do Viralizougoiania.</div>
                  </div>
                  <button className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                </div>

                {categoryMessage && <div className={categoryMessage.startsWith("Erro") ? "notice error" : "notice"}>{categoryMessage}</div>}

                <form className="categoryCreate" onSubmit={createCategory}>
                  <div>
                    <b>Criar nova aba</b>
                    <span>Ex.: Aparecida, Gastronomia, Concursos, Saúde...</span>
                  </div>
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome da nova aba" />
                  <button className="btn" disabled={categorySaving}>+ Criar aba</button>
                </form>

                <div className="categoryAdminList">
                  {orderedCategories.map((category, index) => {
                    const draft = categoryDrafts[category.id] || { name: category.name, slug: category.slug };
                    return (
                      <article className={`categoryAdminRow ${category.active ? "" : "inactive"}`} key={category.id}>
                        <div className="categoryOrder">
                          <button type="button" className="orderBtn" disabled={categorySaving || index === 0} onClick={() => moveCategory(category, -1)} aria-label={`Mover ${category.name} para cima`}>↑</button>
                          <b>{index + 1}</b>
                          <button type="button" className="orderBtn" disabled={categorySaving || index === orderedCategories.length - 1} onClick={() => moveCategory(category, 1)} aria-label={`Mover ${category.name} para baixo`}>↓</button>
                        </div>
                        <div className="categoryEditFields">
                          <label>Nome da aba<input value={draft.name} onChange={(e) => setCategoryDrafts({ ...categoryDrafts, [category.id]: { ...draft, name: e.target.value, slug: slugify(e.target.value) } })} /></label>
                          <label>Endereço da aba<input value={draft.slug} onChange={(e) => setCategoryDrafts({ ...categoryDrafts, [category.id]: { ...draft, slug: slugify(e.target.value) } })} /></label>
                        </div>
                        <div className="categoryState"><span className={category.active ? "categoryActive" : "categoryInactive"}>{category.active ? "Ativa no menu" : "Oculta"}</span></div>
                        <div className="categoryActions">
                          <button type="button" className="btn secondary" disabled={categorySaving} onClick={() => saveCategory(category)}>Salvar</button>
                          <button type="button" className="btn secondary" disabled={categorySaving} onClick={() => toggleCategory(category)}>{category.active ? "Ocultar" : "Ativar"}</button>
                          <button type="button" className="btn danger" disabled={categorySaving} onClick={() => removeCategory(category)}>Excluir</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="categoryHelp"><b>Como funciona:</b> abas ativas aparecem automaticamente no topo do site e no rodapé. Ao renomear uma aba, as notícias já cadastradas nela também são atualizadas.</div>
              </section>
            )}

            {/* Formulário de Notícia */}
            {view === "form" && (
              <form className="panel" onSubmit={submit}>
                <div className="toolbar">
                  <div>
                    <h1>{form.id ? "Editar notícia" : "Nova notícia"}</h1>
                    <div style={{ color: "#68736e", fontSize: 13 }}>Publique agora, salve como rascunho ou programe.</div>
                  </div>
                  <button type="button" className="btn secondary" onClick={() => setView("list")}>Voltar</button>
                </div>

                <div className="formGrid">
                  <div className="field full">
                    <label>Título</label>
                    <input
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })}
                    />
                  </div>

                  <div className="field full">
                    <label>Slug / URL</label>
                    <input
                      required
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    />
                  </div>

                  <div className="field full">
                    <label>Resumo / Subtítulo</label>
                    <textarea
                      required
                      value={form.excerpt}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Editoria</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {orderedCategories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}{c.active ? "" : " (oculta)"}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Bairro / Região</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>

                  <div className="field">
                    <label>Autor / Jornalista</label>
                    <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>

                  <div className="field">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}>
                      <option value="published">Publicar agora</option>
                      <option value="draft">Rascunho</option>
                      <option value="scheduled">Programar publicação</option>
                    </select>
                  </div>

                  <div className="field full">
                    <label>🖼️ URL da imagem de capa (Link direto • Economiza espaço)</label>
                    <input
                      placeholder="https://... (ex: link do G1, Unsplash ou portal original)"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    />
                    <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>
                      A imagem carrega via link direto da CDN original, consumindo zero espaço no seu disco ou banco de dados.
                    </small>
                    {form.image_url && (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={form.image_url}
                          alt="Prévia da capa"
                          style={{ maxWidth: 360, maxHeight: 220, objectFit: "cover", borderRadius: 12, border: "1px solid #e2e8f0" }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="field full">
                    <label>🎬 Link do Vídeo da matéria (Opcional - YouTube, Globoplay ou .mp4)</label>
                    <input
                      placeholder="https://www.youtube.com/watch?v=... ou https://globoplay.globo.com/v/..."
                      value={form.video_url}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    />
                    <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>
                      Se informado, o portal exibe automaticamente um player responsivo na notícia para os leitores assistirem.
                    </small>
                  </div>
                </div>

                {/* Card de Apuração e Reescrita (Original x Viralizougoiania) */}
                <div className="rewriteBox">
                  <div className="rewriteHeader">
                    <div>
                      <small>Apuração e Reescrita</small>
                      <h3>Original × Viralizougoiania</h3>
                      <p>O texto da fonte fica visível apenas no painel. A publicação usa a versão da redação.</p>
                      <div className="rewriteBadges">
                        <span className="rewriteBadge success">✓ Corpo capturado</span>
                        <span className="rewriteBadge">
                          {(form.source_content || form.content || "").split(/\s+/).filter(Boolean).length} palavras na fonte
                        </span>
                        <span className="rewriteBadge">Método: blocos-editoriais</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={reformatContent}
                      title="Reescrever e reestruturar os parágrafos"
                    >
                      ✨ Reescrever matéria completa
                    </button>
                  </div>

                  <div className="rewriteCols">
                    {/* Coluna Esquerda: Texto original da fonte */}
                    <div className="rewriteCol">
                      <div className="rewriteColHead">
                        <b>Texto original da fonte</b>
                        <span>Referência interna • não vai para a página pública</span>
                      </div>
                      <div className="sourceTextBox">
                        {form.source_content || form.excerpt || "Nenhum texto original capturado da fonte."}
                      </div>
                      <div className="sourceTextFooter">
                        <span>{form.source_name || "Fonte"}</span>
                        {form.source_url ? (
                          <a href={form.source_url} target="_blank" rel="noopener noreferrer">
                            Abrir matéria original ↗
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {/* Coluna Direita: Versão Viralizougoiania (Texto que será publicado) */}
                    <div className="rewriteCol">
                      <div className="rewriteColHead">
                        <b>Versão Viralizougoiania</b>
                        <span>Texto que será publicado</span>
                      </div>
                      <textarea
                        className="editorText"
                        required
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Texto formatado da matéria..."
                        style={{ height: 360, minHeight: 360 }}
                      />
                      <div className="reviewedNotice">
                        <input
                          id="reviewedCheck"
                          type="checkbox"
                          checked={form.is_reviewed}
                          onChange={(e) => setForm({ ...form, is_reviewed: e.target.checked })}
                        />
                        <label htmlFor="reviewedCheck">
                          REVISADA PELO JORNALISTA<br />
                          <small style={{ fontWeight: 600, color: "#166534" }}>
                            CONFIRME SOMENTE DEPOIS DE COMPARAR FATOS, NOMES, DATAS, NÚMEROS E CONTEXTO COM A FONTE.
                          </small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campos de Fonte e Créditos */}
                <div className="formGrid">
                  <div className="field">
                    <label>Nome da fonte</label>
                    <input
                      value={form.source_name}
                      onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                      placeholder="Ex.: G1 / Mais Goiás"
                    />
                  </div>

                  <div className="field">
                    <label>Link da fonte</label>
                    <input
                      type="url"
                      value={form.source_url}
                      onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="field">
                    <label>Crédito da imagem</label>
                    <input
                      value={form.image_credit}
                      onChange={(e) => setForm({ ...form, image_credit: e.target.value })}
                      placeholder="Ex.: Foto: Reprodução / Divulgação"
                    />
                  </div>

                  <div className="field">
                    <label>✍️ Repórter / Autor da matéria original (Créditos)</label>
                    <input
                      value={form.source_author}
                      onChange={(e) => setForm({ ...form, source_author: e.target.value })}
                      placeholder="Ex.: Eliane Barros, Yanca Cristina, Adriana Marinelli..."
                    />
                    <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>
                      Garante os créditos profissionais do jornalista que apurou a notícia original.
                    </small>
                  </div>
                </div>

                {/* Seção SEO */}
                <div className="seoBox">
                  <b>SEO</b>
                  <div className="formGrid">
                    <div className="field">
                      <input
                        placeholder="Título SEO"
                        value={form.seo_title}
                        onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <input
                        placeholder="Palavras-chave separadas por vírgula"
                        value={form.seo_keywords}
                        onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
                      />
                    </div>
                    <div className="field full">
                      <textarea
                        placeholder="Descrição SEO"
                        value={form.seo_description}
                        onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                        style={{ minHeight: 70 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Programação e Destaque */}
                <div className="formGrid" style={{ marginTop: 16 }}>
                  {form.status === "scheduled" && (
                    <div className="field full scheduleBox">
                      <label>Data e hora programada</label>
                      <input
                        required
                        type="datetime-local"
                        value={form.published_at}
                        onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                      />
                      <small>A notícia será liberada automaticamente quando esse horário chegar.</small>
                    </div>
                  )}

                  {form.status !== "scheduled" && (
                    <div className="field">
                      <label>Data de publicação (opcional)</label>
                      <input
                        type="datetime-local"
                        value={form.published_at}
                        onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="field">
                    <label>Destaque principal</label>
                    <div className="checkRow" style={{ marginTop: 8 }}>
                      <input
                        id="featured"
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      />
                      <label htmlFor="featured">Mostrar como manchete principal na Home</label>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <div>
                    <button
                      type="button"
                      className="btnQueue"
                      disabled={saving}
                      onClick={() => {
                        const slot = getNextQueueTime();
                        setForm({
                          ...form,
                          status: "scheduled",
                          published_at: localDateTime(slot),
                        });
                        setMessage(`Programada para a Fila de Postagem automática!`);
                      }}
                      title="Define o status como agendado para o próximo horário disponível na fila"
                    >
                      🕒 Agendar na Fila (+{queueInterval}m)
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="btn secondary" onClick={() => setView("list")}>Cancelar</button>
                    <button className="btn" disabled={saving}>
                      {saving
                        ? "Salvando..."
                        : form.status === "draft"
                        ? "Salvar rascunho"
                        : form.status === "scheduled"
                        ? "Agendar notícia"
                        : "Publicar notícia"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
