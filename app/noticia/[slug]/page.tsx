import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { getPostBySlug, getPosts } from "@/lib/storage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPostBySlug(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.excerpt,
    openGraph: {
      title: p.title,
      description: p.excerpt,
      type: "article",
      publishedTime: p.published_at || p.created_at,
      images: p.image_url ? [{ url: p.image_url, width: 1200, height: 630, alt: p.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.excerpt,
      images: p.image_url ? [p.image_url] : [],
    },
  };
}

function fmt(v: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v || Date.now()));
}

function safeSourceUrl(value?: string) {
  if (!value) return "";
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.toString() : "";
  } catch {
    return "";
  }
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>
    </svg>
  );
}

function VideoEmbed({ url }: { url: string }) {
  if (!url) return null;

  // 1. YouTube
  const yt = url.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (yt) {
    return (
      <div className="articleVideoWrapper">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
          title="Vídeo da matéria"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Globoplay / Vídeos G1
  const globo = url.match(/https?:\/\/globoplay\.globo\.com\/v\/(\d+)/i) || url.match(/\/v\/(\d+)/i);
  if (globo) {
    return (
      <div className="articleVideoWrapper">
        <iframe
          src={`https://globoplay.globo.com/v/${globo[1]}/`}
          title="Vídeo da matéria"
          allowFullScreen
        />
      </div>
    );
  }

  // 3. Arquivo MP4 direto
  if (url.endsWith(".mp4") || url.includes(".mp4?")) {
    return (
      <div className="articleVideoWrapper">
        <video controls playsInline preload="metadata" src={url} style={{ width: "100%", borderRadius: 12 }}>
          Seu navegador não suporta reprodução direta de vídeo.
        </video>
      </div>
    );
  }

  // 4. Link externo
  return (
    <div className="articleVideoLinkBox">
      <span>🎬 <b>Esta matéria possui vídeo:</b></span>
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="btnVideoWatch">
        Assistir vídeo na fonte original
      </a>
    </div>
  );
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await getPostBySlug(slug);
  if (!found) {
    notFound();
    return null;
  }
  const post = found;
  const all = await getPosts();
  const paras = post.content.split(/\n\n+/).filter(Boolean);
  const sourceUrl = safeSourceUrl(post.source_url);
  const related = all
    .filter((p) => p.id !== post.id && (p.category === post.category || p.city === post.city))
    .slice(0, 3);

  const shareText = `*${post.title}*\n\nLeia a matéria completa no Viralizougoiania:\n`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: {
      "@type": "Person",
      name: post.source_author || post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Viralizougoiania",
      logo: {
        "@type": "ImageObject",
        url: "https://viralizougoiania.com.br/favicon.svg",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header breakingTitle={all[0]?.title} />
      <main>
        <article className="article">
          <div className="articleBreadcrumb">
            <Link href="/">Início</Link>
            <span>›</span>
            <Link href={`/categoria/${encodeURIComponent(post.category.toLowerCase())}`}>
              {post.category}
            </Link>
          </div>

          <div className="kicker">
            {post.category} • {post.city}
          </div>
          <h1>{post.title}</h1>
          <p className="lead">{post.excerpt}</p>

          <div className="articleMeta">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span>
                Por <b>{post.author}</b>
                {post.source_author && (
                  <span style={{ color: "#047857", marginLeft: 6, fontWeight: 700 }}>
                    • Reportagem: <b>{post.source_author}</b>
                  </span>
                )}
              </span>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Publicado em {fmt(post.published_at)}
              </span>
            </div>
          </div>

          {/* Botão de Compartilhar no WhatsApp no topo do artigo */}
          <div className="articleShareTop">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btnShareWhatsapp"
              title="Compartilhar no WhatsApp"
            >
              <WhatsAppIcon /> Compartilhar no WhatsApp
            </a>
          </div>

          {post.image_url && (
            <>
              <img className="articleCover" src={post.image_url} alt={post.title} />
              <div className="imageCaption">{post.image_credit || "Imagem via link • Viralizougoiania"}</div>
            </>
          )}

          {/* Player de Vídeo caso a matéria tenha vídeo */}
          {post.video_url && (
            <div style={{ margin: "20px 0" }}>
              <VideoEmbed url={post.video_url} />
            </div>
          )}

          <div className="articleBody">
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Caixa de Compartilhamento no rodapé da notícia */}
          <div className="articleShareBottom">
            <div>
              <b>Gostou desta matéria?</b>
              <p>Envie agora para seus amigos e grupos de Goiânia no WhatsApp!</p>
            </div>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btnShareWhatsapp"
            >
              <WhatsAppIcon /> Enviar pelo WhatsApp
            </a>
          </div>

          {(sourceUrl || post.source_author) && (
            <div className="sourceBox">
              {post.source_author && (
                <div style={{ marginBottom: 6, color: "#1e293b", fontSize: 13 }}>
                  <b>Créditos da apuração / Reportagem original:</b> {post.source_author}
                </div>
              )}
              {sourceUrl && (
                <div>
                  <b>Fonte consultada:</b>{" "}
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {post.source_name || new URL(sourceUrl).hostname}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="articleEnd">
            <span>V</span>
            <div>
              <b>Viralizougoiania</b>
              <small>Notícia local de Goiânia, rápida, direta e verificada.</small>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="section relatedSection">
            <div className="container">
              <div className="sectionHead">
                <div>
                  <span className="sectionLabel">Continue lendo</span>
                  <h2>Mais de Goiânia</h2>
                </div>
              </div>
              <div className="cardGrid">
                {related.map((p) => (
                  <NewsCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
