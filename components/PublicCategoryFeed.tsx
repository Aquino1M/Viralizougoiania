"use client";

import { useEffect, useMemo, useState } from "react";
import ClientNewsCard from "@/components/ClientNewsCard";
import type { PublicPost } from "@/lib/public-posts";
import { mergePublishedPosts, readPublishedLocalPosts } from "@/lib/public-posts";

export default function PublicCategoryFeed({initialPosts,canonical}:{initialPosts:PublicPost[];canonical:string}){
  const [localPosts,setLocalPosts]=useState<PublicPost[]>([]);
  useEffect(()=>{
    const refresh=()=>setLocalPosts(readPublishedLocalPosts());
    refresh();
    window.addEventListener("storage",refresh);
    window.addEventListener("viralizougoiania:posts",refresh as EventListener);
    return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener("viralizougoiania:posts",refresh as EventListener);};
  },[]);
  const posts=useMemo(
    ()=>mergePublishedPosts(initialPosts,localPosts).filter(p=>p.category.toLowerCase()===canonical.toLowerCase()),
    [initialPosts,localPosts,canonical]
  );
  return <main>
    <div className="categoryHero"><div className="container">
      <div className="kicker">Editoria local</div><h1>{canonical}</h1>
      <p>Notícias e atualizações de {canonical.toLowerCase()} com foco em Goiânia.</p>
      <span>{posts.length} {posts.length===1?"matéria publicada":"matérias publicadas"}</span>
    </div></div>
    <section className="section"><div className="container">
      {posts.length?<div className="cardGrid categoryGrid">{posts.map(p=><ClientNewsCard key={p.id} post={p}/>)}</div>:<div className="empty">Ainda não há notícias publicadas nesta editoria.</div>}
    </div></section>
  </main>;
}
