import { NextResponse } from "next/server";
import { deleteAdmin, updateAdmin } from "@/lib/storage";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const admin = await updateAdmin(id, body);
    return NextResponse.json({ admin });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao atualizar funcionário" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await deleteAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao excluir funcionário" }, { status: 500 });
  }
}
