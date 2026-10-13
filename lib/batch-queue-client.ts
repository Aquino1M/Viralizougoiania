import type { ImportedNews } from "@/lib/types";

interface BatchQueueItem {
  item: ImportedNews;
  slotMinutes: number;
}

interface ExecuteBatchQueueOptions {
  plannedSchedule: BatchQueueItem[];
  baseTime: number;
  setBatchProgress: (msg: string) => void;
}

/**
 * Envia matérias para a fila de postagem em lotes através da API otimizada do servidor (/api/posts/batch-queue).
 * - Não bloqueia a thread do navegador (computador e celular rodam com fluidez total).
 * - O servidor resolve as matérias em paralelo.
 * - Se a matéria não possuir foto da fonte, a API aplica a imagem padrão da categoria, garantindo que 100% sejam salvas.
 */
export async function executeBatchQueue({
  plannedSchedule,
  baseTime,
  setBatchProgress,
}: ExecuteBatchQueueOptions): Promise<number> {
  if (!plannedSchedule || plannedSchedule.length === 0) return 0;

  const chunkSize = 35;
  const totalBatches = Math.ceil(plannedSchedule.length / chunkSize);
  let totalSuccess = 0;

  for (let b = 0; b < totalBatches; b++) {
    const chunk = plannedSchedule.slice(b * chunkSize, (b + 1) * chunkSize);
    const startNum = b * chunkSize + 1;
    const endNum = Math.min((b + 1) * chunkSize, plannedSchedule.length);

    setBatchProgress(
      `Agendando na Fila (Lote ${b + 1} de ${totalBatches}): matérias ${startNum} a ${endNum} de ${plannedSchedule.length}...`
    );

    try {
      const res = await fetch("/api/posts/batch-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: chunk,
          baseTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        totalSuccess += Number(data.queued || 0);
      } else {
        const errText = await res.text();
        console.warn("Aviso ao agendar lote:", errText);
      }
    } catch (err) {
      console.warn("Erro de rede ao enviar lote:", err);
    }
  }

  return totalSuccess;
}
