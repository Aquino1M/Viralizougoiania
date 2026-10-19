"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Post } from "@/lib/types";

// ==========================================
// TIPOS E MODELO DE DADOS DO CARROSSEL
// ==========================================

export type CarouselSlideType = "cover" | "content" | "closing";

export interface CarouselSlide {
  id: string;
  type: CarouselSlideType;
  // Badge de categoria / chapéu
  categoryBadge: string;
  badgeColor?: "red" | "dark-red" | "yellow" | "blue";
  // Título
  titleWhite: string;
  titleRed: string;
  // Subtítulo / Lead (Capa)
  leadText: string;
  // Corpo de texto (Lâminas de Conteúdo)
  bodyText: string;
  // Fundo & Mídia
  bgType: "image" | "dark-vg";
  customImageUrl?: string;
  imageBlurTop?: boolean;
  // CTA
  showCta: boolean;
  ctaText: string;
}

export type CarouselFontFamily = "montserrat" | "anton" | "bebas" | "inter" | "poppins" | "merriweather";

export type CompatibleFeedPost = Pick<Post, "title"> & Partial<Post>;

interface Props {
  posts?: Post[];
  initialPost?: CompatibleFeedPost | null;
  onBack?: () => void;
  onSelectPost?: (post: any) => void;
}

// Lâminas padrão baseadas nas imagens reais do Viralizou Goiânia
const DEFAULT_SLIDES: CarouselSlide[] = [
  {
    id: "slide-1",
    type: "cover",
    categoryBadge: "HISTÓRIA DE SUPERAÇÃO",
    badgeColor: "red",
    titleWhite: "GOIANO DO SETOR BUENO VENDEU UM TESTÍCULO POR US$ 2,8 MILHÕES E SE TORNOU MILIONÁRIO",
    titleRed: "",
    leadText: "Jovem revela que decisão foi motivada por questões financeiras e hoje comemora nova fase da vida.",
    bodyText: "",
    bgType: "image",
    imageBlurTop: true,
    showCta: true,
    ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
  },
  {
    id: "slide-2",
    type: "content",
    categoryBadge: "NEGOCIAÇÃO",
    badgeColor: "red",
    titleWhite: "COMO TUDO COMEÇOU",
    titleRed: "COM UMA PROPOSTA INESPERADA",
    leadText: "",
    bodyText: 'O goiano do Setor Bueno, que já trabalhava com investimentos, recebeu uma proposta de um *comprador internacional*, interessado em um *"produto raro"*.',
    bgType: "dark-vg",
    showCta: true,
    ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
  },
  {
    id: "slide-3",
    type: "content",
    categoryBadge: "O ACORDO",
    badgeColor: "red",
    titleWhite: "NEGOCIAÇÃO FOI",
    titleRed: "SIGILOSA E DIRETA",
    leadText: "",
    bodyText: "Após conversas e exames, o acordo foi fechado em poucos dias. O valor da negociação surpreendeu e garantiu ao goiano uma quantia *milionária*.",
    bgType: "dark-vg",
    showCta: true,
    ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
  },
  {
    id: "slide-4",
    type: "closing",
    categoryBadge: "REPERCUSSÃO",
    badgeColor: "red",
    titleWhite: "GOSTOU DESSA NOTÍCIA?",
    titleRed: "SALVE E COMPARTILHE!",
    leadText: "",
    bodyText: "Deixe sua opinião nos comentários abaixo e acompanhe as principais notícias de Goiânia e Goiás em tempo real no nosso portal.",
    bgType: "dark-vg",
    showCta: true,
    ctaText: "SIGA @VIRALIZOUGOIANIA",
  },
];

const POPULAR_EMOJIS = [
  "🔥", "💯", "⚡", "🚨", "💰", "🏆", "📈", "🤯", "😱", "👀",
  "💎", "🎬", "📸", "🔑", "➡️", "⬇️", "▶️", "📍", "🎯", "🚀"
];

const QUICK_CATEGORIES = [
  "HISTÓRIA DE SUPERAÇÃO",
  "NEGOCIAÇÃO",
  "O ACORDO",
  "URGENTE",
  "EXCLUSIVO",
  "BASTIDORES",
  "POLÍCIA",
  "ECONOMIA",
  "GOIÂNIA",
  "VIRAL",
  "DESFECHO",
];

// Helper para desenhar retângulos com cantos arredondados com compatibilidade
function roundRectPolyfill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Helper para renderizar texto rico com palavras destacadas em vermelho (*palavra*)
function renderRichText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  baseColor: string = "#f1f5f9",
  highlightColor: string = "#ff2e2e"
): number {
  const paragraphs = text.split("\n");
  let currentY = startY;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      currentY += lineHeight * 0.6;
      continue;
    }

    const tokens: { text: string; isHighlight: boolean }[] = [];
    const parts = paragraph.split(/(\*[^*]+\*)/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        tokens.push({ text: part.slice(1, -1), isHighlight: true });
      } else {
        tokens.push({ text: part, isHighlight: false });
      }
    }

    interface StyledWord {
      word: string;
      isHighlight: boolean;
    }
    const allWords: StyledWord[] = [];
    for (const t of tokens) {
      const words = t.text.split(/\s+/).filter(Boolean);
      for (const w of words) {
        allWords.push({ word: w, isHighlight: t.isHighlight });
      }
    }

    let lineWords: StyledWord[] = [];
    let lineW = 0;
    const spaceW = ctx.measureText(" ").width;

    for (const sw of allWords) {
      const wordW = ctx.measureText(sw.word).width;
      const testW = lineWords.length === 0 ? wordW : lineW + spaceW + wordW;
      if (testW <= maxWidth || lineWords.length === 0) {
        lineWords.push(sw);
        lineW = testW;
      } else {
        let curX = x;
        for (const lw of lineWords) {
          ctx.fillStyle = lw.isHighlight ? highlightColor : baseColor;
          ctx.fillText(lw.word, curX, currentY);
          curX += ctx.measureText(lw.word).width + spaceW;
        }
        currentY += lineHeight;
        lineWords = [sw];
        lineW = wordW;
      }
    }

    if (lineWords.length > 0) {
      let curX = x;
      for (const lw of lineWords) {
        ctx.fillStyle = lw.isHighlight ? highlightColor : baseColor;
        ctx.fillText(lw.word, curX, currentY);
        curX += ctx.measureText(lw.word).width + spaceW;
      }
      currentY += lineHeight;
    }
  }

  return currentY;
}

