"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, RotateCw, Crop } from "lucide-react";

interface CropEditorProps {
  imageUrl: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export function CropEditor({ imageUrl, onCrop, onCancel }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [hasCrop, setHasCrop] = useState(false);

  // Bild laden und zeichnen
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const maxH = window.innerHeight * 0.6;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      setImgSize({ w, h });

      // Standard-Zuschnitt: mittlere 80% (wo meistens der Text ist)
      const cx = Math.round(w * 0.1);
      const cy = Math.round(h * 0.2);
      const cw = Math.round(w * 0.8);
      const ch = Math.round(h * 0.6);
      setCrop({ x: cx, y: cy, w: cw, h: ch });
      setHasCrop(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Canvas zeichnen
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize.w) return;

    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Bild zeichnen
    ctx.drawImage(img, 0, 0, imgSize.w, imgSize.h);

    // Abgedunkelter Bereich außerhalb des Zuschnitts
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, imgSize.w, imgSize.h);

    // Zuschnitt-Bereich heller zeichnen
    ctx.clearRect(crop.x, crop.y, crop.w, crop.h);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, crop.x, crop.y, crop.w, crop.h);

    // Rahmen um den Zuschnitt
    ctx.strokeStyle = "#e9a13b";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    // Griffe an den Ecken
    const g = 12;
    ctx.fillStyle = "#e9a13b";
    ctx.setLineDash([]);
    // Oben links
    ctx.fillRect(crop.x - g / 2, crop.y - g / 2, g, g);
    // Oben rechts
    ctx.fillRect(crop.x + crop.w - g / 2, crop.y - g / 2, g, g);
    // Unten links
    ctx.fillRect(crop.x - g / 2, crop.y + crop.h - g / 2, g, g);
    // Unten rechts
    ctx.fillRect(crop.x + crop.w - g / 2, crop.y + crop.h - g / 2, g, g);
  }, [crop, imgSize]);

  // Maus/Touch-Events
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(imgSize.w, clientX - rect.left)),
      y: Math.max(0, Math.min(imgSize.h, clientY - rect.top)),
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setStart(pos);
    setDrawing(true);
    setHasCrop(false);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const x = Math.min(start.x, pos.x);
    const y = Math.min(start.y, pos.y);
    const w = Math.abs(pos.x - start.x);
    const h = Math.abs(pos.y - start.y);
    if (w > 10 && h > 10) {
      setCrop({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      setHasCrop(true);
    }
  };

  const handleEnd = () => {
    setDrawing(false);
  };

  // Zuschnitt anwenden
  const applyCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !hasCrop) return;

    const canvas = document.createElement("canvas");
    const scaleX = img.width / imgSize.w;
    const scaleY = img.height / imgSize.h;
    canvas.width = Math.round(crop.w * scaleX);
    canvas.height = Math.round(crop.h * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      Math.round(crop.x * scaleX),
      Math.round(crop.y * scaleY),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        onCrop(file);
      }
    }, "image/jpeg", 0.92);
  }, [crop, imgSize, hasCrop, onCrop]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Crop className="size-5 text-amber" />
          <span className="font-semibold text-paper">Zuschnitt-Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost !px-3 !py-1.5 !text-xs"
            onClick={() => {
              // Standard-Zuschnitt zurücksetzen
              const cx = Math.round(imgSize.w * 0.1);
              const cy = Math.round(imgSize.h * 0.2);
              const cw = Math.round(imgSize.w * 0.8);
              const ch = Math.round(imgSize.h * 0.6);
              setCrop({ x: cx, y: cy, w: cw, h: ch });
              setHasCrop(true);
            }}
          >
            <RotateCw className="size-3.5" />
            Zurücksetzen
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 !text-xs text-clay" onClick={onCancel}>
            <X className="size-3.5" />
            Abbrechen
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full touch-none cursor-crosshair rounded-lg"
          style={{ width: imgSize.w, height: imgSize.h }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-center text-xs text-mute">
          Zeichne ein Rechteck um das Info-Feld des Reiseführers
        </p>
        <button
          className="btn btn-amber w-full !py-3"
          onClick={applyCrop}
          disabled={!hasCrop}
        >
          <Check className="size-4.5" strokeWidth={2.6} />
          {hasCrop ? "Zuschnitt anwenden & OCR starten" : "Bild komplett senden"}
        </button>
      </div>
    </div>
  );
}
