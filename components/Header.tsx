import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import NavBar from "@/components/NavBar";
import HeaderSearch from "@/components/HeaderSearch";
import { getCategories } from "@/lib/storage";
import { unstable_cache } from "next/cache";

const getHeaderCategories = unstable_cache(
  async () => getCategories(),
  ["public-header-categories-v1"],
  { revalidate: 300 }
);

export default async function Header({ breakingTitle }: { breakingTitle?: string }) {
  const categories = await getHeaderCategories();
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
            <HeaderSearch />
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
