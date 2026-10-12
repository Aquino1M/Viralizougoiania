import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getCategories, getPosts } from "@/lib/storage";
import { isGoiasOrigin } from "@/lib/category-classifier";
import type { Category, Post } from "@/lib/types";
import Link from "next/link";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const FALLBACK_IMG = "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1600&q=85";

function safeImg(url?: string | null): string {
  if (url && typeof url === "string" && url.trim().length > 10) return url;
  return FALLBACK_IMG;
}

const getHomePosts = unstable_cache(
  async (): Promise<Post[]> => {
    const posts = await getPosts({ limit: 200, summaryOnly: true });
    return posts;
  },
  ["public-home-posts-v10"],
  { revalidate: 30, tags: ["public-home-posts", "public-home-posts-v10"] }
);

const getHomeCategories = unstable_cache(
  async (): Promise<Category[]> => getCategories(),
  ["public-home-categories-v5"],
  { revalidate: 300 }
);

function fmt(v: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v || Date.now()));
}

export default async function Home() {
  const [posts, categories]: [Post[], Category[]] = await Promise.all([getHomePosts(), getHomeCategories()]);

  // Filtra notícias de Goiânia e Goiás com prioridade máxima
  const goiasPosts = posts.filter((p) => isGoiasOrigin(p));
  const otherPosts = posts.filter((p) => !goiasPosts.some((gp) => gp.id === p.id));

  // A lista mestra SEMPRE inclui as de Goiás na frente e NUNCA descarta as outras!
  const displayPosts = [...goiasPosts, ...otherPosts];

  // Destaque principal do Hero: prioriza o destaque marcado ou matéria de Goiás
  const featured =
    goiasPosts.find((p) => p.featured) ||
    displayPosts.find((p) => p.featured) ||
    goiasPosts[0] ||
    displayPosts[0];

  // Secundárias do Hero: 2 matérias garantidas
  const secondaryCandidates = displayPosts.filter((p) => p.id !== featured?.id);
  const secondary = secondaryCandidates.slice(0, 2);
  const heroIds = new Set([featured?.id, ...secondary.map((s) => s.id)].filter(Boolean));

  // Goiânia Agora: 4 matérias dinâmicas
  const agoraCandidates = displayPosts.filter((p) => !heroIds.has(p.id));
  const agora = agoraCandidates.slice(0, 4);
  const agoraIds = new Set(agora.map((a) => a.id));

  // Cidade em pauta: O assunto que movimenta Goiânia (política local, segurança, bairros)
  // Garante exatamente 3 posts para preencher o grid sem buracos
  const cityCandidates = displayPosts.filter(
    (p) => !heroIds.has(p.id) && !agoraIds.has(p.id) && (isGoiasOrigin(p) || ["Goiânia", "Política", "Segurança", "Bairros"].includes(p.category))
  );
  const cityFiller = displayPosts.filter((p) => !heroIds.has(p.id) && !agoraIds.has(p.id));
  const cityPosts = [...cityCandidates, ...cityFiller].filter(
    (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
  ).slice(0, 3);
  const cityIds = new Set(cityPosts.map((c) => c.id));

  // Futebol: 3 matérias
  const footballPosts = displayPosts.filter(
    (p) => !heroIds.has(p.id) && (p.category?.toLowerCase() === "futebol" || p.category?.toLowerCase() === "esportes")
  ).slice(0, 3);

  // Fofocas: 3 matérias
  const fofocaPosts = displayPosts.filter(
    (p) => !heroIds.has(p.id) && (p.category?.toLowerCase().includes("fofoc") || p.category?.toLowerCase().includes("celebrid"))
  ).slice(0, 3);

  // Conjunto de posts já utilizados nos blocos de destaque superiores
  const usedForTop = new Set([...heroIds, ...agoraIds, ...cityIds]);

  // Últimas notícias: 8 matérias garantidas
  const latestCandidates = displayPosts.filter((p) => !usedForTop.has(p.id));
  const latest = (latestCandidates.length >= 8 ? latestCandidates : displayPosts.filter((p) => p.id !== featured?.id)).slice(0, 8);

  // Mais lidas: 6 matérias
  const trending = displayPosts.slice(0, 6);

  return (
    <>
      <Header breakingTitle={featured?.title || displayPosts[0]?.title} />
      <main>
        <section className="heroSection">
          <div className="container">
            <div className="cityEyebrow">
              <span>●</span> O que está acontecendo em Goiânia agora
            </div>
            {featured ? (
              <div className="leadGrid">
                <Link href={`/noticia/${featured.slug}`} className="leadStory">
                  <img
                    src={safeImg(featured.image_url)}
                    alt={featured.title}
                    fetchPriority="high"
                    decoding="async"
                  />
                  <div className="leadOverlay" />
                  <div className="leadContent">
                    <div className="storyTag">{featured.category}</div>
                    <h1>{featured.title}</h1>
                    <p>{featured.excerpt}</p>
                    <div className="leadMeta">
                      {featured.city} <span>•</span> {fmt(featured.published_at)}
                    </div>
                  </div>
                </Link>
                <div className="leadSide">
                  {secondary.map((p, i) => (
                    <Link href={`/noticia/${p.slug}`} key={p.id} className="miniLead">
                      <div className="miniImage">
                        <img
                          src={safeImg(p.image_url)}
                          alt={p.title}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                        />
                        <span>{i === 0 ? "Destaque" : "Mais lida"}</span>
                      </div>
                      <div className="storyTag">{p.category}</div>
                      <h2>{p.title}</h2>
                      <div className="meta">
                        <b>{p.city}</b>
                        <span>•</span>
                        {fmt(p.published_at)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: "48px 24px", background: "#f8fafc", borderRadius: 16 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#475569" }}>
                  Nenhuma notícia publicada ainda.
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>
                  Acesse o painel administrativo para criar ou importar matérias para a capa.
                </p>
              </div>
            )}
          </div>
        </section>

        {agora.length > 0 && (
          <section className="nowSection">
            <div className="container nowGrid">
              <div className="nowTitle">
                <span className="liveDot"></span>
                <b>
                  GOIÂNIA
                  <br />
                  AGORA
                </b>
              </div>
              {agora.map((p) => (
                <Link key={p.id} href={`/noticia/${p.slug}`} className="nowItem">
                  <time>{fmt(p.published_at)}</time>
                  <span>{p.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {cityPosts.length > 0 && (
          <section className="section spotlightSection">
            <div className="container">
              <div className="sectionHead lightHead">
                <div>
                  <span className="sectionLabel">Cidade em pauta</span>
                  <h2>O assunto que movimenta Goiânia</h2>
                </div>
              </div>
              <div className="spotlightGrid">
                {cityPosts.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/noticia/${p.slug}`}
                    className={`spotlightCard ${i === 0 ? "spotlightMain" : ""}`}
                  >
                    <img
                      src={safeImg(p.image_url)}
                      alt={p.title}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                    <div className="spotlightShade" />
                    <div className="spotlightContent">
                      <span>{p.category}</span>
                      <h3>{p.title}</h3>
                      <small>
                        {p.city} • {fmt(p.published_at)}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bloco de Futebol & Clubes Goianos */}
        {footballPosts.length > 0 && (
          <section className="section" style={{ background: "#f8fafc", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
            <div className="container">
              <div className="sectionHead">
                <div>
                  <span className="sectionLabel">⚽ TRIO GOIANO & BRASILEIRÃO</span>
                  <h2>Futebol & Esportes</h2>
                </div>
                <Link href="/futebol" style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)" }}>Ver cobertura completa ➔</Link>
              </div>
              <div className="cardGrid">
                {footballPosts.map((p) => (
                  <NewsCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bloco de Fofocas & Entretenimento */}
        {fofocaPosts.length > 0 && (
          <section className="section">
            <div className="container">
              <div className="sectionHead">
                <div>
                  <span className="sectionLabel">✨ CELEBRIDADES & ENTRETENIMENTO</span>
                  <h2>Fofoca & Famosos</h2>
                </div>
                <Link href="/fofoca" style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)" }}>Ver todos os babados ➔</Link>
              </div>
              <div className="cardGrid">
                {fofocaPosts.map((p) => (
                  <NewsCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <div className="sectionHead">
              <div>
                <span className="sectionLabel">Em atualização</span>
                <h2>Últimas notícias</h2>
              </div>
            </div>
            <div className="latestLayout">
              <div className="latestList">
                {latest.map((p) => (
                  <article className="latestItem" key={p.id}>
                    <Link href={`/noticia/${p.slug}`} className="latestThumb">
                      <img
                        src={safeImg(p.image_url)}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                    </Link>
                    <div>
                      <div className="storyTag">{p.category}</div>
                      <Link href={`/noticia/${p.slug}`}>
                        <h3>{p.title}</h3>
                      </Link>
                      <p>{p.excerpt}</p>
                      <div className="meta">
                        <b>{p.city}</b>
                        <span>•</span>
                        {fmt(p.published_at)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="sidebarBox">
                <div className="sidebarTitle">
                  <span>🔥</span>
                  <div>
                    <small>NO MOMENTO</small>
                    <h3>Mais lidas</h3>
                  </div>
                </div>
                <ol>
                  {trending.map((p, i) => (
                    <li key={p.id}>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <Link href={`/noticia/${p.slug}`}>{p.title}</Link>
                    </li>
                  ))}
                </ol>
                <div className="serviceCard">
                  <span>📍</span>
                  <div>
                    <b>Tem uma notícia?</b>
                    <p>Conte o que está acontecendo no seu bairro.</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="categoriesBand">
          <div className="container">
            <span>Explore por editoria</span>
            <div>
              {categories.map((c) => (
                <Link key={c.id} href={`/categoria/${c.slug}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
