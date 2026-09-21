"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm(){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  async function submit(e:FormEvent){
    e.preventDefault();
    setLoading(true);
    setError("");
    const r=await fetch("/api/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username,password})
    });
    const data=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){setError(data.error||"Não foi possível entrar.");return;}
    router.push("/admin");
    router.refresh();
  }

  return <div className="loginWrap">
    <form className="loginCard" onSubmit={submit}>
      <div className="brandLogo"><span className="brandMark" aria-hidden="true"><i></i><i></i><i></i></span><span className="brandWords"><b>Viralizou</b><strong>goiania</strong></span></div>
      <h1>Painel editorial</h1>
      <p>Entre com seu usuário da equipe para publicar e gerenciar as notícias de Goiânia.</p>
      {error&&<div className="notice error">{error}</div>}
      <div className="field"><label>Login</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" autoFocus required placeholder="Seu usuário"/></div>
      <div className="field" style={{marginTop:12}}><label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required placeholder="Sua senha"/></div>
      <button className="btn" style={{width:"100%",marginTop:16}} disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
      <p className="loginHelp">O acesso é individual. Administradores podem cadastrar jornalistas e outros administradores dentro do painel.</p>
    </form>
  </div>;
}
