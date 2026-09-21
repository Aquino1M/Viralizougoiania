import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPostBySlug, getPosts } from "@/lib/storage";
import { proxyImageUrl } from "@/lib/image-proxy";
import { notFound } from "next/navigation";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const p=await getPostBySlug(slug);
  if(!p)return {};
  return {title:p.title,description:p.excerpt,openGraph:{title:p.title,description:p.excerpt,images:p.image_url?[p.image_url]:[]}};
}

function fmt(v:string|null){return new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()))}
function safeSourceUrl(value?:string){if(!value)return "";try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.toString():""}catch{return ""}}

export default async function Article({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const found=await getPostBySlug(slug);
  if(!found){notFound();return null;}
  const post=found;
  const all=await getPosts();
  const paras=post.content.split(/\n\n+/).filter(Boolean);
  const sourceUrl=safeSourceUrl(post.source_url);
  const related=all.filter(p=>p.id!==post.id&&(p.category===post.category||p.city===post.city)).slice(0,3);

  return <><Header breakingTitle={all[0]?.title}/><main>
    <article className="article">
      <div className="articleBreadcrumb"><Link href="/">Início</Link><span>›</span><Link href={`/categoria/${encodeURIComponent(post.category.toLowerCase())}`}>{post.category}</Link></div>
      <div className="kicker">{post.category} • {post.city}</div><h1>{post.title}</h1><p className="lead">{post.excerpt}</p>
      <div className="articleMeta"><span>Por <b>{post.author}</b></span><span>Publicado em {fmt(post.published_at)}</span></div>
      {post.image_url&&<><img className="articleCover" src={proxyImageUrl(post.image_url,1600)} alt="" fetchPriority="high" decoding="async"/><div className="imageCaption">Imagem de capa da matéria • Viralizougoiania</div></>}
      <div className="articleBody">{paras.map((p,i)=><p key={i}>{p}</p>)}</div>
      {sourceUrl&&<div className="sourceBox"><b>Fonte consultada:</b> <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{post.source_name||new URL(sourceUrl).hostname}</a></div>}
      <div className="articleEnd"><span>V</span><div><b>Viralizougoiania</b><small>Notícia local, rápida e direta.</small></div></div>
    </article>
    {related.length>0&&<section className="section relatedSection"><div className="container"><div className="sectionHead"><div><span className="sectionLabel">Continue lendo</span><h2>Mais de Goiânia</h2></div></div><div className="cardGrid">{related.map(p=><NewsCard key={p.id} post={p}/>)}</div></div></section>}
  </main><Footer/></>;
}
