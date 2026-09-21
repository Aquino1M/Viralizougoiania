import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicArticle from "@/components/PublicArticle";
import { getPostBySlug, getPosts } from "@/lib/storage";
import { proxyImageUrl } from "@/lib/image-proxy";
import type { PublicPost } from "@/lib/public-posts";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const p=await getPostBySlug(slug);
  if(!p)return {title:"Notícia | Viralizougoiania"};
  const title=p.seo_title||p.title;
  const description=p.seo_description||p.excerpt;
  const keywords=(p.seo_keywords||"").split(",").map(v=>v.trim()).filter(Boolean);
  return {title,description,keywords,openGraph:{title,description,images:p.image_url?[p.image_url]:[]}};
}

export default async function Article({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const [found,all]=await Promise.all([getPostBySlug(slug),getPosts()]);
  const prepared:PublicPost[]=all.map(p=>({...p,display_image_url:p.image_url?proxyImageUrl(p.image_url,1000):""}));
  const serverPost:PublicPost|null=found?{...found,display_image_url:found.image_url?proxyImageUrl(found.image_url,1600):""}:null;
  return <><Header breakingTitle={all[0]?.title}/><PublicArticle slug={slug} serverPost={serverPost} initialPosts={prepared}/><Footer/></>;
}
