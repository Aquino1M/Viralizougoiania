import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/session";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)) {
    return NextResponse.json(
      { error: "Configure ADMIN_PASSWORD e SESSION_SECRET nas variáveis de ambiente da Vercel." },
      { status: 503 },
    );
  }

  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== expected) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
