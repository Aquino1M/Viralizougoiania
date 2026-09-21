import Link from "next/link";
import type { Post } from "@/lib/types";
import { proxyImageUrl } from "@/lib/image-proxy";

function date(v:string|null){return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()))}

export default function NewsCard({post}:{post:Post}){
  const original=post.image_url||"https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";
  return <article className="newsCard"><Link href={`/noticia/${post.slug}`} className="cardImage"><img src={proxyImageUrl(original,760)} alt="" loading="lazy" decoding="async"/><span>{post.category}</span></Link><div className="cardBody"><Link href={`/noticia/${post.slug}`}><h3>{post.title}</h3></Link><p>{post.excerpt}</p><div className="meta"><b>{post.city}</b><span>•</span>{date(post.published_at)}</div></div></article>
}