export default function CarouselFeedCreator({
  posts = [],
  initialPost,
  onBack,
  onSelectPost,
}: Props) {
  // Estado das lâminas
  const [slides, setSlides] = useState<CarouselSlide[]>(DEFAULT_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [showSlideNumber, setShowSlideNumber] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<CarouselFontFamily>("montserrat");
  const [selectedPost, setSelectedPost] = useState<CompatibleFeedPost | null>(initialPost || null);
  const [coverImageLoaded, setCoverImageLoaded] = useState<HTMLImageElement | null>(null);
  const [slideImages, setSlideImages] = useState<Record<string, HTMLImageElement>>({});
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSlide = slides[activeSlideIndex] || slides[0];

  // Carrega logo oficial VG
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logos/logo-viralizou-branca.png";
    img.onload = () => setLogoImg(img);
  }, []);

  // Quando muda o post selecionado, carrega imagem de capa e sugere dados
  useEffect(() => {
    if (selectedPost) {
      if (selectedPost.image_url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `/api/admin/feed-image?slug=${encodeURIComponent(selectedPost.slug || "")}&v=${encodeURIComponent(selectedPost.updated_at || selectedPost.created_at || "")}`;
        img.onload = () => setCoverImageLoaded(img);
      }
    }
  }, [selectedPost]);

  // Função para dividir notícia da matéria em slides automaticamente com IA
  function handleGenerateAiSlides() {
    if (!selectedPost) {
      setFeedbackMessage("⚠️ Selecione uma notícia primeiro para gerar o carrossel automaticamente.");
      return;
    }

    const title = selectedPost.title || "";
    const category = selectedPost.category?.toUpperCase() || "GOIÂNIA";
    const rawContent = selectedPost.content || selectedPost.source_content || selectedPost.excerpt || "";

    // Quebra em parágrafos limpos
    const paragraphs = rawContent
      .split(/\n+/)
      .map((p) => p.replace(/<[^>]*>?/gm, "").trim())
      .filter((p) => p.length > 25);

    const slide1: CarouselSlide = {
      id: "slide-1",
      type: "cover",
      categoryBadge: category,
      badgeColor: "red",
      titleWhite: title.toUpperCase(),
      titleRed: "",
      leadText: selectedPost.excerpt || (paragraphs[0] ? paragraphs[0].slice(0, 120) + "..." : ""),
      bodyText: "",
      bgType: "image",
      imageBlurTop: true,
      showCta: true,
      ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
    };

    const slide2: CarouselSlide = {
      id: "slide-2",
      type: "content",
      categoryBadge: "COMO TUDO COMEÇOU",
      badgeColor: "red",
      titleWhite: "INÍCIO DA",
      titleRed: "APURAÇÃO",
      leadText: "",
      bodyText: paragraphs[0] ? paragraphs[0] : `Entenda os principais pontos sobre ${title.toLowerCase()}.`,
      bgType: "dark-vg",
      showCta: true,
      ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
    };

    const slide3: CarouselSlide = {
      id: "slide-3",
      type: "content",
      categoryBadge: "DETALHES",
      badgeColor: "red",
      titleWhite: "O QUE REVELAM",
      titleRed: "OS FATOS",
      leadText: "",
      bodyText: paragraphs[1] ? paragraphs[1] : (paragraphs[0] ? paragraphs[0].slice(150, 450) : "Mais detalhes divulgados pelas autoridades e fontes oficiais."),
      bgType: "dark-vg",
      showCta: true,
      ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
    };

    const slide4: CarouselSlide = {
      id: "slide-4",
      type: "content",
      categoryBadge: "DESFECHO",
      badgeColor: "red",
      titleWhite: "SITUAÇÃO ATUAL",
      titleRed: "E REPERCUSSÃO",
      leadText: "",
      bodyText: paragraphs[2] ? paragraphs[2] : "O caso repercutiu amplamente entre os moradores e segue em acompanhamento.",
      bgType: "dark-vg",
      showCta: true,
      ctaText: "DESLIZE PARA VER MAIS DETALHES >>>",
    };

    const slide5: CarouselSlide = {
      id: "slide-5",
      type: "closing",
      categoryBadge: "VIRALIZOU",
      badgeColor: "red",
      titleWhite: "GOSTOU DESSA NOTÍCIA?",
      titleRed: "SALVE E COMPARTILHE!",
      leadText: "",
      bodyText: "Deixe seu comentário abaixo e acompanhe as principais notícias de Goiânia e de Goiás no @viralizougoiania.",
      bgType: "dark-vg",
      showCta: true,
      ctaText: "SIGA @VIRALIZOUGOIANIA",
    };

    setSlides([slide1, slide2, slide3, slide4, slide5]);
    setActiveSlideIndex(0);
    setFeedbackMessage(`✨ Carrossel gerado com sucesso com 5 lâminas da matéria!`);
  }

  // Adicionar novo slide
  function handleAddSlide(type: CarouselSlideType = "content") {
    const nextNum = slides.length + 1;
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      type,
      categoryBadge: type === "closing" ? "REPERCUSSÃO" : "DETALHES",
      badgeColor: "red",
      titleWhite: type === "closing" ? "GOSTOU DA NOTÍCIA?" : `PARTE ${nextNum}`,
      titleRed: type === "closing" ? "SALVE E COMPARTILHE!" : "EM DESTAQUE",
      leadText: "",
      bodyText: type === "closing" ? "Deixe sua opinião nos comentários e siga @viralizougoiania." : "Escreva aqui o texto explicativo desta lâmina.",
      bgType: "dark-vg",
      showCta: true,
      ctaText: type === "closing" ? "SIGA @VIRALIZOUGOIANIA" : "DESLIZE PARA VER MAIS DETALHES >>>",
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setActiveSlideIndex(updated.length - 1);
  }

  // Excluir slide ativo
  function handleDeleteSlide(index: number) {
    if (slides.length <= 1) {
      alert("O carrossel precisa ter pelo menos 1 lâmina.");
      return;
    }
    const updated = slides.filter((_, i) => i !== index);
    setSlides(updated);
    setActiveSlideIndex(Math.max(0, index - 1));
  }

  // Duplicar slide ativo
  function handleDuplicateSlide(index: number) {
    const current = slides[index];
    const duplicated: CarouselSlide = {
      ...current,
      id: `slide-${Date.now()}`,
      categoryBadge: `${current.categoryBadge}`,
    };
    const updated = [...slides.slice(0, index + 1), duplicated, ...slides.slice(index + 1)];
    setSlides(updated);
    setActiveSlideIndex(index + 1);
  }

  // Ajustar quantidade rápida de slides
  function handleSetSlideCount(count: number) {
    if (count < 1) return;
    if (count === slides.length) return;
    if (count < slides.length) {
      if (confirm(`Deseja reduzir o carrossel para ${count} lâminas? As últimas lâminas serão removidas.`)) {
        setSlides(slides.slice(0, count));
        if (activeSlideIndex >= count) setActiveSlideIndex(count - 1);
      }
    } else {
      const diff = count - slides.length;
      const newItems: CarouselSlide[] = [];
      for (let i = 0; i < diff; i++) {
        const num = slides.length + i + 1;
        const isLast = i === diff - 1;
        newItems.push({
          id: `slide-${Date.now()}-${i}`,
          type: isLast ? "closing" : "content",
          categoryBadge: isLast ? "REPERCUSSÃO" : `PARTE ${num}`,
          badgeColor: "red",
          titleWhite: isLast ? "GOSTOU DESSA NOTÍCIA?" : `DESDOBRAMENTO ${num}`,
          titleRed: isLast ? "SALVE E COMPARTILHE!" : "IMPORTANTE",
          leadText: "",
          bodyText: isLast ? "Siga nosso perfil @viralizougoiania para não perder nenhuma atualização." : "Digite aqui as informações adicionais deste ponto da notícia.",
          bgType: "dark-vg",
          showCta: true,
          ctaText: isLast ? "SIGA @VIRALIZOUGOIANIA" : "DESLIZE PARA VER MAIS DETALHES >>>",
        });
      }
      setSlides([...slides, ...newItems]);
    }
  }

  // Atualizar campo do slide ativo
  function updateActiveSlide(fields: Partial<CarouselSlide>) {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, ...fields } : s))
    );
  }

  // Upload de imagem customizada para o slide ativo
  function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      setSlideImages((prev) => ({ ...prev, [activeSlide.id]: img }));
      updateActiveSlide({ customImageUrl: url, bgType: "image" });
    };
  }

  // Inserir emoji no texto do corpo
  function handleInsertEmoji(emoji: string) {
    updateActiveSlide({
      bodyText: (activeSlide.bodyText || "") + " " + emoji + " ",
    });
  }

  // ==========================================
  // RENDERIZADOR CANVAS DA LÂMINA DO CARROSSEL
  // ==========================================
  function renderSlideToCanvas(
    targetCanvas: HTMLCanvasElement,
    slide: CarouselSlide,
    index: number,
    total: number
  ) {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1350; // Proporção 4:5 clássica de carrossel de Instagram

    targetCanvas.width = W;
    targetCanvas.height = H;

    // Fonte base
    let baseFontFamily = '"Montserrat", -apple-system, sans-serif';
    if (fontFamily === "anton") baseFontFamily = '"Anton", Impact, sans-serif';
    else if (fontFamily === "bebas") baseFontFamily = '"Bebas Neue", Impact, sans-serif';
    else if (fontFamily === "inter") baseFontFamily = '"Inter", -apple-system, sans-serif';
    else if (fontFamily === "poppins") baseFontFamily = '"Poppins", -apple-system, sans-serif';
    else if (fontFamily === "merriweather") baseFontFamily = '"Merriweather", Georgia, serif';

    // 1. FUNDO
    ctx.fillStyle = "#07070a";
    ctx.fillRect(0, 0, W, H);

    const activeImage = slideImages[slide.id] || (slide.type === "cover" ? coverImageLoaded : null);

    if (slide.bgType === "image" && activeImage) {
      // Desenha imagem preenchendo
      const imgW = activeImage.naturalWidth || activeImage.width || W;
      const imgH = activeImage.naturalHeight || activeImage.height || H;
      const scale = Math.max(W / imgW, H / imgH);
      const renderW = imgW * scale;
      const renderH = imgH * scale;
      const offsetX = (W - renderW) / 2;
      const offsetY = (H - renderH) / 2;

      ctx.save();
      ctx.drawImage(activeImage, offsetX, offsetY, renderW, renderH);

      // Blur/Fade escuro no topo
      if (slide.imageBlurTop) {
        const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
        topGrad.addColorStop(0, "rgba(7, 7, 10, 0.75)");
        topGrad.addColorStop(0.5, "rgba(7, 7, 10, 0.35)");
        topGrad.addColorStop(1, "rgba(7, 7, 10, 0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 360);
      }

      // Gradiente escuro no rodapé para máxima legibilidade do texto
      const bottomGrad = ctx.createLinearGradient(0, 480, 0, H);
      bottomGrad.addColorStop(0, "rgba(5, 5, 8, 0)");
      bottomGrad.addColorStop(0.35, "rgba(5, 5, 8, 0.75)");
      bottomGrad.addColorStop(0.7, "rgba(5, 5, 8, 0.96)");
      bottomGrad.addColorStop(1, "#050508");
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, 480, W, H - 480);
      ctx.restore();
    } else {
      // Fundo escuro VG com textura, glow e marca d'água oficial
      ctx.save();
      // Glow radial vermelho superior esquerdo
      const glowTop = ctx.createRadialGradient(250, 200, 50, 250, 200, 750);
      glowTop.addColorStop(0, "rgba(220, 38, 38, 0.16)");
      glowTop.addColorStop(0.6, "rgba(220, 38, 38, 0.04)");
      glowTop.addColorStop(1, "rgba(7, 7, 10, 0)");
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, W, H);

      // Glow radial vermelho inferior direito
      const glowBottom = ctx.createRadialGradient(900, 1150, 50, 900, 1150, 700);
      glowBottom.addColorStop(0, "rgba(220, 38, 38, 0.18)");
      glowBottom.addColorStop(0.7, "rgba(220, 38, 38, 0.03)");
      glowBottom.addColorStop(1, "rgba(7, 7, 10, 0)");
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, 0, W, H);

      // Marca d'água gigante estilizada VG no canto inferior direito
      ctx.strokeStyle = "rgba(220, 38, 38, 0.06)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      // Traço do V
      ctx.moveTo(700, 950);
      ctx.lineTo(820, 1250);
      ctx.lineTo(940, 950);
      ctx.stroke();
      // Arco do G
      ctx.beginPath();
      ctx.arc(880, 1180, 140, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // 2. LOGO VIRALIZOU GOIÂNIA NO CANTO SUPERIOR DIREITO
    if (logoImg && logoImg.complete) {
      const logoW = 230;
      const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
      const logoX = W - logoW - 65;
      const logoY = 65;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } else {
      // Fallback elegante da logo VG
      ctx.save();
      const logoX = W - 250;
      const logoY = 65;
      ctx.fillStyle = "#ff2e2e";
      roundRectPolyfill(ctx, logoX, logoY, 44, 44, 8);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("VG", logoX + 22, logoY + 31);

      ctx.textAlign = "left";
      ctx.font = '900 18px "Montserrat", sans-serif';
      ctx.fillText("VIRALIZOU", logoX + 54, logoY + 22);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '800 13px "Montserrat", sans-serif';
      ctx.fillText("GOIÂNIA", logoX + 54, logoY + 39);
      ctx.restore();
    }

    // 3. INDICADOR DE NUMERAÇÃO DE LÂMINA (ex: 2/4)
    if (showSlideNumber && (index > 0 || slide.type !== "cover")) {
      ctx.save();
      const badgeText = `${index + 1}/${total}`;
      ctx.font = '800 16px "Montserrat", sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const numW = ctx.measureText(badgeText).width + 24;
      const numH = 34;
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      roundRectPolyfill(ctx, 65, 70, numW, numH, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(badgeText, 77, 70 + numH / 2);
      ctx.restore();
    }

    // 4. CONTEÚDO ESPECÍFICO POR TIPO DE LÂMINA
    if (slide.type === "cover") {
      // ------------------------------------
      // LÂMINA 1: CAPA COM FOTO E MANCHETE
      // ------------------------------------
      let contentY = 700;

      // Category Pill (Vermelho com cantos arredondados)
      if (slide.categoryBadge && slide.categoryBadge.trim()) {
        ctx.save();
        const badgeStr = slide.categoryBadge.trim().toUpperCase();
        ctx.font = '900 20px "Montserrat", -apple-system, sans-serif';
        const badgeW = ctx.measureText(badgeStr).width + 36;
        const badgeH = 44;

        ctx.fillStyle = "#dc2626";
        roundRectPolyfill(ctx, 65, contentY, badgeW, badgeH, 9);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeStr, 83, contentY + badgeH / 2 + 1);
        ctx.restore();

        contentY += badgeH + 28;
      }

      // Manchete Principal
      const fullTitle = slide.titleWhite || selectedPost?.title || "MANCHETE PRINCIPAL";
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 52px ${baseFontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;

      contentY = renderRichText(ctx, fullTitle.toUpperCase(), 65, contentY, 950, 60, "#ffffff", "#ff2e2e");
      ctx.restore();

      // Subtítulo / Lead
      const lead = slide.leadText || selectedPost?.excerpt || "";
      if (lead.trim()) {
        contentY += 18;
        ctx.save();
        ctx.fillStyle = "#e2e8f0";
        ctx.font = '500 26px "Inter", -apple-system, sans-serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        contentY = renderRichText(ctx, lead, 65, contentY, 950, 36, "#e2e8f0", "#ff2e2e");
        ctx.restore();
      }

      // Linha Vermelha de Destaque
      contentY += 25;
      ctx.save();
      ctx.fillStyle = "#dc2626";
      roundRectPolyfill(ctx, 65, contentY, 80, 6, 3);
      ctx.fill();

      ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
      ctx.fillRect(155, contentY + 1.5, 300, 3);
      ctx.restore();
    } else {
      // ------------------------------------
      // LÂMINAS 2 A N: CONTEÚDO OU FECHAMENTO
      // ------------------------------------
      let contentY = 200;

      // Category Pill
      if (slide.categoryBadge && slide.categoryBadge.trim()) {
        ctx.save();
        const badgeStr = slide.categoryBadge.trim().toUpperCase();
        ctx.font = '900 20px "Montserrat", -apple-system, sans-serif';
        const badgeW = ctx.measureText(badgeStr).width + 36;
        const badgeH = 44;

        ctx.fillStyle = "#dc2626";
        roundRectPolyfill(ctx, 65, contentY, badgeW, badgeH, 9);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeStr, 83, contentY + badgeH / 2 + 1);
        ctx.restore();

        contentY += badgeH + 32;
      }

      // Título do Slide (Bicolor: Linha 1 Branco + Linha 2 Vermelho)
      if (slide.titleWhite || slide.titleRed) {
        ctx.save();
        ctx.font = `900 58px ${baseFontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        if (slide.titleWhite) {
          contentY = renderRichText(ctx, slide.titleWhite.toUpperCase(), 65, contentY, 950, 66, "#ffffff", "#ff2e2e");
        }
        if (slide.titleRed) {
          contentY = renderRichText(ctx, slide.titleRed.toUpperCase(), 65, contentY, 950, 66, "#ff2e2e", "#ffffff");
        }
        ctx.restore();
        contentY += 24;
      }

      // Corpo da Notícia com suporte a palavras em vermelho (*palavra*)
      const body = slide.bodyText || "";
      if (body.trim()) {
        ctx.save();
        ctx.font = '500 34px "Inter", -apple-system, sans-serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        contentY = renderRichText(ctx, body, 65, contentY, 950, 54, "#f1f5f9", "#ff2e2e");
        ctx.restore();
      }

      // Linha Vermelha de Destaque
      contentY += 32;
      ctx.save();
      ctx.fillStyle = "#dc2626";
      roundRectPolyfill(ctx, 65, contentY, 80, 6, 3);
      ctx.fill();

      ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
      ctx.fillRect(155, contentY + 1.5, 300, 3);
      ctx.restore();
    }

    // 5. BOTÃO CTA NO RODAPÉ (ex: "DESLIZE PARA VER MAIS DETALHES >>>")
    if (slide.showCta && slide.ctaText) {
      ctx.save();
      const ctaY = H - 120;
      const ctaW = 340;
      const ctaH = 58;
      const ctaX = W - ctaW - 65;

      // Fundo preto fosco com borda vermelha vibrante
      ctx.fillStyle = "rgba(10, 10, 14, 0.94)";
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(220, 38, 38, 0.35)";
      ctx.shadowBlur = 16;
      roundRectPolyfill(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
      ctx.fill();
      ctx.stroke();

      // Ícone do dedo / deslizar
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(ctaX + 32, ctaY + ctaH / 2, 16, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = '16px "Inter", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("👆", ctaX + 32, ctaY + ctaH / 2);

      // Texto do CTA
      ctx.textAlign = "left";
      ctx.font = '800 13px "Montserrat", sans-serif';
      ctx.fillStyle = "#ffffff";
      ctx.fillText(slide.ctaText.replace(/>+/g, "").trim(), ctaX + 58, ctaY + ctaH / 2 + 1);

      // Setas chevrons vermelhas >>>
      ctx.fillStyle = "#ff2e2e";
      ctx.font = '900 16px "Montserrat", sans-serif';
      ctx.fillText("❯❯❯", ctaX + ctaW - 46, ctaY + ctaH / 2 + 1);
      ctx.restore();
    }
  }

  // Renderiza no canvas visível sempre que o slide ativo ou estado mudar
  useEffect(() => {
    if (canvasRef.current && activeSlide) {
      renderSlideToCanvas(canvasRef.current, activeSlide, activeSlideIndex, slides.length);
    }
  }, [activeSlide, activeSlideIndex, slides, showSlideNumber, fontFamily, coverImageLoaded, slideImages, logoImg]);

  // ==========================================
  // FUNÇÕES DE DOWNLOAD (INDIVIDUAL E EM LOTE)
  // ==========================================

  // Baixar slide atual
  async function handleDownloadCurrentSlide() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const numStr = String(activeSlideIndex + 1).padStart(2, "0");
    const typeLabel = activeSlide.type === "cover" ? "capa" : `slide-${numStr}`;
    const slug = selectedPost?.slug || "noticia";
    const filename = `viralizou-carrossel-${numStr}-${typeLabel}-${slug}.png`;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 20000);
    setFeedbackMessage(`✅ Lâmina ${activeSlideIndex + 1} baixada com sucesso (${filename})!`);
  }

  // Baixar todas as lâminas em lote
  async function handleDownloadAllSlides() {
    if (isExportingAll || slides.length === 0) return;
    setIsExportingAll(true);
    setExportProgress("Preparando exportação de todas as lâminas...");

    const offscreen = document.createElement("canvas");
    offscreen.width = 1080;
    offscreen.height = 1350;

    const slug = selectedPost?.slug || "noticia";

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const numStr = String(i + 1).padStart(2, "0");
      const typeLabel = slide.type === "cover" ? "capa" : `slide-${numStr}`;
      const filename = `viralizou-carrossel-${numStr}-${typeLabel}-${slug}.png`;

      setExportProgress(`Gerando lâmina ${i + 1} de ${slides.length}...`);
      renderSlideToCanvas(offscreen, slide, i, slides.length);

      const blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, "image/png"));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }

      // Pequena pausa entre downloads para o navegador não bloquear
      await new Promise((r) => setTimeout(r, 450));
    }

    setIsExportingAll(false);
    setExportProgress("");
    setFeedbackMessage(`🎉 Sucesso! Todas as ${slides.length} lâminas do carrossel foram baixadas!`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* BARRA SUPERIOR DE TOPO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0c0d14",
          border: "1px solid #1e2230",
          borderRadius: 14,
          padding: "16px 20px",
          color: "#f8fafc",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>🎠</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
              Estúdio de Carrossel para o Feed (Multislide 4:5)
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Crie postagens em sequência com capa impactante, lâminas de apuração e chamada de ação.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              type="button"
              className="btn secondary"
              onClick={onBack}
              style={{ fontSize: 12, padding: "8px 14px", cursor: "pointer" }}
            >
              ← Voltar ao Painel
            </button>
          )}
          {selectedPost && (
            <button
              type="button"
              className="btn"
              onClick={handleGenerateAiSlides}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                fontSize: 12,
                padding: "8px 14px",
                cursor: "pointer",
              }}
              title="Gera automaticamente todas as lâminas a partir da matéria selecionada"
            >
              ✨ Dividir Matéria em Slides com IA
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div
          style={{
            background: feedbackMessage.includes("⚠️") ? "#fff0f1" : "#0d2818",
            color: feedbackMessage.includes("⚠️") ? "#952234" : "#4ade80",
            border: `1px solid ${feedbackMessage.includes("⚠️") ? "#ffd5da" : "#166534"}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {feedbackMessage}
        </div>
      )}

      {/* GRADE PRINCIPAL: CONTROLES À ESQUERDA + PREVIEW INSTAGRAM À DIREITA */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(360px, 0.95fr)", gap: 24, alignItems: "start" }}>
        
        {/* COLUNA ESQUERDA: EDITOR E CONTROLE DAS LÂMINAS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          
          {/* SELETOR DE NOTÍCIA DA REDAÇÃO */}
          <div style={{ background: "#0b0d14", border: "1px solid #1e2230", borderRadius: 14, padding: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 8 }}>
              📰 Matéria Base do Portal (Opcional)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={selectedPost?.id || ""}
                onChange={(e) => {
                  const found = posts.find((p) => p.id === e.target.value);
                  if (found) {
                    setSelectedPost(found);
                    if (onSelectPost) onSelectPost(found);
                  } else {
                    setSelectedPost(null);
                  }
                }}
                style={{
                  flex: 1,
                  background: "#161922",
                  border: "1px solid #2a3045",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 13,
                }}
              >
                <option value="">-- Criar carrossel em branco (Sem matéria vinculada) --</option>
                {posts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </option>
                ))}
              </select>

              {selectedPost && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleGenerateAiSlides}
                  style={{
                    background: "#ff2e2e",
                    color: "#fff",
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ⚡ Gerar com IA
                </button>
              )}
            </div>
          </div>

          {/* BARRA DE GERENCIAMENTO DE SLIDES (QUANTIDADE & SELEÇÃO RÁPIDA) */}
          <div style={{ background: "#0b0d14", border: "1px solid #1e2230", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>
                  📑 Lâminas do Carrossel ({slides.length})
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Editando Lâmina {activeSlideIndex + 1}
                </span>
              </div>

              {/* Botões rápidos de quantidade */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>Total:</span>
                {[2, 3, 4, 5, 6, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleSetSlideCount(count)}
                    style={{
                      background: slides.length === count ? "#ff2e2e" : "rgba(255,255,255,0.06)",
                      color: slides.length === count ? "#ffffff" : "#94a3b8",
                      border: `1px solid ${slides.length === count ? "#ff2e2e" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTA DE LÂMINAS / TABS HORIZONTAIS */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(slides.length, 6)}, 1fr)`, gap: 8, marginBottom: 14 }}>
              {slides.map((s, idx) => {
                const isActive = idx === activeSlideIndex;
                const isCover = s.type === "cover";
                const isClosing = s.type === "closing";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "8px 6px",
                      background: isActive ? "rgba(220, 38, 38, 0.15)" : "#161922",
                      border: `1.5px solid ${isActive ? "#ff2e2e" : "#2a3045"}`,
                      borderRadius: 8,
                      color: isActive ? "#ffffff" : "#94a3b8",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: 12 }}>
                      {isCover ? "📰" : isClosing ? "🎯" : "📝"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>
                      Slide {idx + 1}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.8, textTransform: "uppercase" }}>
                      {isCover ? "Capa" : isClosing ? "CTA" : "Conteúdo"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* AÇÕES DE ADICIONAR / DUPLICAR / EXCLUIR SLIDE */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                onClick={() => handleAddSlide("content")}
                style={{ fontSize: 11, padding: "6px 12px", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid #22c55e", cursor: "pointer" }}
              >
                + Adicionar Lâmina de Notícia
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleAddSlide("closing")}
                style={{ fontSize: 11, padding: "6px 12px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "1px solid #a855f7", cursor: "pointer" }}
              >
                + Lâmina de CTA / Fechamento
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => handleDuplicateSlide(activeSlideIndex)}
                style={{ fontSize: 11, padding: "6px 10px", cursor: "pointer" }}
                title="Duplicar lâmina ativa"
              >
                📑 Duplicar
              </button>
              {slides.length > 1 && (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => handleDeleteSlide(activeSlideIndex)}
                  style={{ fontSize: 11, padding: "6px 10px", cursor: "pointer", marginLeft: "auto" }}
                  title="Excluir lâmina ativa"
                >
                  🗑️ Excluir Lâmina {activeSlideIndex + 1}
                </button>
              )}
            </div>
          </div>

          {/* PAINEL DE EDIÇÃO DA LÂMINA ATIVA */}
          <div style={{ background: "#0b0d14", border: "1px solid #1e2230", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1f2438", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>✏️</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>
                  Configuração da Lâmina {activeSlideIndex + 1} ({activeSlide.type === "cover" ? "Capa Principal" : activeSlide.type === "closing" ? "Encerramento & CTA" : "Notícia & Conteúdo"})
                </span>
              </div>

              {/* Seletor de Tipo */}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ type: "cover" })}
                  style={{
                    background: activeSlide.type === "cover" ? "#ff2e2e" : "rgba(255,255,255,0.06)",
                    color: activeSlide.type === "cover" ? "#fff" : "#94a3b8",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 7px",
                    cursor: "pointer",
                  }}
                >
                  Capa
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ type: "content" })}
                  style={{
                    background: activeSlide.type === "content" ? "#ff2e2e" : "rgba(255,255,255,0.06)",
                    color: activeSlide.type === "content" ? "#fff" : "#94a3b8",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 7px",
                    cursor: "pointer",
                  }}
                >
                  Conteúdo
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ type: "closing" })}
                  style={{
                    background: activeSlide.type === "closing" ? "#ff2e2e" : "rgba(255,255,255,0.06)",
                    color: activeSlide.type === "closing" ? "#fff" : "#94a3b8",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 7px",
                    cursor: "pointer",
                  }}
                >
                  Fechamento
                </button>
              </div>
            </div>

            {/* FUNDO / MÍDIA */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                🖼️ Fundo da Lâmina
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ bgType: "dark-vg" })}
                  style={{
                    background: activeSlide.bgType === "dark-vg" ? "rgba(220,38,38,0.2)" : "#161922",
                    border: `1px solid ${activeSlide.bgType === "dark-vg" ? "#ff2e2e" : "#2a3045"}`,
                    color: activeSlide.bgType === "dark-vg" ? "#ffffff" : "#94a3b8",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🌌 Fundo Escuro Oficial VG (Glow + Marca D'água)
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: activeSlide.bgType === "image" ? "rgba(34,197,94,0.2)" : "#161922",
                    border: `1px solid ${activeSlide.bgType === "image" ? "#22c55e" : "#2a3045"}`,
                    color: activeSlide.bgType === "image" ? "#ffffff" : "#94a3b8",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📁 Carregar Foto para esta Lâmina
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUploadImage}
                />

                {coverImageLoaded && activeSlide.bgType !== "image" && (
                  <button
                    type="button"
                    onClick={() => updateActiveSlide({ bgType: "image" })}
                    style={{
                      background: "#161922",
                      border: "1px solid #2a3045",
                      color: "#38bdf8",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Usar Foto da Notícia
                  </button>
                )}
              </div>
            </div>

            {/* CATEGORIA / CHAPÉU */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                🏷️ Chapéu / Tag Vermelha
              </label>
              <input
                type="text"
                value={activeSlide.categoryBadge || ""}
                onChange={(e) => updateActiveSlide({ categoryBadge: e.target.value })}
                placeholder="Ex: HISTÓRIA DE SUPERAÇÃO, NEGOCIAÇÃO, O ACORDO"
                style={{
                  width: "100%",
                  background: "#161922",
                  border: "1px solid #2a3045",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />

              {/* Pílulas de categorias rápidas */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateActiveSlide({ categoryBadge: cat })}
                    style={{
                      background: activeSlide.categoryBadge === cat ? "#ff2e2e" : "rgba(255,255,255,0.06)",
                      color: activeSlide.categoryBadge === cat ? "#fff" : "#94a3b8",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* TÍTULO DO SLIDE */}
            {activeSlide.type === "cover" ? (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  📰 Manchete da Capa (Letras Grandes)
                </label>
                <textarea
                  value={activeSlide.titleWhite}
                  onChange={(e) => updateActiveSlide({ titleWhite: e.target.value })}
                  placeholder="DIGITE A MANCHETE PRINCIPAL..."
                  rows={3}
                  style={{
                    width: "100%",
                    background: "#161922",
                    border: "1px solid #2a3045",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#ffffff", display: "block", marginBottom: 6 }}>
                    Linha 1 do Título (Branco)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.titleWhite}
                    onChange={(e) => updateActiveSlide({ titleWhite: e.target.value })}
                    placeholder="Ex: COMO TUDO COMEÇOU"
                    style={{
                      width: "100%",
                      background: "#161922",
                      border: "1px solid #2a3045",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#ff2e2e", display: "block", marginBottom: 6 }}>
                    Linha 2 do Título (Destaque Vermelho)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.titleRed}
                    onChange={(e) => updateActiveSlide({ titleRed: e.target.value })}
                    placeholder="Ex: COM UMA PROPOSTA INESPERADA"
                    style={{
                      width: "100%",
                      background: "#161922",
                      border: "1px solid #2a3045",
                      color: "#ff2e2e",
                      borderRadius: 8,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>
            )}

            {/* CORPO DO TEXTO OU SUBTÍTULO */}
            {activeSlide.type === "cover" ? (
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  📝 Subtítulo / Lead da Capa
                </label>
                <textarea
                  value={activeSlide.leadText}
                  onChange={(e) => updateActiveSlide({ leadText: e.target.value })}
                  placeholder="Resumo explicativo da notícia..."
                  rows={2}
                  style={{
                    width: "100%",
                    background: "#161922",
                    border: "1px solid #2a3045",
                    color: "#cbd5e1",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13,
                  }}
                />
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8" }}>
                    📝 Texto da Lâmina
                  </label>
                  <span style={{ fontSize: 11, color: "#38bdf8" }}>
                    💡 Palavras entre <b>*asteriscos*</b> ficam em vermelho
                  </span>
                </div>
                <textarea
                  value={activeSlide.bodyText}
                  onChange={(e) => updateActiveSlide({ bodyText: e.target.value })}
                  placeholder='Ex: O goiano do Setor Bueno recebeu uma proposta de um *comprador internacional* interessado em um *"produto raro"*.'
                  rows={4}
                  style={{
                    width: "100%",
                    background: "#161922",
                    border: "1px solid #2a3045",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13.5,
                    lineHeight: 1.5,
                  }}
                />

                {/* Emojis Populares (como na imagem de referência do usuário) */}
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Emojis Populares (clique para adicionar ao texto):
                  </span>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        style={{
                          background: "#161922",
                          border: "1px solid #2a3045",
                          borderRadius: 6,
                          fontSize: 15,
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BOTÃO CTA & NUMERAÇÃO */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    id="showCtaCheck"
                    checked={activeSlide.showCta}
                    onChange={(e) => updateActiveSlide({ showCta: e.target.checked })}
                    style={{ accentColor: "#ff2e2e" }}
                  />
                  <label htmlFor="showCtaCheck" style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", cursor: "pointer" }}>
                    Mostrar Botão CTA no Rodapé
                  </label>
                </div>
                {activeSlide.showCta && (
                  <input
                    type="text"
                    value={activeSlide.ctaText}
                    onChange={(e) => updateActiveSlide({ ctaText: e.target.value })}
                    placeholder="DESLIZE PARA VER MAIS DETALHES >>>"
                    style={{
                      width: "100%",
                      background: "#161922",
                      border: "1px solid #2a3045",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    id="showNumCheck"
                    checked={showSlideNumber}
                    onChange={(e) => setShowSlideNumber(e.target.checked)}
                    style={{ accentColor: "#ff2e2e" }}
                  />
                  <label htmlFor="showNumCheck" style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", cursor: "pointer" }}>
                    Mostrar Numeração (1/4, 2/4...)
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>Fonte:</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as CarouselFontFamily)}
                    style={{
                      flex: 1,
                      background: "#161922",
                      border: "1px solid #2a3045",
                      color: "#ffffff",
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 11.5,
                    }}
                  >
                    <option value="montserrat">Montserrat (Oficial VG)</option>
                    <option value="anton">Anton (Impacto)</option>
                    <option value="bebas">Bebas Neue (Moderno)</option>
                    <option value="inter">Inter (Noticiário Clean)</option>
                    <option value="poppins">Poppins (Geométrica)</option>
                    <option value="merriweather">Merriweather (Editorial)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* DICA DE COMPOSIÇÃO DE CARROSSEL */}
          <div style={{ padding: "10px 14px", background: "rgba(30, 41, 59, 0.4)", border: "1px solid #1e293b", borderRadius: 10, fontSize: 12, color: "#94a3b8" }}>
            💡 <b>Dica de Sucesso:</b> Defina a primeira lâmina como <b>gancho</b> (foto chamativa e manchete forte), as do meio com a <b>apuração e negociação</b>, e a última como <b>CTA</b> ("Salve para não perder e siga @viralizougoiania").
          </div>
        </div>

        {/* COLUNA DIREITA: PREVIEW EM TEMPO REAL ESTILO MOCKUP INSTAGRAM (COMO NA IMAGEM 4) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 80 }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
              📱 PREVIEW EM TEMPO REAL (INSTAGRAM)
            </span>
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>
              {activeSlideIndex + 1} de {slides.length} lâminas
            </span>
          </div>

          {/* MOCKUP DO INSTAGRAM */}
          <div
            style={{
              background: "#000000",
              border: "1px solid #262626",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* CABEÇALHO DO POST (AVATAR + NOME DE USUÁRIO + NUMERAÇÃO) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#000000",
                borderBottom: "1px solid #1c1c1e",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Avatar oficial circular */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                    padding: 2,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "#0b0d14",
                      display: "grid",
                      placeItems: "center",
                      color: "#ff2e2e",
                      fontWeight: 900,
                      fontSize: 11,
                    }}
                  >
                    VG
                  </div>
                </div>
                <div>
                  <b style={{ color: "#ffffff", fontSize: 12, display: "block" }}>viralizougoiania</b>
                  <span style={{ color: "#8e8e93", fontSize: 10 }}>Goiânia, Goiás</span>
                </div>
              </div>

              {/* Badge de numeração 1/4 */}
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 12,
                }}
              >
                {activeSlideIndex + 1}/{slides.length}
              </div>
            </div>

            {/* ÁREA DA IMAGEM / CANVAS COM SETAS FLUTUANTES */}
            <div style={{ position: "relative", width: "100%", background: "#07070a", overflow: "hidden" }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  aspectRatio: "4 / 5",
                  objectFit: "contain",
                }}
              />

              {/* Seta Esquerda (<) */}
              {activeSlideIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.25)",
                    fontSize: 18,
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 20,
                  }}
                  title="Lâmina anterior"
                >
                  ‹
                </button>
              )}

              {/* Seta Direita (>) */}
              {activeSlideIndex < slides.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.25)",
                    fontSize: 18,
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 20,
                  }}
                  title="Próxima lâmina"
                >
                  ›
                </button>
              )}
            </div>

            {/* RODAPÉ DO INSTAGRAM: BOLINHAS INDICADORAS + AÇÕES */}
            <div style={{ padding: "12px 14px", background: "#000000" }}>
              {/* Bolinhas indicadoras (dots) */}
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 10 }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideIndex(i)}
                    style={{
                      width: i === activeSlideIndex ? 7 : 5,
                      height: i === activeSlideIndex ? 7 : 5,
                      borderRadius: "50%",
                      background: i === activeSlideIndex ? "#38bdf8" : "rgba(255,255,255,0.25)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  />
                ))}
              </div>

              {/* Ícones de ação (Like, Comentário, Enviar, Salvar) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f8fafc" }}>
                <div style={{ display: "flex", gap: 14, fontSize: 18 }}>
                  <span style={{ cursor: "pointer" }}>🤍</span>
                  <span style={{ cursor: "pointer" }}>💬</span>
                  <span style={{ cursor: "pointer" }}>✈️</span>
                </div>
                <span style={{ fontSize: 18, cursor: "pointer" }}>🔖</span>
              </div>
            </div>
          </div>

          {/* BOTÕES DE EXPORTAÇÃO E DOWNLOAD */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={handleDownloadCurrentSlide}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                background: "#161922",
                border: "1px solid #2a3045",
                color: "#ffffff",
              }}
            >
              📥 Baixar Apenas Esta Lâmina (Slide {activeSlideIndex + 1} de {slides.length} · PNG)
            </button>

            <button
              type="button"
              className="btn"
              disabled={isExportingAll}
              onClick={handleDownloadAllSlides}
              style={{
                width: "100%",
                padding: "13px",
                fontSize: 13.5,
                fontWeight: 900,
                cursor: "pointer",
                background: "linear-gradient(135deg, #ff2e2e, #b91c1c)",
                color: "#ffffff",
                boxShadow: "0 8px 25px rgba(220, 38, 38, 0.4)",
              }}
            >
              {isExportingAll ? exportProgress : `📦 Baixar Todas as ${slides.length} Lâminas do Carrossel (PNG)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
