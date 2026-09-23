import { NextResponse } from "next/server";
import { createAdmin, getAdmins } from "@/lib/storage";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const admins = await getAdmins();
    return NextResponse.json({ admins });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao carregar funcionários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const { email, name, password, role, active } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }
    const admin = await createAdmin({
      email,
      name: name || "Funcionário",
      password,
      role: role === "admin" ? "admin" : "editor",
      active: active !== false,
    });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao cadastrar funcionário" }, { status: 500 });
  }
}
