import { NextResponse } from "next/server";
import { getPosts, deletePost, updatePost } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import type { Post } from "@/lib/types";

const STOP_WORDS = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "com", "nao", "uma", "os", "no", "se", "na", "por", "mais",
  "as", "dos", "como", "mas", "foi", "ao", "ele", "das", "tem", "seu", "sua", "ou", "ser", "quando", "muito", "ha",
  "nos", "ja", "esta", "eu", "tambem", "so", "pelo", "pela", "ate", "isso", "ela", "entre", "era", "depois", "sem", "mesmo",
  "aos", "ter", "seus", "quem", "nas", "me", "esse", "eles", "estao", "voce", "tinha", "foram", "essa", "num", "nem", "suas",
  "meu", "minha", "numa", "pelos", "elas", "havia", "seja", "qual", "sera", "tenho", "lhe", "deles", "essas",
  "esses", "pelas", "este", "fosse", "dele", "apos", "diz", "sobre", "novo", "nova", "novos", "novas", "durante", "fazer", "pode", "apenas"
]);

function getKeywords(title: string): Set<string> {
  const words = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

function wordSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const allPosts: Post[] = await getPosts({ includeDrafts: true });
    if (!allPosts || !allPosts.length) {
      return NextResponse.json({ deletedCount: 0, message: "Nenhum post encontrado." });
    }

    const scheduled = allPosts.filter((p) => p.status === "scheduled");
    const published = allPosts.filter((p) => p.status === "published");

    const toDeleteIds = new Set<string>();
    const seenImages = new Map<string, string>();
    const activeScheduled: Post[] = [];

    // 1. Verifica duplicados entre agendados e já publicados (se já foi publicado, remove da fila)
    for (const s of scheduled) {
      const sKw = getKeywords(s.title);
      let duplicateOfPublished = false;

      for (const pub of published) {
        if (s.image_url && pub.image_url && s.image_url.trim() === pub.image_url.trim() && !s.image_url.includes("logo")) {
          toDeleteIds.add(s.id);
          duplicateOfPublished = true;
          break;
        }
        const pubKw = getKeywords(pub.title);
        const sim = wordSimilarity(sKw, pubKw);
        if (sim >= 0.38) {
          toDeleteIds.add(s.id);
          duplicateOfPublished = true;
          break;
        }
      }

      if (!duplicateOfPublished) {
        activeScheduled.push(s);
      }
    }

    // 2. Verifica duplicados dentro da própria fila
    const finalQueue: Post[] = [];
    for (const item of activeScheduled) {
      if (toDeleteIds.has(item.id)) continue;
      const kw = getKeywords(item.title);

      // Mesma imagem
      const cleanImg = item.image_url ? item.image_url.trim().split("?")[0].toLowerCase() : "";
      if (cleanImg && !cleanImg.includes("logo") && seenImages.has(cleanImg)) {
        toDeleteIds.add(item.id);
        continue;
      }

      // Mesmo assunto temático
      let dupeInQueue = false;
      for (const prev of finalQueue) {
        const prevKw = getKeywords(prev.title);
        const sim = wordSimilarity(kw, prevKw);
        if (sim >= 0.38) {
          toDeleteIds.add(item.id);
          dupeInQueue = true;
          break;
        }
      }

      if (!dupeInQueue) {
        if (cleanImg && !cleanImg.includes("logo")) seenImages.set(cleanImg, item.title);
        finalQueue.push(item);
      }
    }

    // Executa a exclusão de todos os identificados
    for (const id of toDeleteIds) {
      await deletePost(id);
    }

    // 3. Reorganiza os horários da fila para garantir espaçamento uniforme de 10 em 10 min
    const now = new Date();
    const nextMinute = Math.ceil(now.getMinutes() / 10) * 10;
    let startTime = new Date(now);
    startTime.setMinutes(nextMinute, 0, 0);
    if (startTime.getTime() <= now.getTime()) {
      startTime = new Date(startTime.getTime() + 10 * 60 * 1000);
    }

    for (let i = 0; i < finalQueue.length; i++) {
      const p = finalQueue[i];
      const slotTime = new Date(startTime.getTime() + i * 10 * 60 * 1000).toISOString();
      await updatePost(p.id, { published_at: slotTime });
    }

    return NextResponse.json({
      success: true,
      deletedCount: toDeleteIds.size,
      remainingInQueue: finalQueue.length,
      message: `Deduplicação concluída: ${toDeleteIds.size} matérias duplicadas foram removidas e a fila foi reorganizada!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro na deduplicação" }, { status: 500 });
  }
}
