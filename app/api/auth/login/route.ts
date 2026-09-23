import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/session";
import { verifyAdminCredentials } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, email } = body;

    const result = await verifyAdminCredentials(password, email);
    if (!result.ok || !result.user) {
      return NextResponse.json({ error: result.error || "Senha ou login incorreto" }, { status: 401 });
    }

    await createAdminSession({ email: result.user.email, role: result.user.role });
    return NextResponse.json({ ok: true, user: result.user });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro ao processar login" }, { status: 500 });
  }
}
