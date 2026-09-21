import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getCategories } from "@/lib/storage";

export default async function Footer(){
  const categories = await getCategories();
  return <footer className="footer"><div className="container"><div className="footerGrid"><div><BrandLogo/><p>O que acontece em Goiânia, do seu bairro para a cidade inteira.</p><div className="footerBadge">📍 Goiânia • Goiás</div></div><div><h4>Editorias</h4>{categories.slice(0,6).map(c=><Link key={c.id} href={`/categoria/${c.slug}`}>{c.name}</Link>)}</div><div><h4>Viralizougoiania</h4><Link href="/">Página inicial</Link><Link href="/admin">Painel administrativo</Link><span className="footerSmall">Portal independente de notícias locais.</span></div></div><div className="footerBottom">© {new Date().getFullYear()} Viralizougoiania. Todos os direitos reservados.</div></div></footer>
}
