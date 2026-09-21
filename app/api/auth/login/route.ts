import { NextResponse } from "next/server";
import { authenticateUser, publicUser } from "@/lib/users";
import { createAdminSession } from "@/lib/session";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Digite o login e a senha." }, { status: 400 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      await sleep(500);
      return NextResponse.json({ error: "Login ou senha incorretos." }, { status: 401 });
    }

    await createAdminSession(user);
    return NextResponse.json({ ok: true, user: publicUser(user) });
  } catch {
    return NextResponse.json({ error: "Não foi possível entrar no painel." }, { status: 500 });
  }
}
