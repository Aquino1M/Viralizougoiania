"use client";

import Link from "next/link";
import type { PublicPost } from "@/lib/public-posts";
import { postImage } from "@/lib/public-posts";

function date(v:string|null){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()));
}

export default function ClientNewsCard({post}:{post:PublicPost}){
  return <article className="newsCard">
    <Link href={"/noticia/"+post.slug} className="cardImage">
      <img src={postImage(post)} alt="" loading="lazy" decoding="async"/>
      <span>{post.category}</span>
    </Link>
    <div className="cardBody">
      <Link href={"/noticia/"+post.slug}><h3>{post.title}</h3></Link>
      <p>{post.excerpt}</p>
      <div className="meta"><b>{post.city}</b><span>•</span>{date(post.published_at)}</div>
    </div>
  </article>;
}
