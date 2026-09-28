import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import FootballHub from "@/components/FootballHub";
import { getCategories, getPosts } from "@/lib/storage";
import { getLiveFootballData } from "@/lib/football-sync";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const [all, categories] = await Promise.all([
    getPosts(),
    getCategories({ includeInactive: true }),
  ]);

  const requested = decodeURIComponent(categoria).toLowerCase().trim();
  const configured = categories.find(
    (c) => c.slug.toLowerCase() === requested || slugify(c.name) === slugify(requested)
  );

  const canonical = configured?.name || requested.charAt(0).toUpperCase() + requested.slice(1);
  const isFutebol = requested === "futebol" || canonical.toLowerCase() === "futebol";
  const isFofocas = requested === "fofocas" || requested === "fofoca" || canonical.toLowerCase() === "fofocas";

  // Se for Futebol, carrega os dados ao vivo e atualizados da tabela e rodadas
  const liveFootballData = isFutebol ? await getLiveFootballData() : null;

  // Filtra as matérias da categoria (garantindo que matérias sem foto nunca sejam exibidas)
  const posts = all.filter((p) => {
    if (!p.image_url || p.image_url.trim().length < 10) return false;
    const postCat = (p.category || "").toLowerCase().trim();
    if (isFutebol) {
      return postCat === "futebol";
    }
    if (isFofocas) {
      return postCat === "fofocas" || postCat === "fofoca";
    }
    return postCat === canonical.toLowerCase().trim();
  });

  return (
    <>
      <Header breakingTitle={all[0]?.title} />
      <main>
        {isFutebol ? (
          /* ABA DEDICADA DE FUTEBOL COM SELETOR DE TIMES, MINI TABELA E NOTÍCIAS NATIVAS */
          <FootballHub posts={posts} liveData={liveFootballData} />
        ) : isFofocas ? (
          /* ABA DEDICADA DE FOFOCAS & FAMOSOS */
          <div className="gossipHub">
            <div className="gossipHero">
              <div className="container">
                <div className="gossipBadge">✨ BABADO, FAMOSOS & BASTIDORES</div>
                <h1>Fofocas & Celebridades</h1>
                <p>O que está dando o que falar no mundo dos influencers, famosos e realities, tudo reunido no Viralizougoiania.</p>
                <span className="gossipStats">
                  🔥 {posts.length} {posts.length === 1 ? "fofoca publicada" : "fofocas publicadas"}
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
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                      Use a aba &quot;Fofocas & Famosos&quot; no Radar do painel para puxar as notícias mais quentes do momento com 1 clique!
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* DEMAIS CATEGORIAS */
          <>
            <div className="categoryHero">
              <div className="container">
                <div className="kicker">Editoria local</div>
                <h1>{canonical}</h1>
                <p>Notícias e atualizações de {canonical.toLowerCase()} com foco em Goiânia e região.</p>
                <span>{posts.length} {posts.length === 1 ? "matéria publicada" : "matérias publicadas"}</span>
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
