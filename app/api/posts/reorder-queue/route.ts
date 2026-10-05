import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getScheduledPostsAll, patchPostsPublishedAt } from "@/lib/storage";
import { saveAutomationState } from "@/lib/automation-state";

export const dynamic = "force-dynamic";

type QueueMode = "1_per_10m" | "2_per_10m" | "3_per_10m" | "1_per_category" | "3_per_category";
const MODES = new Set<QueueMode>(["1_per_10m","2_per_10m","3_per_10m","1_per_category","3_per_category"]);

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const interval = Math.max(10, Number(body.interval_minutes) || 10);
    const mode: QueueMode = MODES.has(body.queue_mode) ? body.queue_mode : "1_per_category";
    const posts = await getScheduledPostsAll();
    const baseTime = Date.now();
    const planned: Array<{ id: string; publishedAt: string }> = [];

    if (mode === "1_per_category" || mode === "3_per_category") {
      const perCategory = mode === "3_per_category" ? 3 : 1;
      const groups = new Map<string, typeof posts>();
      for (const post of posts) {
        const category = post.category || "Goiânia";
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category)!.push(post);
      }
      let step = 1;
      let hasMore = true;
      while (hasMore) {
        hasMore = false;
        for (const list of groups.values()) {
          for (let take = 0; take < perCategory; take++) {
            const post = list.shift();
            if (!post) break;
            hasMore = true;
            planned.push({ id: post.id, publishedAt: new Date(baseTime + step * interval * 60000).toISOString() });
          }
        }
        if (hasMore) step++;
      }
    } else {
      const perSlot = mode === "3_per_10m" ? 3 : mode === "2_per_10m" ? 2 : 1;
      posts.forEach((post, index) => {
        planned.push({ id: post.id, publishedAt: new Date(baseTime + (Math.floor(index / perSlot) + 1) * interval * 60000).toISOString() });
      });
    }

    const byTime = new Map<string, string[]>();
    for (const item of planned) {
      if (!byTime.has(item.publishedAt)) byTime.set(item.publishedAt, []);
      byTime.get(item.publishedAt)!.push(item.id);
    }
    for (const [publishedAt, ids] of byTime) await patchPostsPublishedAt(ids, publishedAt);
    await saveAutomationState({ queue_mode: mode, interval_minutes: interval });

    return NextResponse.json({ ok: true, updated: planned.length, slots: byTime.size, queue_mode: mode, interval_minutes: interval });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao reorganizar a fila." }, { status: 500 });
  }
}
