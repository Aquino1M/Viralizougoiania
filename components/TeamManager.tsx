"use client";

import { FormEvent, useEffect, useState } from "react";
import type { StaffUserPublic, UserRole } from "@/lib/types";

type TeamForm={id?:string;name:string;username:string;password:string;role:UserRole;active:boolean};
const empty:TeamForm={name:"",username:"",password:"",role:"journalist",active:true};

export default function TeamManager(){
  const [users,setUsers]=useState<StaffUserPublic[]>([]);
  const [currentUserId,setCurrentUserId]=useState("");
  const [mode,setMode]=useState("");
  const [form,setForm]=useState<TeamForm>(empty);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const r=await fetch("/api/users",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível carregar a equipe"));return;}
    setUsers(d.users||[]);
    setCurrentUserId(d.current_user_id||"");
    setMode(d.mode||"");
  }
  useEffect(()=>{load();},[]);

  function edit(user:StaffUserPublic){
    setForm({id:user.id,name:user.name,username:user.username,password:"",role:user.role,active:user.active});
    setMessage("");
  }

  async function save(e:FormEvent){
    e.preventDefault();
    if(!form.id&&!form.password){setMessage("Erro: defina uma senha para o novo usuário.");return;}
    setBusy(true);setMessage("");
    const endpoint=form.id?"/api/users/"+form.id:"/api/users";
    const r=await fetch(endpoint,{
      method:form.id?"PATCH":"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(form)
    });
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível salvar"));return;}
    setMessage(form.id?"Usuário atualizado.":"Usuário cadastrado.");
    setForm(empty);
    await load();
  }

  async function toggle(user:StaffUserPublic){
    setBusy(true);setMessage("");
    const r=await fetch("/api/users/"+user.id,{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({active:!user.active})
    });
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível alterar"));return;}
    setMessage(user.active?"Usuário desativado.":"Usuário ativado.");
    await load();
  }

  async function remove(user:StaffUserPublic){
    if(!confirm("Excluir o acesso de “"+user.name+"”?"))return;
    setBusy(true);setMessage("");
    const r=await fetch("/api/users/"+user.id,{method:"DELETE"});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível excluir"));return;}
    setMessage("Usuário excluído.");
    await load();
  }

  return <section className="panel">
    <div className="toolbar"><div><h1>Equipe / Usuários</h1><div style={{color:"#68736e",fontSize:13}}>Cadastre jornalistas e administradores e controle quem pode entrar no painel.</div></div></div>
    {mode==="readonly-demo"&&<div className="notice">Para cadastrar ou alterar usuários na Vercel, configure o Supabase e execute o arquivo <b>supabase/schema.sql</b>.</div>}
    {message&&<div className={message.startsWith("Erro")?"notice error":"notice"}>{message}</div>}

    <form className="teamForm" onSubmit={save}>
      <div className="field"><label>Nome</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Nome do jornalista"/></div>
      <div className="field"><label>Login</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase()})} required placeholder="usuario"/></div>
      <div className="field"><label>{form.id?"Nova senha (opcional)":"Senha"}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required={!form.id} minLength={6} placeholder={form.id?"Deixe vazio para manter":"Mínimo 6 caracteres"}/></div>
      <div className="field"><label>Função</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value as UserRole})}><option value="journalist">Jornalista</option><option value="admin">Administrador</option></select></div>
      <div className="field teamActive"><label>Status</label><div className="checkRow"><input id="team-active" type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><label htmlFor="team-active">Usuário ativo</label></div></div>
      <div className="teamFormActions"><button className="btn" disabled={busy}>{busy?"Salvando...":form.id?"Salvar alterações":"+ Cadastrar usuário"}</button>{form.id&&<button type="button" className="btn secondary" onClick={()=>setForm(empty)}>Cancelar edição</button>}</div>
    </form>

    <div className="teamList">
      {loading?<div className="empty">Carregando equipe...</div>:users.map(user=><article className={"teamUser "+(user.active?"":"inactive")} key={user.id}>
        <div className="teamAvatar">{user.name.slice(0,1).toUpperCase()}</div>
        <div className="teamIdentity"><b>{user.name}</b><span>@{user.username}</span></div>
        <div><span className={user.role==="admin"?"roleAdmin":"roleJournalist"}>{user.role==="admin"?"Administrador":"Jornalista"}</span></div>
        <div><span className={user.active?"categoryActive":"categoryInactive"}>{user.active?"Ativo":"Desativado"}</span></div>
        <div className="categoryActions"><button className="btn secondary" onClick={()=>edit(user)}>Editar</button><button className="btn secondary" disabled={busy||user.id===currentUserId} onClick={()=>toggle(user)}>{user.active?"Desativar":"Ativar"}</button><button className="btn danger" disabled={busy||user.id===currentUserId} onClick={()=>remove(user)}>Excluir</button></div>
      </article>)}
    </div>
    <div className="categoryHelp"><b>Permissões:</b> administradores gerenciam a equipe e todo o conteúdo. Jornalistas podem entrar no painel, criar, editar, importar e publicar notícias, mas não têm acesso à administração de usuários.</div>
  </section>;
}
