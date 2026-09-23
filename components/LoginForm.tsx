"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await r.json();
      setLoading(false);

      if (!r.ok) {
        setError(data.error || "Erro ao realizar login");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Falha de conexão ao autenticar.");
    }
  }

  return (
    <div className="loginWrap">
      <form className="loginCard" onSubmit={submit}>
        <div className="brandLogo">
          <span className="brandMark" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
          <span className="brandWords">
            <b>Viralizou</b><strong>goiania</strong>
          </span>
        </div>

        <h1>Área dos Funcionários</h1>
        <p>Acesse o painel editorial com sua conta do Supabase ou senha da redação.</p>

        {error && <div className="notice error">{error}</div>}

        <div className="field">
          <label>E-mail ou Usuário (opcional)</label>
          <input
            type="text"
            placeholder="admin@viralizougoiania.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Senha de Acesso</label>
          <input
            type="password"
            placeholder="Sua senha de acesso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            autoComplete="current-password"
          />
        </div>

        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={loading}>
          {loading ? "Autenticando..." : "Entrar no Painel"}
        </button>

        <p style={{ fontSize: 12, marginTop: 16, color: "var(--muted)", textAlign: "center" }}>
          Painel restrito para colaboradores e administradores autorizados.
        </p>
      </form>
    </div>
  );
}
