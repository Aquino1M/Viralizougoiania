
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { discoverFeed, extractArticleFromHtml, fetchSourcePage, parseFeed } from "@/lib/article-importer";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    const mode = body.mode === "feed" ? "feed" : "article";
    if (!url) return NextResponse.json({ error: "Cole um link para importar." }, { status: 400 });

    const first = await fetchSourcePage(url);

    if (mode === "article") {
      return NextResponse.json({ items: [extractArticleFromHtml(first.text, first.url)] });
    }

    let feedText = first.text;
    let feedUrl = first.url;
    const looksLikeFeed = /<(rss|feed|rdf:RDF)\b/i.test(first.text) || /xml|rss|atom/i.test(first.contentType);

    if (!looksLikeFeed) {
      const discovered = discoverFeed(first.text, first.url);
      if (!discovered) {
        return NextResponse.json(
          { error: "Não encontrei um RSS/Atom nessa página. Cole diretamente o endereço do feed." },
          { status: 400 },
        );
      }
      const feed = await fetchSourcePage(discovered);
      feedText = feed.text;
      feedUrl = feed.url;
    }

    const items = parseFeed(feedText, feedUrl);
    if (!items.length) return NextResponse.json({ error: "Não encontrei notícias nesse feed." }, { status: 400 });

    return NextResponse.json({ items, feed_url: feedUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao importar notícia" },
      { status: 500 },
    );
  }
}
