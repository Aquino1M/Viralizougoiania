import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FootballHub from "@/components/FootballHub";
import { getPosts } from "@/lib/storage";
import { getLiveFootballData } from "@/lib/football-sync";

export const revalidate = 60;

const getFootballPosts = unstable_cache(
  async () => getPosts({ category: "Futebol", limit: 24 }),
  ["public-football-posts-v2"],
  { revalidate: 60 }
);

const getCachedFootballData = unstable_cache(
  async () => getLiveFootballData(),
  ["public-football-live-v2"],
  { revalidate: 60 }
);

export const metadata: Metadata = {
  title: "Futebol | Viralizougoiania",
  description: "Cobertura completa do futebol brasileiro, clubes, Brasileirão Série A e mercado da bola diretamente no portal.",
};

export default async function FutebolPage() {
  const [allPosts, liveFootballData] = await Promise.all([
    getFootballPosts(),
    getCachedFootballData(),
  ]);

  const posts = allPosts
    .filter((p) => {
      if (!p.image_url || p.image_url.trim().length < 10) return false;
      return (p.category || "").toLowerCase().trim() === "futebol";
    })
    // FootballHub é Client Component; não enviar o corpo completo de cada matéria
    // evita centenas de KB no RSC/HTML ao trocar para a aba Futebol.
    .map((p) => ({ ...p, content: "" }));

  return (
    <>
      <Header breakingTitle={posts[0]?.title} />
      <main>
        <FootballHub posts={posts} liveData={liveFootballData} />
      </main>
      <Footer />
    </>
  );
}
