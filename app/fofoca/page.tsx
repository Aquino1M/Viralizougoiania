import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts } from "@/lib/storage";
import { getGossipHeadlines } from "@/lib/vertical-live";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:"Fofoca | Viralizougoiania",
  description:"Famosos, celebridades, realities e A Fazenda em uma editoria especial."
};

const FILTERS=[
  {key:"",label:"Tudo"},
  {key:"leodias",label:"LeoDias"},
  {key:"uol",label:"UOL Splash"},
  {key:"fazenda",label:"A Fazenda"}
];

export default async function FofocaPage({searchParams}:{searchParams:Promise<{fonte?:string}>}){
  const params=await searchParams;
  const filter=String(params.fonte||"");
  const [allPosts,live]=await Promise.all([
    getPosts(),
    getGossipHeadlines(filter||undefined)
  ]);
  const internal=allPosts.filter(p=>p.status==="published"&&p.category.toLowerCase()==="fofoca").slice(0,12);
  const lead=internal[0];

  return <><Header breakingTitle={lead?.title||live[0]?.title}/><main className="gossipPage">
    <section className="gossipHero"><div className="container gossipHeroInner">
      <div><span>✨ FAMOSOS • REALITIES • BASTIDORES</span><h1>Fofoca</h1><p>Celebridades, televisão, redes sociais e tudo que está repercutindo agora.</p></div>
      <div className="gossipBubble">👀<b>Tá todo mundo falando</b></div>
    </div></section>

    <section className="gossipFilters"><div className="container">
      {FILTERS.map(item=><Link key={item.key||"all"} href={item.key?"/fofoca?fonte="+item.key:"/fofoca"} className={(filter===item.key||(!filter&&!item.key))?"gossipFilter active":"gossipFilter"}>{item.label}</Link>)}
    </div></section>

    {lead&&<section className="section gossipOwnSection"><div className="container">
      <div className="sectionHead"><div><span className="sectionLabel">PUBLICADO NO PORTAL</span><h2>Destaques de fofoca</h2></div></div>
      <div className="cardGrid">{internal.slice(0,3).map(p=><NewsCard key={p.id} post={p}/>)}</div>
    </div></section>}

    <section className="section gossipLiveSection"><div className="container">
      <div className="sectionHead"><div><span className="sectionLabel">RADAR DE FAMOSOS</span><h2>{filter==="fazenda"?"A Fazenda":filter==="leodias"?"Portal LeoDias":filter==="uol"?"UOL Splash Celebs":"Últimas de famosos e realities"}</h2></div></div>
      {live.length?<div className="gossipLiveGrid">{live.map((item,i)=><a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer nofollow" className={i===0?"gossipLiveCard gossipLiveLead":"gossipLiveCard"}>
        <div className="gossipLiveImage">{item.image?<img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>✨</span>}<b>{item.source}</b></div>
        <div className="gossipLiveBody">{item.publishedText&&<time>{item.publishedText}</time>}<h3>{item.title}</h3><small>Ver na fonte ↗</small></div>
      </a>)}</div>:<div className="empty">Não foi possível carregar as manchetes externas agora.</div>}
    </div></section>

    {internal.length>3&&<section className="section"><div className="container">
      <div className="sectionHead"><div><span className="sectionLabel">ARQUIVO</span><h2>Mais fofocas no Viralizougoiania</h2></div></div>
      <div className="cardGrid">{internal.slice(3).map(p=><NewsCard key={p.id} post={p}/>)}</div>
    </div></section>}
  </main><Footer/></>;
}
