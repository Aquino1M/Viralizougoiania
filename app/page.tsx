import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicHomeFeed from "@/components/PublicHomeFeed";
import { getCategories, getPosts } from "@/lib/storage";
import { proxyImageUrl } from "@/lib/image-proxy";
import type { PublicPost } from "@/lib/public-posts";

export const dynamic = "force-dynamic";

export default async function Home(){
  const [posts,categories]=await Promise.all([getPosts(),getCategories()]);
  const prepared:PublicPost[]=posts.map(p=>({...p,display_image_url:p.image_url?proxyImageUrl(p.image_url,1400):""}));
  return <><Header breakingTitle={posts[0]?.title}/><PublicHomeFeed initialPosts={prepared} categories={categories}/><Footer/></>;
}
