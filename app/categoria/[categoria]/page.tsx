import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicCategoryFeed from "@/components/PublicCategoryFeed";
import { getCategories, getPosts } from "@/lib/storage";
import { slugify } from "@/lib/slug";
import { proxyImageUrl } from "@/lib/image-proxy";
import type { PublicPost } from "@/lib/public-posts";

export const dynamic="force-dynamic";

export default async function CategoryPage({params}:{params:Promise<{categoria:string}>}){
  const {categoria}=await params;
  const [all,categories]=await Promise.all([getPosts(),getCategories({includeInactive:true})]);
  const requested=decodeURIComponent(categoria);
  const configured=categories.find(c=>c.slug===requested||slugify(c.name)===slugify(requested));
  const canonical=configured?.name||requested.charAt(0).toUpperCase()+requested.slice(1);
  const prepared:PublicPost[]=all.map(p=>({...p,display_image_url:p.image_url?proxyImageUrl(p.image_url,900):""}));
  return <><Header breakingTitle={all[0]?.title}/><PublicCategoryFeed initialPosts={prepared} canonical={canonical}/><Footer/></>;
}
