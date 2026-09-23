import Link from "next/link";
import type { Post } from "@/lib/types";
function date(v:string|null){return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()))}
export default function NewsCard({post}:{post:Post}){return <article className="newsCard"><Link href={`/noticia/${post.slug}`} className="cardImage"><img src={post.image_url||"https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80"} alt="" /><span>{post.category}</span></Link><div className="cardBody"><Link href={`/noticia/${post.slug}`}><h3>{post.title}</h3></Link><p>{post.excerpt}</p><div className="meta"><b>{post.city}</b><span>•</span>{date(post.published_at)}</div></div></article>}
