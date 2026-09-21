import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getCategories } from "@/lib/storage";

function SearchIcon(){return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}

export default async function Header({ breakingTitle }: { breakingTitle?: string }) {
  const categories = await getCategories();
  return <>
    <div className="utilityBar"><div className="container utilityRow"><span>📍 Goiânia, Goiás</span><span>Notícia local, rápida e direta</span></div></div>
    <header className="siteHeader"><div className="container headerRow">
      <div className="headerTag"><span className="liveDot"></span><span>GOIÂNIA<br/><b>EM TEMPO REAL</b></span></div>
      <BrandLogo />
      <div className="headerActions"><button className="roundIcon" aria-label="Buscar"><SearchIcon/></button><Link className="adminLink" href="/admin">Painel Admin</Link></div>
    </div></header>
    <div className="navWrap"><nav className="container nav"><Link href="/" className="navHome">Início</Link>{categories.map(c=><Link key={c.id} href={`/categoria/${c.slug}`}>{c.name}</Link>)}</nav></div>
    {breakingTitle && <div className="breaking"><div className="container breakingRow"><span className="badgeBreaking"><span className="pulse"></span> AGORA</span><span className="breakingText">{breakingTitle}</span><span className="breakingCity">Goiânia</span></div></div>}
  </>;
}
