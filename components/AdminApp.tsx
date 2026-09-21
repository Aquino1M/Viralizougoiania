"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TeamManager from "@/components/TeamManager";
import NewsRadar from "@/components/NewsRadar";
import RewriteWorkbench from "@/components/RewriteWorkbench";
import type { Category, ImportedNews, Post, PostStatus, ReviewStatus, RewriteResult, StaffUserPublic } from "@/lib/types";
import { slugify } from "@/lib/slug";

type View = "list" | "form" | "import" | "radar" | "categories" | "users";
type FormState = {
  id?: string; title:string; slug:string; excerpt:string; content:string; category:string;
  city:string; author:string; image_url:string; featured:boolean; status:PostStatus;
  published_at:string; source_name:string; source_url:string;
  source_title:string; source_excerpt:string; source_author:string; source_published_at:string;
  source_content:string; source_word_count:number; source_capture_method:string; source_complete:boolean;
  article_section:string; image_credit:string; seo_title:string; seo_description:string; seo_keywords:string;
  review_status:ReviewStatus; rewrite_similarity:number|null;
};

const empty: FormState = {
  title:"", slug:"", excerpt:"", content:"", category:"Goiânia", city:"Goiânia",
  author:"Redação Viralizougoiania", image_url:"", featured:false, status:"published",
  published_at:"", source_name:"", source_url:"",
  source_title:"", source_excerpt:"", source_author:"", source_published_at:"",
  source_content:"", source_word_count:0, source_capture_method:"", source_complete:true,
  article_section:"", image_credit:"", seo_title:"", seo_description:"", seo_keywords:"",
  review_status:"not_required", rewrite_similarity:null
};

function localDateTime(v:string|null|undefined){
  if(!v) return "";
  const d=new Date(v), pad=(n:number)=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
}
function statusLabel(s:PostStatus){return s==="draft"?"Rascunho":s==="scheduled"?"Agendada":"Publicada";}

const LOCAL_POSTS_KEY="viralizougoiania.browser-posts.v1";

