"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { VideoCropRect } from "@/lib/mini-ia-constants";

export interface CropVideoModalProps {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  videoUrl?: string;
  initialCrop: VideoCropRect | null;
  onApply: (crop: VideoCropRect | null) => void;
  onClose: () => void;
}

type AspectRatioPreset = "custom" | "9:16" | "1:1" | "4:5" | "16:9";

type DragHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move" | "create" | null;

export default function CropVideoModal({
  isOpen,
  videoElement,
  videoUrl,
  initialCrop,
  onApply,
  onClose,
}: CropVideoModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [origW, setOrigW] = useState<number>(1080);
  const [origH, setOrigH] = useState<number>(1920);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Crop atual em pixels nativos do vídeo
  const [crop, setCrop] = useState<VideoCropRect>({
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
  });

  const [preset, setPreset] = useState<AspectRatioPreset>("custom");
  const [lockScale, setLockScale] = useState<boolean>(false);

  // Estado de interação com mouse/touch
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: VideoCropRect;
  } | null>(null);

  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);

  // Inicializa dimensões e crop quando o modal abre
  useEffect(() => {
    if (!isOpen) return;

    const v = videoElement || fallbackVideoRef.current;

    const updateFromVideo = () => {
      const active = videoElement || fallbackVideoRef.current;
      const width = active?.videoWidth && active.videoWidth > 0 ? active.videoWidth : 1080;
      const height = active?.videoHeight && active.videoHeight > 0 ? active.videoHeight : 1920;

      setOrigW(width);
      setOrigH(height);
      if (active && active.readyState >= 1) {
        setIsLoaded(true);
      }
    };

    updateFromVideo();

    if (v) {
      v.addEventListener("loadedmetadata", updateFromVideo);
      v.addEventListener("loadeddata", updateFromVideo);
    }

    const initialW = v?.videoWidth && v.videoWidth > 0 ? v.videoWidth : 1080;
    const initialH = v?.videoHeight && v.videoHeight > 0 ? v.videoHeight : 1920;

    if (initialCrop && initialCrop.width > 20 && initialCrop.height > 20) {
      setCrop({
        x: Math.max(0, Math.min(initialW - 20, initialCrop.x)),
        y: Math.max(0, Math.min(initialH - 20, initialCrop.y)),
        width: Math.min(initialW, initialCrop.width),
        height: Math.min(initialH, initialCrop.height),
      });
      setPreset("custom");
    } else {
      setCrop({
        x: 0,
        y: 0,
        width: initialW,
        height: initialH,
      });
      setPreset("custom");
    }

    return () => {
      if (v) {
        v.removeEventListener("loadedmetadata", updateFromVideo);
        v.removeEventListener("loadeddata", updateFromVideo);
      }
    };
  }, [isOpen, videoElement, initialCrop, videoUrl]);

  // Aplica preset de proporção
  const applyPreset = useCallback(
    (newPreset: AspectRatioPreset) => {
      setPreset(newPreset);
      if (newPreset === "custom") return;

      let targetRatio = 9 / 16;
      if (newPreset === "1:1") targetRatio = 1;
      else if (newPreset === "4:5") targetRatio = 4 / 5;
      else if (newPreset === "16:9") targetRatio = 16 / 9;

      let newW = origW;
      let newH = Math.round(newW / targetRatio);

      if (newH > origH) {
        newH = origH;
        newW = Math.round(newH * targetRatio);
      }

      const newX = Math.round((origW - newW) / 2);
      const newY = Math.round((origH - newH) / 2);

      setCrop({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: Math.min(origW, newW),
        height: Math.min(origH, newH),
      });
    },
    [origW, origH]
  );

  // Desenha no canvas: vídeo + máscara escura + caixa de crop + 8 alças
  const renderCropCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== origW) canvas.width = origW;
    if (canvas.height !== origH) canvas.height = origH;
    ctx.clearRect(0, 0, origW, origH);

    const activeVid = videoElement || fallbackVideoRef.current;

    // 1. Desenha o frame do vídeo
    if (activeVid && activeVid.readyState >= 2) {
      try {
        ctx.drawImage(activeVid, 0, 0, origW, origH);
      } catch {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, origW, origH);
      }
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, origW, origH);
    }

    const { x, y, width, height } = crop;

    // 2. Máscara escura fora do corte
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";

    // Top
    ctx.fillRect(0, 0, origW, Math.max(0, y));
    // Bottom
    ctx.fillRect(0, y + height, origW, Math.max(0, origH - (y + height)));
    // Left
    ctx.fillRect(0, y, Math.max(0, x), height);
    // Right
    ctx.fillRect(x + width, y, Math.max(0, origW - (x + width)), height);

    // 3. Borda do retângulo de corte (Azul vibrante)
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(3, Math.round(origW * 0.003));
    ctx.strokeRect(x, y, width, height);

    // Linha de base vermelha (como na imagem de referência)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = Math.max(3, Math.round(origW * 0.003));
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    // 4. As 8 alças circulares com preenchimento branco e borda azul
    const handleRadius = Math.max(7, Math.round(origW * 0.012));
    const handles = [
      { id: "nw", hx: x, hy: y },
      { id: "n", hx: x + width / 2, hy: y },
      { id: "ne", hx: x + width, hy: y },
      { id: "e", hx: x + width, hy: y + height / 2 },
      { id: "se", hx: x + width, hy: y + height },
      { id: "s", hx: x + width / 2, hy: y + height },
      { id: "sw", hx: x, hy: y + height },
      { id: "w", hx: x, hy: y + height / 2 },
    ];

    handles.forEach(({ hx, hy }) => {
      ctx.beginPath();
      ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.lineWidth = Math.max(2, Math.round(handleRadius * 0.3));
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });

    ctx.restore();
  }, [crop, origW, origH, videoElement]);

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const loop = () => {
      renderCropCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, renderCropCanvas]);

  // Converte coordenadas de tela/mouse para o espaço nativo de pixels do vídeo
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Identifica se o clique foi em uma das 8 alças ou no centro
  const hitTest = (px: number, py: number): DragHandle => {
    const { x, y, width, height } = crop;
    const hitR = Math.max(22, origW * 0.035);

    const handles: { id: DragHandle; hx: number; hy: number }[] = [
      { id: "nw", hx: x, hy: y },
      { id: "ne", hx: x + width, hy: y },
      { id: "se", hx: x + width, hy: y + height },
      { id: "sw", hx: x, hy: y + height },
      { id: "n", hx: x + width / 2, hy: y },
      { id: "s", hx: x + width / 2, hy: y + height },
      { id: "w", hx: x, hy: y + height / 2 },
      { id: "e", hx: x + width, hy: y + height / 2 },
    ];

    for (const h of handles) {
      const dist = Math.hypot(px - h.hx, py - h.hy);
      if (dist <= hitR) return h.id;
    }

    if (px >= x && px <= x + width && py >= y && py <= y + height) {
      return "move";
    }

    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x: px, y: py } = getCanvasCoords(e);
    const handle = hitTest(px, py);

    if (handle) {
      dragRef.current = {
        handle,
        startX: px,
        startY: py,
        startCrop: { ...crop },
      };
    } else {
      // Inicia novo retângulo no clique fora
      dragRef.current = {
        handle: "se",
        startX: px,
        startY: py,
        startCrop: { x: px, y: py, width: 20, height: 20 },
      };
      setCrop({ x: px, y: py, width: 20, height: 20 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!dragRef.current) {
      const { x: px, y: py } = getCanvasCoords(e);
      const h = hitTest(px, py);
      if (h === "nw" || h === "se") canvas.style.cursor = "nwse-resize";
      else if (h === "ne" || h === "sw") canvas.style.cursor = "nesw-resize";
      else if (h === "n" || h === "s") canvas.style.cursor = "ns-resize";
      else if (h === "w" || h === "e") canvas.style.cursor = "ew-resize";
      else if (h === "move") canvas.style.cursor = "move";
      else canvas.style.cursor = "crosshair";
      return;
    }

    const { handle, startX, startY, startCrop } = dragRef.current;
    const { x: currX, y: currY } = getCanvasCoords(e);
    const dx = currX - startX;
    const dy = currY - startY;

    if (handle === "move") {
      let nextX = startCrop.x + dx;
      let nextY = startCrop.y + dy;
      nextX = Math.max(0, Math.min(origW - startCrop.width, nextX));
      nextY = Math.max(0, Math.min(origH - startCrop.height, nextY));
      setCrop((prev) => ({ ...prev, x: nextX, y: nextY }));
      return;
    }

    let { x, y, width, height } = startCrop;
    const isLocked = lockScale || preset !== "custom";
    const ratio = startCrop.width / Math.max(1, startCrop.height);

    if (handle === "se") {
      width = Math.max(40, Math.min(origW - x, startCrop.width + dx));
      if (isLocked) {
        height = Math.round(width / ratio);
      } else {
        height = Math.max(40, Math.min(origH - y, startCrop.height + dy));
      }
    } else if (handle === "e") {
      width = Math.max(40, Math.min(origW - x, startCrop.width + dx));
      if (isLocked) height = Math.round(width / ratio);
    } else if (handle === "s") {
      height = Math.max(40, Math.min(origH - y, startCrop.height + dy));
      if (isLocked) width = Math.round(height * ratio);
    } else if (handle === "sw") {
      const newWidth = Math.max(40, startCrop.width - dx);
      x = Math.max(0, startCrop.x + (startCrop.width - newWidth));
      width = startCrop.x + startCrop.width - x;
      if (isLocked) {
        height = Math.round(width / ratio);
      } else {
        height = Math.max(40, Math.min(origH - y, startCrop.height + dy));
      }
    } else if (handle === "ne") {
      width = Math.max(40, Math.min(origW - x, startCrop.width + dx));
      const newHeight = isLocked ? Math.round(width / ratio) : Math.max(40, startCrop.height - dy);
      y = Math.max(0, startCrop.y + (startCrop.height - newHeight));
      height = startCrop.y + startCrop.height - y;
    } else if (handle === "nw") {
      const newWidth = Math.max(40, startCrop.width - dx);
      x = Math.max(0, startCrop.x + (startCrop.width - newWidth));
      width = startCrop.x + startCrop.width - x;
      const newHeight = isLocked ? Math.round(width / ratio) : Math.max(40, startCrop.height - dy);
      y = Math.max(0, startCrop.y + (startCrop.height - newHeight));
      height = startCrop.y + startCrop.height - y;
    } else if (handle === "n") {
      const newHeight = Math.max(40, startCrop.height - dy);
      y = Math.max(0, startCrop.y + (startCrop.height - newHeight));
      height = startCrop.y + startCrop.height - y;
      if (isLocked) width = Math.round(height * ratio);
    } else if (handle === "w") {
      const newWidth = Math.max(40, startCrop.width - dx);
      x = Math.max(0, startCrop.x + (startCrop.width - newWidth));
      width = startCrop.x + startCrop.width - x;
      if (isLocked) height = Math.round(width / ratio);
    }

    // Clamping seguro aos limites do vídeo
    if (x + width > origW) width = origW - x;
    if (y + height > origH) height = origH - y;

    setCrop({
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.max(40, width),
      height: Math.max(40, height),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleReset = () => {
    setPreset("custom");
    setCrop({
      x: 0,
      y: 0,
      width: origW,
      height: origH,
    });
  };

  const handleApply = () => {
    // Se o corte for praticamente o vídeo inteiro (99%+), passa null para renderizar direto sem overhead
    const isFullVideo =
      crop.x <= 2 &&
      crop.y <= 2 &&
      Math.abs(crop.width - origW) <= 4 &&
      Math.abs(crop.height - origH) <= 4;

    if (isFullVideo) {
      onApply(null);
    } else {
      onApply(crop);
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentRatio = (crop.width / Math.max(1, crop.height)).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1080px",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 25px 60px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "94vh",
        }}
      >
        {/* CABEÇALHO */}
        <div
          style={{
            padding: "16px 22px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>Crop Video</span>
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Ajuste a área de corte do video arrastando as bordas ou movendo a área selecionada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 8px",
              lineHeight: 1,
              borderRadius: 6,
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* CORPO DO MODAL: BARRA LATERAL + ÁREA DE CROP */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "460px" }}>
          {/* BARRA LATERAL ESQUERDA (CONFIGURAÇÕES PRECISAS) */}
          <div
            style={{
              width: "270px",
              background: "#ffffff",
              borderRight: "1px solid #e2e8f0",
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto",
            }}
          >
            {/* Seletor de Dimensão */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 8,
                }}
              >
                Dimensão:
              </label>
              <select
                value={preset}
                onChange={(e) => applyPreset(e.target.value as AspectRatioPreset)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="custom">Personalizada</option>
                <option value="9:16">9:16 (Reels/TikTok/Story)</option>
                <option value="1:1">1:1 (Quadrado Feed)</option>
                <option value="4:5">4:5 (Feed Retrato)</option>
                <option value="16:9">16:9 (Horizontal)</option>
              </select>
            </div>

            {/* Configurações Precisas */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 10,
                  letterSpacing: "0.2px",
                }}
              >
                Configurações precisas
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>X:</span>
                  <b style={{ color: "#0f172a", fontFamily: "monospace" }}>{crop.x.toFixed(2)}px</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Y:</span>
                  <b style={{ color: "#0f172a", fontFamily: "monospace" }}>{crop.y.toFixed(2)}px</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Largura:</span>
                  <b style={{ color: "#0f172a", fontFamily: "monospace" }}>{crop.width.toFixed(2)}px</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Altura:</span>
                  <b style={{ color: "#0f172a", fontFamily: "monospace" }}>{crop.height.toFixed(2)}px</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginTop: 4 }}>
                  <span>Proporção:</span>
                  <b style={{ color: "#0f172a" }}>{currentRatio}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Preset:</span>
                  <b style={{ color: "#0f172a" }}>{preset}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginTop: 6, paddingTop: 6, borderTop: "1px dashed #e2e8f0" }}>
                  <span>Video Original:</span>
                  <b style={{ color: "#0f172a" }}>{origW}x{origH}</b>
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                Status
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#16a34a" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                <span>{isLoaded ? "Carregado" : "Aguardando vídeo"}</span>
              </div>
            </div>
          </div>

          {/* ÁREA CENTRAL / CANVAS ESCURO COM GUIA DE CORTE */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              background: "#18181b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* CHECKBOX TRAVAR ESCALA NO TOPO DIREITO */}
            <label
              style={{
                position: "absolute",
                top: 14,
                right: 18,
                zIndex: 10,
                background: "rgba(24, 24, 27, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 11,
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                userSelect: "none",
                backdropFilter: "blur(4px)",
              }}
            >
              <input
                type="checkbox"
                checked={lockScale}
                onChange={(e) => setLockScale(e.target.checked)}
                style={{ accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span>Travar escala</span>
            </label>

            {/* CANVAS INTERATIVO DE CORTE */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                maxWidth: "100%",
                maxHeight: "58vh",
                aspectRatio: `${origW}/${origH}`,
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
                borderRadius: 4,
                touchAction: "none",
                userSelect: "none",
              }}
            />
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "7px 18px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Resetar
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 18px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              padding: "7px 24px",
              background: "#2563eb",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
            }}
          >
            Aplicar
          </button>
        </div>
        {!videoElement && videoUrl && (
          <video
            ref={fallbackVideoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ display: "none" }}
          />
        )}
      </div>
    </div>
  );
}
