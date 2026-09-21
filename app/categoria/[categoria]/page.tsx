import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getCategories, getPosts } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export const dynamic="force-dynamic";
export default async function CategoryPage({params}:{params:Promise<{categoria:string}>}){
  const {categoria}=await params;
  const [all,categories]=await Promise.all([getPosts(),getCategories({includeInactive:true})]);
  const requested=decodeURIComponent(categoria);
  const configured=categories.find(c=>c.slug===requested || slugify(c.name)===slugify(requested));
  const canonical=configured?.name || requested.charAt(0).toUpperCase()+requested.slice(1);
  const posts=all.filter(p=>p.category.toLowerCase()===canonical.toLowerCase());
  return <><Header breakingTitle={all[0]?.title}/><main>
    <div className="categoryHero"><div className="container"><div className="kicker">Editoria local</div><h1>{canonical}</h1><p>Notícias e atualizações de {canonical.toLowerCase()} com foco em Goiânia.</p><span>{posts.length} {posts.length===1?"matéria publicada":"matérias publicadas"}</span></div></div>
    <section className="section"><div className="container">{posts.length?<div className="cardGrid categoryGrid">{posts.map(p=><NewsCard key={p.id} post={p}/>)}</div>:<div className="empty">Ainda não há notícias publicadas nesta editoria.</div>}</div></section>
  </main><Footer/></>;
}
