import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pesquisar notícias" };

function normalize(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}

export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const params=await searchParams;
  const query=String(params.q||"").trim();
  const posts=await getPosts();

  const term=normalize(query);
  const results=term ? posts
    .map(post=>{
      const title=normalize(post.title);
      const searchable=normalize([post.title,post.excerpt,post.content,post.category,post.city,post.author].join(" "));
      let score=0;
      if(title===term) score+=100;
      if(title.startsWith(term)) score+=60;
      if(title.includes(term)) score+=40;
      if(normalize(post.category).includes(term)) score+=18;
      if(normalize(post.city).includes(term)) score+=16;
      if(searchable.includes(term)) score+=10;
      const words=term.split(/\s+/).filter(Boolean);
      score+=words.filter(w=>searchable.includes(w)).length*3;
      return {post,score};
    })
    .filter(item=>item.score>0)
    .sort((a,b)=>b.score-a.score || +new Date(b.post.published_at||b.post.created_at)-+new Date(a.post.published_at||a.post.created_at))
    .map(item=>item.post) : [];

  return <><Header breakingTitle={posts[0]?.title}/><main>
    <section className="searchHero"><div className="container">
      <div className="sectionLabel">Busca</div>
      <h1>{query ? `Resultados para “${query}”` : "Pesquisar notícias"}</h1>
      <form className="searchPageForm" action="/buscar" method="get">
        <input type="search" name="q" defaultValue={query} placeholder="Ex.: trânsito, Setor Bueno, empregos..." aria-label="Pesquisar notícias" required/>
        <button type="submit">Pesquisar</button>
      </form>
      {query&&<p className="searchCount">{results.length} {results.length===1?"notícia encontrada":"notícias encontradas"}</p>}
    </div></section>

    <section className="section"><div className="container">
      {!query ? <div className="empty">Digite um assunto acima para procurar nas notícias publicadas.</div>
      : results.length ? <div className="cardGrid categoryGrid">{results.map(post=><NewsCard key={post.id} post={post}/>)}</div>
      : <div className="empty"><b>Nenhuma notícia encontrada.</b><br/>Tente usar menos palavras ou procurar pelo nome de um bairro, editoria ou assunto.</div>}
    </div></section>
  </main><Footer/></>;
}
