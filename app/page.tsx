import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getCategories, getPosts } from "@/lib/storage";
import { inferLocation, isGoiasOrigin } from "@/lib/category-classifier";
import Link from "next/link";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const getHomePosts = unstable_cache(
  async () => getPosts({ limit: 80 }),
  ["public-home-posts-v3"],
  { revalidate: 60 }
);

const getHomeCategories = unstable_cache(
  async () => getCategories(),
  ["public-home-categories-v3"],
  { revalidate: 300 }
);
function fmt(v:string|null){return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(v||Date.now()))}

export default async function Home(){
 const [posts,categories]=await Promise.all([getHomePosts(),getHomeCategories()]);

 const goiasPosts = posts.filter(p => isGoiasOrigin(p));

 // Destaque principal do Hero: prioriza o post em destaque de Goiânia/Goiás
 const featured = goiasPosts.find(p => p.featured) || goiasPosts[0] || posts.find(p => p.featured) || posts[0];
 
 // Secundárias do Hero: notícias de Goiânia/Goiás
 const secondaryCandidates = goiasPosts.filter(p => p.id !== featured?.id);
 const secondary = (secondaryCandidates.length >= 2 ? secondaryCandidates : posts.filter(p => p.id !== featured?.id)).slice(0, 2);

 const heroIds = new Set([featured?.id, ...secondary.map(s => s.id)].filter(Boolean));

 // Goiânia Agora: pautas locais de Goiás/Goiânia
 const agoraCandidates = goiasPosts.filter(p => !heroIds.has(p.id));
 const agora = (agoraCandidates.length >= 4 ? agoraCandidates : posts.filter(p => !heroIds.has(p.id))).slice(0, 4);

 const latest = posts.slice(0, 7);

 // Goiânia e seus bairros: pautas de bairros, trânsito ou serviços locais de Goiânia. Nunca matérias nacionais!
 const bairroCandidates = goiasPosts.filter(
   p => p.category === "Bairros" || inferLocation(p).isBairro || ["Trânsito", "Serviços"].includes(p.category)
 );
 const bairroPosts = (bairroCandidates.length >= 3 ? bairroCandidates : goiasPosts).slice(0, 3);

 // Cidade em pauta: O assunto que movimenta Goiânia (política local, segurança local ou pautas municipais)
 const cityCandidates = goiasPosts.filter(
   p => !heroIds.has(p.id) && ["Goiânia", "Política", "Segurança"].includes(p.category)
 );
 const cityPosts = (cityCandidates.length >= 3 ? cityCandidates : goiasPosts.filter(p => !heroIds.has(p.id))).slice(0, 3);
 return <><Header breakingTitle={featured?.title || posts[0]?.title}/><main>
  <section className="heroSection"><div className="container">
   <div className="cityEyebrow"><span>●</span> O que está acontecendo em Goiânia agora</div>
   {featured ? <div className="leadGrid">
     <Link href={`/noticia/${featured.slug}`} className="leadStory"><img src={featured.image_url} alt="" fetchPriority="high"/><div className="leadOverlay"/><div className="leadContent"><div className="storyTag">{featured.category}</div><h1>{featured.title}</h1><p>{featured.excerpt}</p><div className="leadMeta">{featured.city} <span>•</span> {fmt(featured.published_at)}</div></div></Link>
     <div className="leadSide">{secondary.map((p,i)=><Link href={`/noticia/${p.slug}`} key={p.id} className="miniLead"><div className="miniImage"><img src={p.image_url} alt="" loading="lazy" decoding="async" fetchPriority="low"/><span>{i===0?"Destaque":"Mais lida"}</span></div><div className="storyTag">{p.category}</div><h2>{p.title}</h2><div className="meta"><b>{p.city}</b><span>•</span>{fmt(p.published_at)}</div></Link>)}</div>
   </div>:<div className="empty">Nenhuma notícia publicada ainda.</div>}
  </div></section>

  {agora.length>0&&<section className="nowSection"><div className="container nowGrid"><div className="nowTitle"><span className="liveDot"></span><b>GOIÂNIA<br/>AGORA</b></div>{agora.map(p=><Link key={p.id} href={`/noticia/${p.slug}`} className="nowItem"><time>{fmt(p.published_at)}</time><span>{p.title}</span></Link>)}</div></section>}

  <section className="section"><div className="container"><div className="sectionHead"><div><span className="sectionLabel">Perto de você</span><h2>Goiânia e seus bairros</h2></div><Link href="/categoria/bairros">Ver mais notícias <span>→</span></Link></div><div className="cardGrid">{(bairroPosts.length?bairroPosts:posts.slice(0,3)).map(p=><NewsCard key={p.id} post={p}/>)}</div></div></section>

  <section className="section spotlightSection"><div className="container"><div className="sectionHead lightHead"><div><span className="sectionLabel">Cidade em pauta</span><h2>O assunto que movimenta Goiânia</h2></div></div><div className="spotlightGrid">{(cityPosts.length?cityPosts:posts.slice(0,3)).map((p,i)=><Link key={p.id} href={`/noticia/${p.slug}`} className={`spotlightCard ${i===0?"spotlightMain":""}`}><img src={p.image_url} alt="" loading="lazy" decoding="async" fetchPriority="low"/><div className="spotlightShade"/><div className="spotlightContent"><span>{p.category}</span><h3>{p.title}</h3><small>{p.city} • {fmt(p.published_at)}</small></div></Link>)}</div></div></section>

  <section className="section"><div className="container"><div className="sectionHead"><div><span className="sectionLabel">Em atualização</span><h2>Últimas notícias</h2></div></div><div className="latestLayout"><div className="latestList">{latest.map(p=><article className="latestItem" key={p.id}><Link href={`/noticia/${p.slug}`} className="latestThumb"><img src={p.image_url} alt="" loading="lazy" decoding="async" fetchPriority="low"/></Link><div><div className="storyTag">{p.category}</div><Link href={`/noticia/${p.slug}`}><h3>{p.title}</h3></Link><p>{p.excerpt}</p><div className="meta"><b>{p.city}</b><span>•</span>{fmt(p.published_at)}</div></div></article>)}</div><aside className="sidebarBox"><div className="sidebarTitle"><span>🔥</span><div><small>NO MOMENTO</small><h3>Mais lidas</h3></div></div><ol>{posts.slice(0,6).map((p,i)=><li key={p.id}><b>{String(i+1).padStart(2,"0")}</b><Link href={`/noticia/${p.slug}`}>{p.title}</Link></li>)}</ol><div className="serviceCard"><span>📍</span><div><b>Tem uma notícia?</b><p>Conte o que está acontecendo no seu bairro.</p></div></div></aside></div></div></section>

  <section className="categoriesBand"><div className="container"><span>Explore por editoria</span><div>{categories.map(c=><Link key={c.id} href={`/categoria/${c.slug}`}>{c.name}</Link>)}</div></div></section>
 </main><Footer/></>;
}
