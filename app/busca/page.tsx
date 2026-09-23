import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const allPosts = await getPosts();

  const results = term
    ? allPosts.filter((p) => {
        const query = term.toLowerCase();
        return (
          p.title.toLowerCase().includes(query) ||
          p.excerpt.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <>
      <Header breakingTitle={allPosts[0]?.title} />
      <main>
        <div className="categoryHero">
          <div className="container">
            <div className="kicker">Busca no portal</div>
            <h1>{term ? `Resultados para "${term}"` : "Buscar notícias"}</h1>
            <p>
              {term
                ? `Encontramos ${results.length} ${
                    results.length === 1 ? "matéria relacionada" : "matérias relacionadas"
                  }.`
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
