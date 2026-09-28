import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FootballHub from "@/components/FootballHub";
import { getPosts } from "@/lib/storage";
import { getLiveFootballData } from "@/lib/football-sync";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Futebol | Viralizougoiania",
  description: "Cobertura completa do futebol brasileiro, clubes, Brasileirão Série A e mercado da bola diretamente no portal.",
};

export default async function FutebolPage() {
  const [allPosts, liveFootballData] = await Promise.all([
    getPosts(),
    getLiveFootballData(),
  ]);

  // Filtra apenas matérias nativas de Futebol com foto válida (sem links externos)
  const posts = allPosts.filter((p) => {
    if (!p.image_url || p.image_url.trim().length < 10) return false;
    const postCat = (p.category || "").toLowerCase().trim();
    return postCat === "futebol";
  });

  return (
    <>
      <Header breakingTitle={posts[0]?.title || allPosts[0]?.title} />
      <main>
        <FootballHub posts={posts} liveData={liveFootballData} />
      </main>
      <Footer />
    </>
  );
}
