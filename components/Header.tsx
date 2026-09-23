import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import NavBar from "@/components/NavBar";
import { getCategories } from "@/lib/storage";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default async function Header({ breakingTitle }: { breakingTitle?: string }) {
  const categories = await getCategories();
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <>
      <div className="utilityBar">
        <div className="container utilityRow">
          <span>📍 Goiânia, Goiás • {formattedDate}</span>
          <span>Portal de notícias rápidas da capital e região</span>
        </div>
      </div>

      <header className="siteHeader">
        <div className="container headerRow">
          <div className="headerTag">
            <span className="liveDot"></span>
            <span>
              GOIÂNIA<br />
              <b>EM TEMPO REAL</b>
            </span>
          </div>

          <BrandLogo />

          <div className="headerActions">
            <form action="/busca" method="GET" className="headerSearchForm" role="search">
              <input
                type="search"
                name="q"
                placeholder="Buscar notícias em Goiânia..."
                aria-label="Buscar notícias"
                required
              />
              <button type="submit" className="searchSubmitBtn" aria-label="Pesquisar">
                <SearchIcon />
              </button>
            </form>
          </div>
        </div>
      </header>

      <NavBar categories={categories} />

      {breakingTitle && (
        <div className="breaking">
          <div className="container breakingRow">
            <span className="badgeBreaking">
              <span className="pulse"></span> AGORA
            </span>
            <span className="breakingText">{breakingTitle}</span>
            <span className="breakingCity">Goiânia</span>
          </div>
        </div>
      )}
    </>
  );
}
