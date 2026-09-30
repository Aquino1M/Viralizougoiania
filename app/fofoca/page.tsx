import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPosts } from "@/lib/storage";

export const revalidate = 60;

const getFofocaPosts = unstable_cache(
  async () => {
    const direct = await getPosts({ category: "Fofocas", limit: 36 });
    if (direct.length > 0) return direct;

    const fallback = await getPosts({ limit: 120 });
    return fallback
      .filter((p) => {
        const category = (p.category || "").toLowerCase();
        return category.includes("fofoc") || category.includes("celebrid") || category.includes("famoso");
      })
      .slice(0, 36);
  },
  ["public-fofoca-posts-v2"],
  { revalidate: 60 }
);

export const metadata: Metadata = {
  title: "Fofoca | Viralizougoiania",
  description: "Famosos, celebridades, realities e bastidores em notícias 100% nativas no Viralizougoiania."
};

export default async function FofocaPage() {
  const fofocaPosts = (await getFofocaPosts()).filter(
    (p) => p.status === "published" && Boolean(p.image_url && p.image_url.trim())
  );

  const lead = fofocaPosts[0];

  return (
    <>
      <Header breakingTitle={lead?.title} />
      <main className="gossipPage">
        <section className="gossipHero">
          <div className="container gossipHeroInner">
            <div>
              <span>✨ FAMOSOS • REALITIES • BASTIDORES</span>
              <h1>Fofoca</h1>
              <p>Celebridades, televisão, redes sociais e tudo que está repercutindo agora em primeira mão.</p>
            </div>
            <div className="gossipBubble">👀 <b>Tá todo mundo falando</b></div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="sectionHead">
              <div>
                <span className="sectionLabel">EXCLUSIVO NO PORTAL</span>
                <h2>Últimas fofocas e celebridades</h2>
              </div>
            </div>

            {fofocaPosts.length > 0 ? (
              <div className="cardGrid">
                {fofocaPosts.map((p) => (
                  <NewsCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <div className="empty">
                Nenhuma notícia de fofoca publicada no momento. Fique atento às novas publicações!
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
