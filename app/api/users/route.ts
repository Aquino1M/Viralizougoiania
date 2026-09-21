import { NextResponse } from "next/server";
import { createUser, getUsers, publicUser, usersStorageMode } from "@/lib/users";
import { getSession, isSuperAdmin } from "@/lib/session";
import type { UserRole } from "@/lib/types";

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem gerenciar a equipe." }, { status: 403 });
  const session = await getSession();
  const users = (await getUsers()).map(publicUser);
  return NextResponse.json({ users, current_user_id: session?.id, mode: usersStorageMode() });
}

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Apenas administradores podem cadastrar usuários." }, { status: 403 });
  try {
    const body = await req.json();
    const user = await createUser({
      username: String(body.username || ""),
      name: String(body.name || ""),
      password: String(body.password || ""),
      role: (body.role === "admin" ? "admin" : "journalist") as UserRole,
      active: body.active !== false,
    });
    return NextResponse.json(publicUser(user), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao cadastrar usuário." }, { status: 400 });
  }
}
