import Link from "next/link";
import type { Post } from "@/lib/types";

function date(v: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v || Date.now()));
}

function getLocalBadge(post: Post): { text: string; isUrgent: boolean } | null {
  const combined = `${post.city || ""} ${post.title} ${post.category}`.toLowerCase();

  if (combined.includes("aparecida")) {
    return { text: "APARECIDA", isUrgent: true };
  }
  if (
    combined.includes("trânsito") ||
    combined.includes("eixo anhanguera") ||
    combined.includes("t-63") ||
    combined.includes("br-153")
  ) {
    return { text: "🚦 TRÂNSITO GO", isUrgent: true };
  }
  if (
    combined.includes("bueno") ||
    combined.includes("campinas") ||
    combined.includes("marista") ||
    combined.includes("noroeste") ||
    combined.includes("jardim goiás") ||
    combined.includes("jardim goias") ||
    combined.includes("finsocial")
  ) {
    const match = combined.match(/(bueno|campinas|marista|jardim goiás|jardim goias|noroeste)/i);
    return { text: match ? `📍 ${match[0].toUpperCase()}` : "📍 BAIRROS", isUrgent: false };
  }
  if (post.city?.toLowerCase().includes("goiânia") || combined.includes("goiânia") || combined.includes("goiania")) {
    return { text: "🚨 GOIÂNIA URGENTE", isUrgent: true };
  }
  if (post.city?.toLowerCase().includes("goiás") || combined.includes("goiás")) {
    return { text: "📍 GOIÁS", isUrgent: false };
  }
  return null;
}

export default function NewsCard({ post }: { post: Post }) {
  const localBadge = getLocalBadge(post);

  return (
    <article className="newsCard">
      <Link href={`/noticia/${post.slug}`} className="cardImage" prefetch={true}>
        <img
          src={post.image_url || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80"}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        <div className="cardBadgesRow">
          <span className="cardCategoryBadge">{post.category}</span>
          {localBadge && (
            <span className={`localUrgentBadge ${localBadge.isUrgent ? "urgentGlow" : "localPill"}`}>
              {localBadge.text}
            </span>
          )}
        </div>

        {/* Indicador de leitura ultra-rápida (AMP / Instant News) */}
        <span className="instantReadBadge" title="Otimizado para 4G/5G · Abertura instantânea">
          ⚡ 1s
        </span>
      </Link>
      <div className="cardBody">
        <Link href={`/noticia/${post.slug}`} prefetch={true}>
          <h3>{post.title}</h3>
        </Link>
        <p>{post.excerpt}</p>
        <div className="meta">
          <b>{post.city}</b>
          <span>•</span>
          {date(post.published_at)}
        </div>
      </div>
    </article>
  );
}
