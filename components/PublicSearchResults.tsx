"use client";

import { useEffect, useMemo, useState } from "react";
import ClientNewsCard from "@/components/ClientNewsCard";
import type { PublicPost } from "@/lib/public-posts";
import { mergePublishedPosts, readPublishedLocalPosts } from "@/lib/public-posts";

function normalize(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}

export default function PublicSearchResults({initialPosts,query}:{initialPosts:PublicPost[];query:string}){
  const [localPosts,setLocalPosts]=useState<PublicPost[]>([]);
  useEffect(()=>{
    const refresh=()=>setLocalPosts(readPublishedLocalPosts());
    refresh();
    window.addEventListener("storage",refresh);
    window.addEventListener("viralizougoiania:posts",refresh as EventListener);
    return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener("viralizougoiania:posts",refresh as EventListener);};
  },[]);

  const results=useMemo(()=>{
    const posts=mergePublishedPosts(initialPosts,localPosts);
    const term=normalize(query);
    if(!term)return [];
    return posts.map(post=>{
      const title=normalize(post.title);
      const searchable=normalize([post.title,post.excerpt,post.content,post.category,post.city,post.author].join(" "));
      let score=0;
      if(title===term)score+=100;
      if(title.startsWith(term))score+=60;
      if(title.includes(term))score+=40;
      if(normalize(post.category).includes(term))score+=18;
      if(normalize(post.city).includes(term))score+=16;
      if(searchable.includes(term))score+=10;
      const words=term.split(/\s+/).filter(Boolean);
      score+=words.filter(w=>searchable.includes(w)).length*3;
      return {post,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||+new Date(b.post.published_at||b.post.created_at)-+new Date(a.post.published_at||a.post.created_at)).map(x=>x.post);
  },[initialPosts,localPosts,query]);

  return <main>
    <section className="searchHero"><div className="container">
      <div className="sectionLabel">Busca</div>
      <h1>{query ? "Resultados para “"+query+"”" : "Pesquisar notícias"}</h1>
      <form className="searchPageForm" action="/buscar" method="get">
        <input type="search" name="q" defaultValue={query} placeholder="Ex.: trânsito, Setor Bueno, empregos..." aria-label="Pesquisar notícias" required/>
        <button type="submit">Pesquisar</button>
      </form>
      {query&&<p className="searchCount">{results.length} {results.length===1?"notícia encontrada":"notícias encontradas"}</p>}
    </div></section>
    <section className="section"><div className="container">
      {!query?<div className="empty">Digite um assunto acima para procurar nas notícias publicadas.</div>
      :results.length?<div className="cardGrid categoryGrid">{results.map(post=><ClientNewsCard key={post.id} post={post}/>)}</div>
      :<div className="empty"><b>Nenhuma notícia encontrada.</b><br/>Tente usar menos palavras ou procurar pelo nome de um bairro, editoria ou assunto.</div>}
    </div></section>
  </main>;
}