function readBrowserPosts():Post[]{
  if(typeof window==="undefined")return [];
  try{
    const raw=window.localStorage.getItem(LOCAL_POSTS_KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed:[];
  }catch{return [];}
}

function writeBrowserPosts(posts:Post[]){
  if(typeof window==="undefined")return;
  window.localStorage.setItem(LOCAL_POSTS_KEY,JSON.stringify(posts));
}

function newLocalId(){
  const id=typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  return "local-"+id;
}

function saveBrowserPost(form:FormState):Post{
  const posts=readBrowserPosts();
  const existing=form.id?.startsWith("local-")?posts.find(p=>p.id===form.id):undefined;
  const now=new Date().toISOString();
  const publishedAt=form.status==="draft"?null:(form.published_at?new Date(form.published_at).toISOString():now);
  const sourcePublishedAt=form.source_published_at?new Date(form.source_published_at).toISOString():null;
  const post:Post={
    id:existing?.id||newLocalId(),
    slug:form.slug||slugify(form.title),
    title:form.title,
    excerpt:form.excerpt,
    content:form.content,
    category:form.category,
    city:form.city,
    author:form.author,
    image_url:form.image_url,
    featured:form.featured,
    status:form.status,
    published_at:publishedAt,
    source_name:form.source_name,
    source_url:form.source_url,
    source_title:form.source_title,
    source_excerpt:form.source_excerpt,
    source_author:form.source_author,
    source_published_at:sourcePublishedAt,
    source_content:form.source_content,
    source_word_count:form.source_word_count,
    source_capture_method:form.source_capture_method,
    source_complete:form.source_complete,
    article_section:form.article_section,
    image_credit:form.image_credit,
    seo_title:form.seo_title,
    seo_description:form.seo_description,
    seo_keywords:form.seo_keywords,
    review_status:form.review_status,
    rewrite_similarity:form.rewrite_similarity,
    created_at:existing?.created_at||now,
    updated_at:now
  };
  const next=existing?posts.map(p=>p.id===post.id?post:p):[post,...posts.filter(p=>p.slug!==post.slug)];
  writeBrowserPosts(next);
  return post;
}

function removeBrowserPost(id:string){
  writeBrowserPosts(readBrowserPosts().filter(p=>p.id!==id));
}

export default function AdminApp(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [currentUser,setCurrentUser]=useState<StaffUserPublic|null>(null);
  const [view,setView]=useState<View>("list");
  const [form,setForm]=useState<FormState>(empty);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [mode,setMode]=useState("");
  const [localCount,setLocalCount]=useState(0);
  const [search,setSearch]=useState("");
  const [importUrl,setImportUrl]=useState("");
  const [importItems,setImportItems]=useState<ImportedNews[]>([]);
  const [categoryName,setCategoryName]=useState("");
  const [drafts,setDrafts]=useState<Record<string,{name:string;slug:string}>>({});
  const router=useRouter();

  async function load(){
    setLoading(true);
    const [pr,cr,mr]=await Promise.all([
      fetch("/api/posts",{cache:"no-store"}),
      fetch("/api/categories",{cache:"no-store"}),
      fetch("/api/auth/me",{cache:"no-store"})
    ]);
    if(pr.status===401||cr.status===401||mr.status===401){router.push("/admin/login");return;}
    const [pd,cd,md]=await Promise.all([pr.json(),cr.json(),mr.json()]);
    const browserPosts=readBrowserPosts();
    const browserIds=new Set(browserPosts.map(p=>p.id));
    const browserSlugs=new Set(browserPosts.map(p=>p.slug));
    const remotePosts=(pd.posts||[]) as Post[];
    const mergedPosts=[
      ...browserPosts,
      ...remotePosts.filter(p=>!browserIds.has(p.id)&&!browserSlugs.has(p.slug))
    ];
    setPosts(mergedPosts);
    setLocalCount(browserPosts.length);
    setCategories(cd.categories||[]);
    setCurrentUser(md.user||null);
    setMode(pd.mode||cd.mode||"");
    setDrafts(Object.fromEntries((cd.categories||[]).map((c:Category)=>[c.id,{name:c.name,slug:c.slug}])));
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const ordered=useMemo(()=>[...categories].sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)),[categories]);
  const filtered=useMemo(()=>posts.filter(p=>(p.title+" "+p.category+" "+p.city).toLowerCase().includes(search.toLowerCase())),[posts,search]);

  function newPost(){
    setForm({...empty,category:ordered.find(c=>c.active)?.name||"Goiânia",author:currentUser?.name||"Redação Viralizougoiania"});
    setMessage(""); setView("form");
  }
  function edit(p:Post){
    setForm({
      ...empty,
      id:p.id,title:p.title,slug:p.slug,excerpt:p.excerpt,content:p.content,category:p.category,city:p.city,author:p.author,
      image_url:p.image_url,featured:p.featured,status:p.status,published_at:localDateTime(p.published_at),
      source_name:p.source_name||"",source_url:p.source_url||"",source_title:p.source_title||"",source_excerpt:p.source_excerpt||"",
      source_author:p.source_author||"",source_published_at:localDateTime(p.source_published_at||null),source_content:p.source_content||"",
      source_word_count:p.source_word_count||0,source_capture_method:p.source_capture_method||"",source_complete:p.source_complete!==false,
      article_section:p.article_section||"",image_credit:p.image_credit||"",seo_title:p.seo_title||"",seo_description:p.seo_description||"",
      seo_keywords:p.seo_keywords||"",review_status:p.review_status||(p.source_content?"unreviewed":"not_required"),
      rewrite_similarity:p.rewrite_similarity??null
    });
    setMessage(""); setView("form");
  }
  async function savePost(e:FormEvent){
    e.preventDefault(); setBusy(true); setMessage("");
    if(form.status==="scheduled"&&!form.published_at){setBusy(false);setMessage("Erro: escolha data e hora do agendamento.");return;}
    if(form.source_content&&form.status!=="draft"&&!form.content.trim()){setBusy(false);setMessage("Erro: gere ou escreva a versão do Viralizougoiania antes de publicar.");return;}
    if(form.source_content&&form.status!=="draft"&&form.review_status!=="reviewed"){
      setBusy(false);setMessage("Erro: marque a matéria importada como revisada pelo jornalista antes de publicar ou agendar.");return;
    }
    const payload={...form,slug:form.slug||slugify(form.title),published_at:form.published_at?new Date(form.published_at).toISOString():undefined};

    if(mode==="readonly-demo"||form.id?.startsWith("local-")){
      saveBrowserPost(form);
      setBusy(false);
      setMessage("Salvo neste navegador. A matéria ficará guardada aqui até o Supabase ser configurado; ela ainda não está publicada para outros visitantes.");
      await load();
      setView("list");
      return;
    }

    const endpoint=form.id?"/api/posts/"+form.id:"/api/posts";
    const r=await fetch(endpoint,{method:form.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json(); setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível salvar"));return;}
    setMessage("Notícia salva com sucesso."); await load(); setView("list"); router.refresh();
  }
  async function deletePost(id:string){
    if(!confirm("Excluir esta notícia?")) return;
    if(id.startsWith("local-")){
      removeBrowserPost(id);
      setMessage("Notícia local excluída deste navegador.");
      await load();
      return;
    }
    const r=await fetch("/api/posts/"+id,{method:"DELETE"}); const d=await r.json();
    if(!r.ok){alert(d.error||"Erro ao excluir");return;} await load(); router.refresh();
  }

  async function syncLocalPosts(){
    const locals=readBrowserPosts();
    if(!locals.length)return;
    if(mode!=="supabase"){setMessage("Erro: configure o Supabase antes de sincronizar.");return;}
    if(!confirm("Enviar "+locals.length+" notícia(s) salvas neste navegador para o banco de dados?"))return;
    setBusy(true);setMessage("");
    try{
      for(const local of locals){
        const {id,created_at,updated_at,...payload}=local;
        const r=await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||"Falha ao sincronizar "+local.title);
      }
      writeBrowserPosts([]);
      setMessage("Notícias locais enviadas para o banco com sucesso.");
      await load();
      router.refresh();
    }catch(e){
      setMessage("Erro: "+(e instanceof Error?e.message:"não foi possível sincronizar"));
    }finally{
      setBusy(false);
    }
  }
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.push("/admin/login");router.refresh();}

  async function importNews(kind:"article"|"feed"){
    if(!importUrl.trim()){setMessage("Erro: cole um link.");return;}
    setBusy(true);setMessage("");setImportItems([]);
    const r=await fetch("/api/import-news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:importUrl,mode:kind})});
    const d=await r.json();setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"falha ao importar"));return;}
    setImportItems(d.items||[]);
    setMessage(String((d.items||[]).length)+" item(ns) encontrado(s).");
    if(kind==="article"&&d.items?.[0]) useImported(d.items[0]);
  }
  function useImported(item:ImportedNews){
    setForm({
      ...empty,
      category:ordered.find(c=>c.active)?.name||"Goiânia",
      author:currentUser?.name||"Redação Viralizougoiania",
      status:"draft",
      title:item.title,
      slug:slugify(item.title),
      excerpt:item.excerpt,
      image_url:item.image_url,
      source_name:item.source_name,
      source_url:item.source_url,
      source_title:item.title,
      source_excerpt:item.excerpt,
      source_author:item.source_author||"",
      source_published_at:localDateTime(item.source_published_at||item.published_at||null),
      source_content:item.source_content||"",
      source_word_count:item.source_word_count||0,
      source_capture_method:item.source_capture_method||"",
      source_complete:item.source_complete!==false,
      article_section:item.article_section||"",
      image_credit:item.image_caption||item.source_name||"",
      review_status:item.source_content?"unreviewed":"not_required"
    });
    setView("form");
    setMessage(item.source_content
      ? "Matéria capturada com "+String(item.source_word_count||0)+" palavras. O original ficou na área interna de apuração; use o reescritor e revise antes de publicar."
      : "Metadados importados, mas o corpo completo não foi identificado. Confira a fonte original.");
  }

  async function createCategory(e:FormEvent){
    e.preventDefault(); if(!categoryName.trim())return;setBusy(true);setMessage("");
    const r=await fetch("/api/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:categoryName,slug:slugify(categoryName),active:true})});
    const d=await r.json();setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"falha ao criar aba"));return;}
    setCategoryName("");setMessage("Aba “"+d.name+"” criada.");await load();router.refresh();
  }
  async function patchCategory(id:string,payload:Record<string,unknown>,ok:string){
    setBusy(true);setMessage("");
    const r=await fetch("/api/categories/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json();setBusy(false);
    if(!r.ok){setMessage("Erro: "+(d.error||"falha ao editar aba"));return false;}
    setMessage(ok);await load();router.refresh();return true;
  }
  async function saveCategory(c:Category){
    const d=drafts[c.id]||{name:c.name,slug:c.slug};
    await patchCategory(c.id,{name:d.name,slug:d.slug},"Aba “"+d.name+"” atualizada.");
  }
  async function move(c:Category,dir:-1|1){
    const i=ordered.findIndex(x=>x.id===c.id),other=ordered[i+dir];if(!other)return;
    setBusy(true);
    await fetch("/api/categories/"+c.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sort_order:other.sort_order})});
    await fetch("/api/categories/"+other.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sort_order:c.sort_order})});
    setBusy(false);setMessage("Ordem das abas atualizada.");await load();router.refresh();
  }
  async function removeCategory(c:Category){
    if(!confirm("Excluir a aba “"+c.name+"”? Se houver notícias nela, a exclusão será bloqueada."))return;
    const r=await fetch("/api/categories/"+c.id,{method:"DELETE"});const d=await r.json();
    if(!r.ok){setMessage("Erro: "+(d.error||"não foi possível excluir"));return;}
    setMessage("Aba excluída.");await load();router.refresh();
  }

  const published=posts.filter(p=>p.status==="published").length;
  const scheduled=posts.filter(p=>p.status==="scheduled").length;
  const roleName=currentUser?.role==="admin"?"Administrador":"Jornalista";

  return <div className="adminShell">
    <div className="adminTop"><div className="container">
      <div><strong>Viralizougoiania • Painel editorial</strong>{currentUser&&<span className="adminUserBadge">{currentUser.name} • {roleName}</span>}</div>
      <div className="actions"><a href="/" target="_blank" className="btn secondary">Ver site</a><button className="btn secondary" onClick={logout}>Sair</button></div>
    </div></div>
    <div className="container adminContent"><div className="adminGrid">
      <aside className="adminSide">
        <a href="#" onClick={e=>{e.preventDefault();setView("list");}}>📰 Notícias</a>
        <a href="#" onClick={e=>{e.preventDefault();newPost();}}>✍️ Nova postagem</a>
        {currentUser?.role==="admin"&&<a href="#" onClick={e=>{e.preventDefault();setView("categories");setMessage("");}}>🗂️ Abas / editorias</a>}
        <a href="#" onClick={e=>{e.preventDefault();setView("radar");setMessage("");}}>📡 Radar Goiás</a>
        <a href="#" onClick={e=>{e.preventDefault();setView("import");setMessage("");}}>🔎 Importar por URL</a>
        {currentUser?.role==="admin"&&<a href="#" onClick={e=>{e.preventDefault();setView("users");setMessage("");}}>👥 Equipe / usuários</a>}
        <a href="/" target="_blank">🌐 Abrir portal</a>
      </aside>
      <main>
        <div className="stats">
          <div className="stat"><b>{posts.length}</b><span>Total</span></div>
          <div className="stat"><b>{published}</b><span>Publicadas</span></div>
          <div className="stat"><b>{scheduled}</b><span>Agendadas</span></div>
          <div className="stat"><b>{ordered.filter(c=>c.active).length}</b><span>Abas ativas</span></div>
        </div>
        {mode==="readonly-demo"&&<div className="notice browserSaveNotice"><b>Modo temporário do navegador.</b> Enquanto o Supabase não estiver configurado, novas matérias são salvas somente neste navegador. {localCount>0&&<span>Você tem <b>{localCount}</b> notícia(s) guardada(s) localmente.</span>}</div>}
        {mode==="supabase"&&localCount>0&&<div className="notice browserSaveNotice"><b>{localCount} notícia(s) local(is) encontrada(s).</b> <button className="btn" disabled={busy} onClick={syncLocalPosts}>Enviar para o banco</button></div>}
        {mode==="local-json"&&<div className="notice">Modo local: notícias, abas e usuários são salvos na pasta <b>data</b>.</div>}
        {message&&<div className={message.startsWith("Erro")?"notice error":"notice"}>{message}</div>}

        {view==="list"&&<section className="panel">
          <div className="toolbar"><div><h1>Notícias</h1><div style={{color:"#68736e",fontSize:13}}>Gerencie publicações, rascunhos e agendamentos.</div></div><button className="btn" onClick={newPost}>+ Nova notícia</button></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, editoria ou região..." style={{width:"100%",padding:11,border:"1px solid #d9e0e6",borderRadius:9,marginBottom:14}}/>
          {loading?<div className="empty">Carregando...</div>:<div style={{overflowX:"auto"}}><table className="postTable"><thead><tr><th>Título</th><th>Editoria</th><th>Status</th><th>Publicação</th><th>Ações</th></tr></thead><tbody>
            {filtered.map(p=><tr key={p.id}><td><b>{p.title}</b>{p.id.startsWith("local-")&&<span className="localOnlyBadge">Só neste navegador</span>}<br/><span style={{color:"#7b858f"}}>{p.city}</span></td><td>{p.category}</td><td><span className={"status "+p.status}>{statusLabel(p.status)}</span></td><td>{p.published_at?new Date(p.published_at).toLocaleString("pt-BR"):"—"}</td><td><div className="actions"><button className="btn secondary" onClick={()=>edit(p)}>Editar</button><button className="btn danger" onClick={()=>deletePost(p.id)}>Excluir</button></div></td></tr>)}
          </tbody></table></div>}
        </section>}

        {view==="categories"&&currentUser?.role==="admin"&&<section className="panel">
          <div className="toolbar"><div><h1>Abas e editorias</h1><div style={{color:"#68736e",fontSize:13}}>Crie, renomeie, reordene ou oculte as abas do menu.</div></div><button className="btn secondary" onClick={()=>setView("list")}>Voltar</button></div>
          <form className="categoryCreate" onSubmit={createCategory}><div><b>Criar nova aba</b><span>Ex.: Saúde, Gastronomia, Concursos...</span></div><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="Nome da nova aba"/><button className="btn" disabled={busy}>+ Criar aba</button></form>
          <div className="categoryAdminList">{ordered.map((c,i)=>{const d=drafts[c.id]||{name:c.name,slug:c.slug};return <article className={"categoryAdminRow "+(c.active?"":"inactive")} key={c.id}>
            <div className="categoryOrder"><button className="orderBtn" disabled={busy||i===0} onClick={()=>move(c,-1)}>↑</button><b>{i+1}</b><button className="orderBtn" disabled={busy||i===ordered.length-1} onClick={()=>move(c,1)}>↓</button></div>
            <div className="categoryEditFields"><label>Nome<input value={d.name} onChange={e=>setDrafts({...drafts,[c.id]:{...d,name:e.target.value,slug:slugify(e.target.value)}})}/></label><label>URL<input value={d.slug} onChange={e=>setDrafts({...drafts,[c.id]:{...d,slug:slugify(e.target.value)}})}/></label></div>
            <div className="categoryState"><span className={c.active?"categoryActive":"categoryInactive"}>{c.active?"Ativa no menu":"Oculta"}</span></div>
            <div className="categoryActions"><button className="btn secondary" disabled={busy} onClick={()=>saveCategory(c)}>Salvar</button><button className="btn secondary" disabled={busy} onClick={()=>patchCategory(c.id,{active:!c.active},c.active?"Aba ocultada.":"Aba ativada.")}>{c.active?"Ocultar":"Ativar"}</button><button className="btn danger" disabled={busy} onClick={()=>removeCategory(c)}>Excluir</button></div>
          </article>})}</div>
          <div className="categoryHelp"><b>Como funciona:</b> abas ativas aparecem automaticamente no topo e no rodapé. Ao renomear uma aba, as notícias vinculadas também mudam de editoria. Uma aba com notícias não pode ser excluída; nesse caso, oculte-a.</div>
        </section>}

        {view==="import"&&<section className="panel">
          <div className="toolbar"><div><h1>Importar notícias</h1><div style={{color:"#68736e",fontSize:13}}>Cole uma matéria ou feed RSS/Atom e leve os dados ao editor.</div></div><button className="btn secondary" onClick={()=>setView("list")}>Voltar</button></div>
          <div className="importBox"><label>Link da matéria, site ou RSS</label><div className="importRow"><input type="url" value={importUrl} onChange={e=>setImportUrl(e.target.value)} placeholder="https://site.com/noticia ou /feed"/><button className="btn" disabled={busy} onClick={()=>importNews("article")}>Importar matéria</button><button className="btn secondary" disabled={busy} onClick={()=>importNews("feed")}>Carregar RSS</button></div><p>O importador lê a página inteira, captura o corpo da matéria como referência interna e leva os metadados ao editor. O texto original fica restrito ao painel; a publicação usa a versão reescrita e revisada.</p></div>
          <div className="importResults">{importItems.map((it,i)=><article className="importCard" key={it.source_url+i}>{it.image_url&&<img src={it.image_proxy_url||it.image_url} alt="" loading="lazy"/>}<div><span className="storyTag">{it.source_name}</span><h3>{it.title}</h3><p>{it.excerpt}</p><div className="importMeta">{it.source_author&&<span>✍️ {it.source_author}</span>}{it.article_section&&<span>🗂️ {it.article_section}</span>}{it.body_detected&&<span>📄 Corpo detectado{it.body_paragraphs?" • "+it.body_paragraphs+" parágrafos":""}</span>}{it.image_proxy_url&&<span>⚡ Imagem otimizada por proxy</span>}</div><div className="actions"><button className="btn" onClick={()=>useImported(it)}>Usar no editor</button><a className="btn secondary" href={it.source_url} target="_blank" rel="noreferrer">Abrir fonte</a></div></div></article>)}</div>
        </section>}

        {view==="radar"&&<NewsRadar onImport={useImported}/>}

        {view==="users"&&currentUser?.role==="admin"&&<TeamManager/>}

        {view==="form"&&<form className="panel" onSubmit={savePost}>
          <div className="toolbar"><div><h1>{form.id?"Editar notícia":"Nova notícia"}</h1><div style={{color:"#68736e",fontSize:13}}>Publique agora, salve como rascunho ou programe.</div></div><button type="button" className="btn secondary" onClick={()=>setView("list")}>Voltar</button></div>
          <div className="formGrid">
            <div className="field full"><label>Título</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value,slug:form.id?form.slug:slugify(e.target.value)})}/></div>
            <div className="field full"><label>Slug / URL</label><input required value={form.slug} onChange={e=>setForm({...form,slug:slugify(e.target.value)})}/></div>
            <div className="field full"><label>Resumo / subtítulo</label><textarea required value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/></div>
            <div className="field"><label>Editoria</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{ordered.map(c=><option key={c.id} value={c.name}>{c.name}{c.active?"":" (oculta)"}</option>)}</select></div>
            <div className="field"><label>Bairro / região</label><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></div>
            <div className="field"><label>Autor / jornalista</label><input value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as PostStatus})}><option value="published">Publicar agora</option><option value="scheduled">Programar publicação</option><option value="draft">Rascunho</option></select></div>
            {form.status==="scheduled"&&<div className="field full scheduleBox"><label>Data e hora programada</label><input required type="datetime-local" value={form.published_at} onChange={e=>setForm({...form,published_at:e.target.value})}/><small>A notícia entra no ar automaticamente quando esse horário chegar.</small></div>}
            <div className="field full"><label>URL da imagem de capa</label><input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://..."/>{form.image_url&&<img src={form.image_url} alt="Prévia" style={{maxWidth:340,borderRadius:10,marginTop:8}}/>}</div>
            {form.source_content?<div className="field full">
              <RewriteWorkbench
                sourceContent={form.source_content}
                sourceName={form.source_name}
                sourceUrl={form.source_url}
                sourceAuthor={form.source_author}
                sourcePublishedAt={form.source_published_at||undefined}
                sourceComplete={form.source_complete}
                sourceWordCount={form.source_word_count}
                sourceCaptureMethod={form.source_capture_method}
                sourceTitle={form.source_title||form.title}
                sourceExcerpt={form.source_excerpt}
                articleSection={form.article_section}
                categories={ordered.filter(c=>c.active).map(c=>c.name)}
                content={form.content}
                reviewStatus={form.review_status}
                similarity={form.rewrite_similarity}
                onContentChange={value=>setForm(prev=>({...prev,content:value}))}
                onReviewChange={value=>setForm(prev=>({...prev,review_status:value}))}
                onRewrite={(result:RewriteResult)=>setForm(prev=>({
                  ...prev,
                  title:result.title||prev.title,
                  slug:slugify(result.title||prev.title),
                  excerpt:result.excerpt||prev.excerpt,
                  content:result.content,
                  category:ordered.some(c=>c.name===result.category)?result.category:prev.category,
                  city:result.city||prev.city,
                  seo_title:result.seo_title||result.title||prev.seo_title,
                  seo_description:result.seo_description||result.excerpt||prev.seo_description,
                  seo_keywords:(result.seo_keywords||[]).join(", "),
                  rewrite_similarity:result.similarity,
                  review_status:"unreviewed"
                }))}
              />
            </div>:<div className="field full"><label>Texto completo</label><textarea className="editorText" required value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Separe os parágrafos com uma linha em branco."/></div>}
            <div className="field"><label>Nome da fonte</label><input value={form.source_name} onChange={e=>setForm({...form,source_name:e.target.value})}/></div>
            <div className="field"><label>Link da fonte</label><input type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})}/></div>
            <div className="field"><label>Crédito da imagem</label><input value={form.image_credit} onChange={e=>setForm({...form,image_credit:e.target.value})} placeholder="Ex.: Reprodução/G1 ou nome do fotógrafo"/></div>
            <div className="field"><label>Autor na fonte</label><input value={form.source_author} onChange={e=>setForm({...form,source_author:e.target.value})}/></div>
            <div className="field full seoBox"><label>SEO</label><div className="seoGrid">
              <input value={form.seo_title} onChange={e=>setForm({...form,seo_title:e.target.value})} placeholder="Título SEO"/>
              <input value={form.seo_keywords} onChange={e=>setForm({...form,seo_keywords:e.target.value})} placeholder="Palavras-chave separadas por vírgula"/>
              <textarea value={form.seo_description} onChange={e=>setForm({...form,seo_description:e.target.value})} placeholder="Descrição SEO"/>
            </div></div>
            {form.status!=="scheduled"&&<div className="field"><label>Data de publicação (opcional)</label><input type="datetime-local" value={form.published_at} onChange={e=>setForm({...form,published_at:e.target.value})}/></div>}
            <div className="field"><label>Destaque principal</label><div className="checkRow"><input id="featured" type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/><label htmlFor="featured">Mostrar como manchete principal</label></div></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}><button type="button" className="btn secondary" onClick={()=>setView("list")}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Salvando...":form.status==="draft"?"Salvar rascunho":form.status==="scheduled"?"Agendar notícia":"Publicar notícia"}</button></div>
        </form>}
      </main>
    </div></div>
  </div>;
}
