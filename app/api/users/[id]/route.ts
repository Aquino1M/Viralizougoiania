import { NextResponse } from "next/server";
import { deleteUser, getUserById, getUsers, publicUser, updateUser } from "@/lib/users";
import { getSession, isSuperAdmin } from "@/lib/session";
import type { UserRole } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem editar usuários." }, { status: 403 });
  try {
    const { id } = await params;
    const session = await getSession();
    const body = await req.json();
    const current = await getUserById(id);
    if (!current) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    if (session?.id === id && (body.active === false || (body.role && body.role !== "admin"))) {
      return NextResponse.json({ error: "Você não pode desativar ou remover seu próprio acesso de administrador." }, { status: 400 });
    }

    if (current.role === "admin" && (body.active === false || body.role === "journalist")) {
      const activeAdmins = (await getUsers()).filter((u) => u.role === "admin" && u.active);
      if (activeAdmins.length <= 1) return NextResponse.json({ error: "É necessário manter pelo menos um administrador ativo." }, { status: 400 });
    }

    const user = await updateUser(id, {
      username: body.username !== undefined ? String(body.username) : undefined,
      name: body.name !== undefined ? String(body.name) : undefined,
      password: body.password ? String(body.password) : undefined,
      role: body.role ? (body.role as UserRole) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    return NextResponse.json(publicUser(user));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao atualizar usuário." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem excluir usuários." }, { status: 403 });
  try {
    const { id } = await params;
    const session = await getSession();
    if (session?.id === id) return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });

    const current = await getUserById(id);
    if (!current) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (current.role === "admin" && current.active) {
      const activeAdmins = (await getUsers()).filter((u) => u.role === "admin" && u.active);
      if (activeAdmins.length <= 1) return NextResponse.json({ error: "É necessário manter pelo menos um administrador ativo." }, { status: 400 });
    }

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao excluir usuário." }, { status: 400 });
  }
}
