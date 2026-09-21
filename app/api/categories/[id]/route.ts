import { NextResponse } from "next/server";
import { deleteCategory, getCategoryById, updateCategory } from "@/lib/storage";
import { isSuperAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { CategoryInput } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem editar editorias." }, { status: 403 });
  try {
    const { id } = await params;
    const current = await getCategoryById(id);
    if (!current) return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    const b = await req.json();
    const patch: Partial<CategoryInput> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return NextResponse.json({ error: "O nome da aba não pode ficar vazio." }, { status: 400 });
      patch.name = name;
      patch.slug = slugify(String(b.slug || name));
    } else if (b.slug !== undefined) {
      patch.slug = slugify(String(b.slug));
    }
    if (b.active !== undefined) patch.active = Boolean(b.active);
    if (b.sort_order !== undefined && Number.isFinite(Number(b.sort_order))) patch.sort_order = Number(b.sort_order);
    const updated = await updateCategory(id, patch);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao editar aba" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem excluir editorias." }, { status: 403 });
  try {
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao excluir aba" }, { status: 500 });
  }
}
