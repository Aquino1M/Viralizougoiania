import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPost, getCategories } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { formatViralizouArticle } from "@/lib/rewrite";
import { getCategoryFallbackImage, inferLocation } from "@/lib/category-classifier";
import type { ImportedNews, PostStatus } from "@/lib/types";

export const maxDuration = 60;

interface BatchQueueItem {
  item: ImportedNews;
  slotMinutes: number;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items: BatchQueueItem[] = Array.isArray(body.items) ? body.items : [];
    const baseTime: number = typeof body.baseTime === "number" && body.baseTime > 0 ? body.baseTime : Date.now();

    if (items.length === 0) {
      return NextResponse.json({ ok: true, queued: 0, message: "Nenhum item para agendar." });
    }

    const categories = await getCategories({ includeInactive: false });
    const categoryNames = new Set(categories.map((c) => c.name.toLowerCase()));

    let countSuccess = 0;
    const errors: string[] = [];

    // Processa com concorrência paralela no servidor (8 de cada vez)
    const concurrency = 8;
    for (let i = 0; i < items.length; i += concurrency) {
      const slice = items.slice(i, i + concurrency);
      await Promise.all(
        slice.map(async ({ item, slotMinutes }) => {
          try {
            const slotTime = new Date(baseTime + slotMinutes * 60 * 1000).toISOString();

            let targetCategory = "Goiânia";
            if (item.category) {
              const match = categories.find((c) => c.name.toLowerCase() === item.category!.toLowerCase());
              targetCategory = match ? match.name : item.category;
            }

            const rawSource = item.source_content || item.content || item.excerpt || item.title;
            const formatted = formatViralizouArticle({
              title: item.title,
              excerpt: item.excerpt,
              sourceText: rawSource,
              sourceName: item.source_name,
              category: targetCategory,
            });

            const computedAuthor = item.source_author
              ? (item.source_name ? `${item.source_author} | ${item.source_name}` : item.source_author)
              : (item.source_name || "Redação");

            const finalImage = (item.image_url && typeof item.image_url === "string" && item.image_url.trim().length >= 10)
              ? item.image_url.trim()
              : getCategoryFallbackImage(targetCategory);

            const loc = inferLocation(item);
            const postCity = loc.city || (loc.isGoias ? "Goiás" : "Brasil");

            await createPost({
              title: item.title,
              slug: slugify(item.title),
              excerpt: item.excerpt || item.title,
              content: formatted,
              source_content: rawSource,
              category: targetCategory,
              city: postCity,
              author: computedAuthor,
              image_url: finalImage,
              image_credit: item.image_credit || (item.source_author ? `Reportagem: ${item.source_author}${item.source_name ? ` | ${item.source_name}` : ""}` : `Foto: Reprodução / ${item.source_name || "Divulgação"}`),
              video_url: item.video_url || "",
              featured: false,
              status: "scheduled" as PostStatus,
              published_at: slotTime,
              source_name: item.source_name || "",
              source_url: item.source_url || "",
              source_author: item.source_author || "",
              seo_title: item.title,
              seo_description: item.excerpt || item.title,
              seo_keywords: loc.isGoias ? `Goiás, Goiânia, ${targetCategory}` : `${targetCategory}, Brasil`,
            });

            countSuccess++;
          } catch (err: any) {
            errors.push(`${item.title.slice(0, 30)}: ${err.message}`);
          }
        })
      );
    }

    try {
      revalidatePath("/");
      revalidatePath("/categoria/[categoria]", "page");
    } catch {}

    return NextResponse.json({
      ok: true,
      queued: countSuccess,
      total: items.length,
      errors: errors.slice(0, 10),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro no processamento em lote" }, { status: 500 });
  }
}
