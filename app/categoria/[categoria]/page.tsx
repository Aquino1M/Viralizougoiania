import { unstable_cache } from "next/cache";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import FootballHub from "@/components/FootballHub";
import { getCategories, getPosts } from "@/lib/storage";
import { getLiveFootballData } from "@/lib/football-sync";
import { slugify } from "@/lib/slug";

export const revalidate = 60;

const getCachedCategories = unstable_cache(
  async () => getCategories({ includeInactive: true }),
  ["public-category-list-v2"],
  { revalidate: 300 }
);

const getCachedCategoryPosts = unstable_cache(
  async (category: string) => getPosts({ category, limit: 36 }),
  ["public-category-posts-v2"],
  { revalidate: 60 }
);

const getCachedFootballData = unstable_cache(
  async () => getLiveFootballData(),
  ["public-category-football-v2"],
  { revalidate: 60 }
);

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const categories = await getCachedCategories();

  const requested = decodeURIComponent(categoria).toLowerCase().trim();
  const configured = categories.find(
    (c) => c.slug.toLowerCase() === requested || slugify(c.name) === slugify(requested)
  );

  const canonical = configured?.name || requested.charAt(0).toUpperCase() + requested.slice(1);
  const isFutebol = requested === "futebol" || canonical.toLowerCase() === "futebol";
  const isFofocas =
    requested === "fofocas" ||
    requested === "fofoca" ||
    canonical.toLowerCase() === "fofocas" ||
    canonical.toLowerCase() === "fofoca";

  const queryCategory = isFutebol ? "Futebol" : isFofocas ? "Fofocas" : canonical;

  let [rawPosts, liveFootballData] = await Promise.all([
    getCachedCategoryPosts(queryCategory),
    isFutebol ? getCachedFootballData() : Promise.resolve(null),
  ]);

  // Compatibilidade com bases antigas que ainda usavam "Fofoca" no singular.
  if (isFofocas && rawPosts.length === 0) {
    rawPosts = await getCachedCategoryPosts("Fofoca");
  }

  const posts = rawPosts
    .filter((p) => {
      if (!p.image_url || p.image_url.trim().length < 10) return false;
      const postCat = (p.category || "").toLowerCase().trim();
      if (isFutebol) return postCat === "futebol";
      if (isFofocas) return postCat === "fofocas" || postCat === "fofoca";
      return postCat === canonical.toLowerCase().trim();
    })
    .slice(0, isFutebol ? 24 : 36)
    .map((p) => (isFutebol ? { ...p, content: "" } : p));

  return (
    <>
      <Header breakingTitle={posts[0]?.title} />
      <main>
        {isFutebol ? (
          <FootballHub posts={posts} liveData={liveFootballData} />
        ) : isFofocas ? (
          <div className="gossipHub">
            <div className="gossipHero">
              <div className="container">
                <div className="gossipBadge">✨ BABADO, FAMOSOS & BASTIDORES</div>
                <h1>Fofocas & Celebridades</h1>
                <p>O que está dando o que falar no mundo dos influencers, famosos e realities, tudo reunido no Viralizougoiania.</p>
                <span className="gossipStats">
                  🔥 {posts.length} {posts.length === 1 ? "fofoca recente" : "fofocas recentes"}
                </span>
              </div>
            </div>

            <section className="section">
              <div className="container">
                {posts.length ? (
                  <div className="cardGrid categoryGrid">
                    {posts.map((p) => (
                      <NewsCard key={p.id} post={p} />
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <p>Ainda não há notícias publicadas nesta editoria de Fofocas.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <>
            <div className="categoryHero">
              <div className="container">
                <div className="kicker">Editoria local</div>
                <h1>{canonical}</h1>
                <p>Notícias e atualizações de {canonical.toLowerCase()} com foco em Goiânia e região.</p>
                <span>{posts.length} {posts.length === 1 ? "matéria recente" : "matérias recentes"}</span>
              </div>
            </div>
            <section className="section">
              <div className="container">
                {posts.length ? (
                  <div className="cardGrid categoryGrid">
                    {posts.map((p) => (
                      <NewsCard key={p.id} post={p} />
                    ))}
                  </div>
                ) : (
                  <div className="empty">Ainda não há notícias publicadas nesta editoria.</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
