import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts } from "@/lib/storage";
import { FOOTBALL_TEAMS, getBrasileiraoTable, getFootballHeadlines, postMatchesTeam } from "@/lib/vertical-live";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:"Futebol | Viralizougoiania",
  description:"Notícias de futebol, times, Brasileirão e mercado da bola."
};

export default async function FutebolPage({searchParams}:{searchParams:Promise<{time?:string}>}){
  const params=await searchParams;
  const selected=FOOTBALL_TEAMS.find(t=>t.slug===String(params.time||""));
  const [allPosts,live,standings]=await Promise.all([
    getPosts(),
    getFootballHeadlines(selected?.slug),
    getBrasileiraoTable()
  ]);

  const footballTerms=/\b(futebol|seleção brasileira|selecao brasileira|brasileir[aã]o|libertadores|sul-americana|copa do brasil|campeonato|jogo|partida|gol|flamengo|palmeiras|corinthians|santos|vasco|botafogo|fluminense|são paulo|sao paulo|cruzeiro|atlético-mg|atletico-mg|grêmio|gremio|internacional|bahia|athletico|coritiba|mirassol|bragantino|remo|chapecoense|vitória|vitoria)\b/i;
  const published=allPosts.filter(p=>{
    if(p.status!=="published")return false;
    if(p.category==="Futebol")return true;
    if(p.category!=="Esportes")return false;
    return footballTerms.test([p.title,p.excerpt,p.content].join(" "));
  });
  const internal=published.filter(p=>postMatchesTeam([p.title,p.excerpt,p.content].join(" "),selected)).slice(0,9);
  const hero=internal[0];
  const liveTitle=selected?("Notícias do "+selected.name):"Radar do futebol brasileiro";

  return <><Header breakingTitle={hero?.title||live[0]?.title}/><main className="footballPage">
    <section className="footballHero">
      <div className="container footballHeroInner">
        <div>
          <span className="footballEyebrow">⚽ VIRALIZOUGOIANIA FUTEBOL</span>
          <h1>{selected?selected.name:"Futebol"}</h1>
          <p>{selected?"Acompanhe as notícias mais recentes do "+selected.name+" em um só lugar.":"Clubes, Brasileirão, mercado da bola e tudo que movimenta o futebol brasileiro."}</p>
        </div>
        <div className="footballHeroBadge"><b>SÉRIE A</b><span>Tabela atualizada</span></div>
      </div>
    </section>

    <section className="teamStripWrap">
      <div className="container">
        <div className="teamStrip">
          <Link className={!selected?"teamChip active":"teamChip"} href="/futebol"><b>BR</b><span>Todos</span></Link>
          {FOOTBALL_TEAMS.map(team=><Link key={team.slug} className={selected?.slug===team.slug?"teamChip active":"teamChip"} href={"/futebol?time="+team.slug}>
            <b>{team.short}</b><span>{team.name}</span>
          </Link>)}
        </div>
      </div>
    </section>

    <section className="section footballMainSection"><div className="container footballMainGrid">
      <div>
        <div className="sectionHead footballSectionHead"><div><span className="sectionLabel">EM TEMPO REAL</span><h2>{liveTitle}</h2></div></div>
        {internal.length>0&&<div className="footballInternalGrid">{internal.slice(0,3).map(p=><NewsCard key={p.id} post={p}/>)}</div>}

        <div className="liveFootballList">
          {live.length?live.map((item,i)=><a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="liveFootballCard">
            <div className="liveFootballThumb">
              {item.image?<img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>{selected?.short||"⚽"}</span>}
            </div>
            <div className="liveFootballBody">
              <div className="liveSourceRow"><span>{item.source}</span>{item.publishedText&&<time>{item.publishedText}</time>}</div>
              <h3>{item.title}</h3>
              <small>Abrir notícia na fonte ↗</small>
            </div>
          </a>):<div className="empty">Não foi possível carregar o radar externo agora.</div>}
        </div>
      </div>

      <aside className="brasileiraoPanel">
        <div className="brasileiraoHead"><div><span>CAMPEONATO BRASILEIRO</span><h2>Série A 2026</h2></div><b>CLASSIFICAÇÃO</b></div>
        {standings.length?<div className="standingsScroll"><table className="standingsTable">
          <thead><tr><th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead>
          <tbody>{standings.map(row=><tr key={row.position+"-"+row.team} className={selected&&row.team.toLocaleLowerCase("pt-BR").includes(selected.name.split("-")[0].toLocaleLowerCase("pt-BR"))?"selectedTeamRow":""}>
            <td><b>{row.position}</b></td><td className="standTeam"><span>{row.abbr}</span><strong>{row.team}</strong></td><td><b>{row.points}</b></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalDiff}</td>
          </tr>)}</tbody>
        </table></div>:<div className="standingsUnavailable">Tabela temporariamente indisponível.</div>}
        <a className="tableSourceLink" href="https://www.lance.com.br/tabela/brasileirao" target="_blank" rel="noopener noreferrer nofollow">Fonte da classificação: Lance! ↗</a>
      </aside>
    </div></section>

    {internal.length>3&&<section className="section footballOwnNews"><div className="container">
      <div className="sectionHead"><div><span className="sectionLabel">VIRALIZOUGOIANIA</span><h2>Mais notícias publicadas</h2></div></div>
      <div className="cardGrid">{internal.slice(3).map(p=><NewsCard key={p.id} post={p}/>)}</div>
    </div></section>}
  </main><Footer/></>;
}
