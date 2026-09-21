"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClientNewsCard from "@/components/ClientNewsCard";
import type { PublicPost } from "@/lib/public-posts";
import { mergePublishedPosts, postImage, readPublishedLocalPosts } from "@/lib/public-posts";

function fmt(v:string|null){
  return new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()));
}
function safeSourceUrl(value?:string){
  if(!value)return "";
  try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.toString():"";}catch{return "";}
}

export default function PublicArticle({slug,serverPost,initialPosts}:{slug:string;serverPost:PublicPost|null;initialPosts:PublicPost[]}){
  const [localPosts,setLocalPosts]=useState<PublicPost[]>([]);
  useEffect(()=>{
    const refresh=()=>setLocalPosts(readPublishedLocalPosts());
    refresh();
    window.addEventListener("storage",refresh);
    window.addEventListener("viralizougoiania:posts",refresh as EventListener);
    return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener("viralizougoiania:posts",refresh as EventListener);};
  },[]);

  const all=useMemo(()=>mergePublishedPosts(initialPosts,localPosts),[initialPosts,localPosts]);
  const post=localPosts.find(p=>p.slug===slug)||serverPost;
  if(!post)return <main><section className="section"><div className="container"><div className="empty"><b>Notícia não encontrada.</b><br/>Ela pode ter sido removida ou ainda não foi publicada.</div></div></section></main>;

  const paras=post.content.split(/\n\n+/).map(p=>p.trim()).filter(Boolean);
  const sourceUrl=safeSourceUrl(post.source_url);
  const related=all.filter(p=>p.id!==post.id&&(p.category===post.category||p.city===post.city)).slice(0,3);

  return <main>
    <article className="article">
      <div className="articleBreadcrumb"><Link href="/">Início</Link><span>›</span><Link href={"/categoria/"+encodeURIComponent(post.category.toLowerCase())}>{post.category}</Link></div>
      <div className="kicker">{post.category} • {post.city}</div>
      <h1>{post.title}</h1>
      <p className="lead">{post.excerpt}</p>
      <div className="articleMeta"><span>Por <b>{post.author}</b></span><span>Publicado em {fmt(post.published_at)}</span></div>
      {post.image_url&&<>
        <img className="articleCover" src={postImage(post)} alt="" fetchPriority="high" decoding="async"/>
        <div className="imageCaption">{post.image_credit||post.source_name?("Imagem • "+(post.image_credit||("Fonte: "+post.source_name))):"Imagem de capa • Viralizougoiania"}</div>
      </>}
      <div className="articleBody">{paras.map((p,i)=><p key={i}>{p}</p>)}</div>
      {sourceUrl&&<div className="sourceBox">
        <b>Com informações de:</b>{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{post.source_name||new URL(sourceUrl).hostname}</a>
        {post.source_author&&<span> • matéria original por {post.source_author}</span>}
      </div>}
      {post.local_only&&<div className="localArticleNotice">Esta publicação está no modo temporário deste navegador e ainda não foi enviada para o banco de dados.</div>}
      <div className="articleEnd"><span>V</span><div><b>Viralizougoiania</b><small>Notícia local, rápida e direta.</small></div></div>
    </article>
    {related.length>0&&<section className="section relatedSection"><div className="container">
      <div className="sectionHead"><div><span className="sectionLabel">Continue lendo</span><h2>Mais de Goiânia</h2></div></div>
      <div className="cardGrid">{related.map(p=><ClientNewsCard key={p.id} post={p}/>)}</div>
    </div></section>}
  </main>;
}
