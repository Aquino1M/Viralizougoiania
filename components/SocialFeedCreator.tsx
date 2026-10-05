"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";

type Props = {
  posts: Post[];
  onBack: () => void;
};

type FeedPost = Pick<Post, "slug" | "title" | "image_url" | "category" | "city" | "created_at" | "updated_at">;

const W = 1080;
const H = 1350;

function slugFromInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://viralizougoiania.vercel.app");
    const parts = url.pathname.split("/").filter(Boolean);
    const noticiaIndex = parts.findIndex((p) => p.toLowerCase() === "noticia");
    if (noticiaIndex >= 0 && parts[noticiaIndex + 1]) return decodeURIComponent(parts[noticiaIndex + 1]);
  } catch {}
  return raw.replace(/^\/+|\/+$/g, "").split("/").pop() || "";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, vertical = 0) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = Math.max(0, (img.naturalWidth - sw) / 2);
  const room = Math.max(0, img.naturalHeight - sh);
  const sy = Math.min(room, Math.max(0, room / 2 + (vertical / 100) * (room / 2)));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 5) {
  for (let size = 78; size >= 48; size -= 2) {
    ctx.font = `800 ${size}px Georgia, "Times New Roman", serif`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = '800 48px Georgia, "Times New Roman", serif';
  const lines = wrapText(ctx, text, maxWidth);
  return { size: 48, lines: lines.slice(0, maxLines) };
}

export default function SocialFeedCreator({ posts, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [articleUrl, setArticleUrl] = useState("");
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [title, setTitle] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [handle, setHandle] = useState("@viralizougoiania");
  const [logoData, setLogoData] = useState("");
  const [imagePosition, setImagePosition] = useState(0);
  const [message, setMessage] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("viralizou_feed_logo") || "";
      const savedHandle = localStorage.getItem("viralizou_feed_handle") || "";
      if (savedLogo) setLogoData(savedLogo);
      if (savedHandle) setHandle(savedHandle);
    } catch {}
  }, []);

  async function renderCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setRendering(true);
    try {
      canvas.width = W;
      canvas.height = H;

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);

      if (selectedPost?.image_url) {
        const img = await loadImage(`/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug)}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`);
        drawCover(ctx, img, 0, 0, W, 930, imagePosition);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, W, 930);
        gradient.addColorStop(0, "#172033");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, 930);
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = "700 38px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Selecione uma notícia do portal", W / 2, 465);
      }

      const overlay = ctx.createLinearGradient(0, 690, 0, 1100);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(0.48, "rgba(0,0,0,.74)");
      overlay.addColorStop(1, "#050505");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 650, W, 520);

      // Logo do jornal: personalizada ou marca textual padrão.
      if (logoData) {
        try {
          const logo = await loadImage(logoData);
          const maxW = 430;
          const maxH = 105;
          const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
          const lw = logo.naturalWidth * scale;
          const lh = logo.naturalHeight * scale;
          ctx.drawImage(logo, (W - lw) / 2, 820 - lh / 2, lw, lh);
        } catch {
          setLogoData("");
        }
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 57px Arial, sans-serif";
        ctx.fillText("VIRALIZOU", W / 2 - 22, 838);
        ctx.fillStyle = "#ff5a1f";
        ctx.font = "900 35px Arial, sans-serif";
        ctx.fillText("GOIÂNIA", W / 2 + 214, 838);
      }

      const headline = (title || selectedPost?.title || "Título da notícia").trim();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      const fitted = fitHeadline(ctx, headline, 920, 5);
      ctx.font = `800 ${fitted.size}px Georgia, "Times New Roman", serif`;

      const lineHeight = fitted.size * 1.07;
      const totalHeight = fitted.lines.length * lineHeight;
      let y = Math.min(1015, Math.max(925, 1060 - totalHeight / 2));

      for (const line of fitted.lines) {
        ctx.fillText(line, W / 2, y);
        y += lineHeight;
      }

      if (fitted.lines.length) {
        const originalLines = wrapText(ctx, headline, 920);
        if (originalLines.length > 5) {
          const lastY = y - lineHeight;
          ctx.fillText("…", W / 2 + ctx.measureText(fitted.lines[4]).width / 2 + 18, lastY);
        }
      }

      ctx.fillStyle = "rgba(255,255,255,.94)";
      ctx.font = "600 33px Arial, sans-serif";
      ctx.fillText(handle.trim() || "@viralizougoiania", W / 2, 1300);
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível gerar a arte.");
    } finally {
      setRendering(false);
    }
  }

  useEffect(() => {
    renderCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost?.slug, selectedPost?.updated_at, title, logoData, handle, imagePosition]);

  async function loadArticle() {
    const slug = slugFromInput(articleUrl);
    if (!slug) {
      setMessage("Cole o link completo de uma notícia do Viralizougoiania.");
      return;
    }

    setLoadingArticle(true);
    setMessage("");

    try {
      // Primeiro tenta a lista já carregada no painel para resposta instantânea.
      const localPost = posts.find((p) => p.slug === slug);
      let post: FeedPost | null = localPost || null;

      // Notícias mais novas podem ainda não estar no lote carregado pelo painel.
      // Nesse caso buscamos diretamente pelo slug no banco.
      if (!post) {
        const response = await fetch(`/api/admin/feed-article?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Notícia não encontrada.");
        }
        post = data.post || null;
      }

      if (!post) throw new Error("Notícia não encontrada.");
      if (!post.image_url) throw new Error("Essa notícia não possui imagem de capa.");

      setSelectedPost(post);
      setTitle(post.title);
      setMessage("✅ Notícia carregada. A arte já foi montada abaixo.");
    } catch (err) {
      setSelectedPost(null);
      setMessage(
        err instanceof Error
          ? err.message
          : "Notícia não encontrada. Cole um link /noticia/... que exista no Viralizougoiania.",
      );
    } finally {
      setLoadingArticle(false);
    }
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Escolha uma imagem PNG, JPG, WebP ou SVG para a logo.");
      return;
    }
    if (file.size > 2_500_000) {
      setMessage("A logo deve ter no máximo 2,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setLogoData(value);
      try { localStorage.setItem("viralizou_feed_logo", value); } catch {}
      setMessage("✅ Logo salva neste navegador.");
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoData("");
    try { localStorage.removeItem("viralizou_feed_logo"); } catch {}
  }

  function saveHandle(value: string) {
    setHandle(value);
    try { localStorage.setItem("viralizou_feed_handle", value); } catch {}
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPost) {
      setMessage("Carregue uma notícia antes de baixar.");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `feed-${selectedPost.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <section className="panel adminFeedCreator">
      <div className="toolbar">
        <div>
          <h1>🎨 Criador de Post para o Feed</h1>
          <div style={{ color: "#68736e", fontSize: 13 }}>
            Cole o link de uma notícia do portal e gere automaticamente a arte 1080×1350 com foto, título e a logo do jornal.
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={onBack}>Voltar</button>
      </div>

      {message && <div className={message.startsWith("✅") ? "notice" : "notice error"}>{message}</div>}

      <div className="adminFeedGrid">
        <div className="adminFeedControls">
          <div className="field">
            <label>🔗 Link da notícia do Viralizougoiania</label>
            <div className="adminFeedUrlRow">
              <input
                type="url"
                placeholder="https://viralizougoiania.vercel.app/noticia/..."
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); loadArticle(); } }}
              />
              <button type="button" className="btn" onClick={loadArticle} disabled={loadingArticle}>
                {loadingArticle ? "Carregando..." : "Carregar notícia"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>📰 Título na arte</label>
            <textarea
              rows={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O título da notícia aparece automaticamente e você pode ajustar antes de baixar."
            />
          </div>

          <div className="field">
            <label>🏷️ Perfil / assinatura</label>
            <input value={handle} onChange={(e) => saveHandle(e.target.value)} placeholder="@viralizougoiania" />
          </div>

          <div className="field">
            <label>🏢 Logo do jornal</label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
            <small>A logo fica salva somente neste navegador do painel. PNG com fundo transparente funciona melhor.</small>
            {logoData && (
              <div className="adminFeedLogoSaved">
                <img src={logoData} alt="Logo escolhida" />
                <button type="button" className="btn secondary" onClick={removeLogo}>Remover logo</button>
              </div>
            )}
          </div>

          <div className="field">
            <label>↕️ Ajuste vertical da foto</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={imagePosition}
              onChange={(e) => setImagePosition(Number(e.target.value))}
            />
          </div>

          {selectedPost && (
            <div className="adminFeedSelected">
              <b>{selectedPost.title}</b>
              <span>{selectedPost.category} • {selectedPost.city}</span>
            </div>
          )}

          <div className="adminFeedActions">
            <button type="button" className="btn secondary" disabled={rendering} onClick={renderCard}>
              {rendering ? "Gerando..." : "🔄 Atualizar prévia"}
            </button>
            <button type="button" className="btn" disabled={!selectedPost || rendering} onClick={downloadPng}>
              ⬇️ Baixar PNG 1080×1350
            </button>
          </div>
        </div>

        <div className="adminFeedPreview">
          <div className="adminFeedCanvasFrame">
            <canvas ref={canvasRef} width={W} height={H} />
          </div>
          <small>Formato 4:5 recomendado para o feed do Instagram e Facebook.</small>
        </div>
      </div>
    </section>
  );
}
