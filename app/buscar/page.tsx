import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicSearchResults from "@/components/PublicSearchResults";
import { getPosts } from "@/lib/storage";
import { proxyImageUrl } from "@/lib/image-proxy";
import type { PublicPost } from "@/lib/public-posts";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Pesquisar notícias"};

export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const params=await searchParams;
  const query=String(params.q||"").trim();
  const posts=await getPosts();
  const prepared:PublicPost[]=posts.map(p=>({...p,display_image_url:p.image_url?proxyImageUrl(p.image_url,900):""}));
  return <><Header breakingTitle={posts[0]?.title}/><PublicSearchResults initialPosts={prepared} query={query}/><Footer/></>;
}
