import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts, searchArchivedPosts } from "@/lib/storage";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getRecentSearchPool = unstable_cache(
  async () => getPosts({ limit: 300 }),
  ["recent-search-pool-v2"],
  { revalidate: 120 }
);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const recentPool = term ? await getRecentSearchPool() : [];
  const query = term.toLocaleLowerCase("pt-BR");
  const recentResults = term
    ? recentPool.filter((p: { title?: string; excerpt?: string; category?: string; city?: string; content?: string }) => [p.title, p.excerpt, p.category, p.city, p.content].some((value) => (value || "").toLocaleLowerCase("pt-BR").includes(query))).slice(0, 30)
    : [];
  const archiveResults = term ? await searchArchivedPosts(term) : [];
  const seen = new Set(recentResults.map((post: { id: string }) => post.id));
  const results = [...recentResults, ...archiveResults.filter((post: { id: string }) => !seen.has(post.id))].slice(0, 50);

  return (
    <>
      <Header breakingTitle={results[0]?.title} />
      <main>
        <div className="categoryHero">
          <div className="container">
            <div className="kicker">Busca no portal</div>
            <h1>{term ? `Resultados para "${term}"` : "Buscar notícias"}</h1>
            <p>
              {term
                ? `Encontramos ${results.length} ${
                    results.length === 1 ? "matéria relacionada" : "matérias relacionadas"
                  }${archiveResults.length ? ", incluindo notícias do arquivo." : "."}`
                : "Digite uma palavra-chave para encontrar notícias em Goiânia."}
            </p>
          </div>
        </div>

        <section className="section">
          <div className="container">
            {results.length > 0 ? (
              <div className="cardGrid categoryGrid">
                {results.map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="empty">
                {term
                  ? `Nenhuma matéria encontrada com o termo "${term}". Tente buscar por outros termos ou bairros de Goiânia.`
                  : "Nenhum termo pesquisado."}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
