import { NextResponse } from "next/server";
import { createCategory, getCategories, storageMode } from "@/lib/storage";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";

export async function GET() {
  const admin = await isAdmin();
  const categories = await getCategories({ includeInactive: admin });
  return NextResponse.json({ categories, mode: storageMode() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Digite o nome da nova aba." }, { status: 400 });
    const categories = await getCategories({ includeInactive: true });
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    const category = await createCategory({
      name,
      slug: slugify(String(b.slug || name)),
      active: b.active !== false,
      sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : maxOrder + 1,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao criar aba" }, { status: 500 });
  }
}
