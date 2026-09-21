import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import SearchBox from "@/components/SearchBox";
import { getCategories } from "@/lib/storage";

export default async function Header({ breakingTitle }: { breakingTitle?: string }) {
  const categories = await getCategories();
  return <>
    <div className="utilityBar"><div className="container utilityRow"><span>📍 Goiânia, Goiás</span><span>Notícia local, rápida e direta</span></div></div>
    <header className="siteHeader"><div className="container headerRow">
      <div className="headerTag"><span className="liveDot"></span><span>GOIÂNIA<br/><b>EM TEMPO REAL</b></span></div>
      <BrandLogo />
      <div className="headerActions"><SearchBox /></div>
    </div></header>
    <div className="navWrap"><nav className="container nav"><Link href="/" className="navHome">Início</Link>{categories.map(c=><Link key={c.id} href={`/categoria/${c.slug}`}>{c.name}</Link>)}</nav></div>
    {breakingTitle && <div className="breaking"><div className="container breakingRow"><span className="badgeBreaking"><span className="pulse"></span> AGORA</span><span className="breakingText">{breakingTitle}</span><span className="breakingCity">Goiânia</span></div></div>}
  </>;
}
