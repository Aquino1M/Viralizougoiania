import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";

import { getCategories, getPosts } from "@/lib/storage";
import { isGoiasOrigin } from "@/lib/category-classifier";
import type { Category, Post } from "@/lib/types";
import Link from "next/link";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const getHomePosts = unstable_cache(
  async (): Promise<Post[]> => {
    const [goiasList, recentList] = await Promise.all([
      getPosts({ category: "Goiânia", limit: 60, summaryOnly: true }),
      getPosts({ limit: 120, summaryOnly: true }),
    ]);
    const map = new Map<string, Post>();
    for (const p of goiasList) map.set(p.id, p);
    for (const p of recentList) if (!map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  },
  ["public-home-posts-v8"],
  { revalidate: 60, tags: ["public-home-posts", "public-home-posts-v8"] }
);

const getHomeCategories = unstable_cache(
  async (): Promise<Category[]> => getCategories(),
  ["public-home-categories-v4"],
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
  // Preenche a página inteira com todas as notícias disponíveis para NUNCA ficar vazia.
  const displayPosts = [...goiasPosts, ...otherPosts];

  // Destaque principal do Hero: prioriza o destaque marcado ou matéria de Goiás
  const featured =
    goiasPosts.find((p) => p.featured) ||
    displayPosts.find((p) => p.featured) ||
    goiasPosts[0] ||
    displayPosts[0];

  // Secundárias do Hero: 2 matérias
  const secondary = displayPosts.filter((p) => p.id !== featured?.id).slice(0, 2);
  const heroIds = new Set([featured?.id, ...secondary.map((s) => s.id)].filter(Boolean));

  // Goiânia Agora: 4 matérias dinâmicas (prioriza Goiás, preenche com as demais)
  const agoraCandidates = goiasPosts.filter((p) => !heroIds.has(p.id));
  const agora = (
    agoraCandidates.length >= 4
      ? agoraCandidates
      : [...agoraCandidates, ...otherPosts.filter((p) => !heroIds.has(p.id))]
  ).slice(0, 4);

  // Cidade em pauta: O assunto que movimenta Goiânia (política local, segurança, bairros)
  const cityCandidates = displayPosts.filter(
    (p) => !heroIds.has(p.id) && (isGoiasOrigin(p) || ["Goiânia", "Política", "Segurança", "Bairros"].includes(p.category))
  );
  const cityPosts = (
    cityCandidates.length >= 3
      ? cityCandidates
      : displayPosts.filter((p) => !heroIds.has(p.id))
  ).slice(0, 3);

  // Últimas notícias: 7 matérias
  const usedForTop = new Set([...heroIds, ...agora.map((a) => a.id), ...cityPosts.map((c) => c.id)]);
  const latestCandidates = displayPosts.filter((p) => !usedForTop.has(p.id));
  const latest = (latestCandidates.length >= 7 ? latestCandidates : displayPosts.filter((p) => !heroIds.has(p.id))).slice(0, 7);

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
                    src={featured.image_url}
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
                          src={p.image_url}
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

        <section className="section spotlightSection">
          <div className="container">
            <div className="sectionHead lightHead">
              <div>
                <span className="sectionLabel">Cidade em pauta</span>
                <h2>O assunto que movimenta Goiânia</h2>
              </div>
            </div>
            <div className="spotlightGrid">
              {(cityPosts.length ? cityPosts : displayPosts.slice(0, 3)).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/noticia/${p.slug}`}
                  className={`spotlightCard ${i === 0 ? "spotlightMain" : ""}`}
                >
                  <img
                    src={p.image_url}
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
                        src={p.image_url}
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
