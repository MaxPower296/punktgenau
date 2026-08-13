"use client";

import { useCallback, useRef, useState } from "react";
import { Check, X, Crop } from "lucide-react";

interface CropEditorProps {
  imageUrl: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export function CropEditor({ imageUrl, onCrop, onCancel }: CropEditorProps) {
  const [box, setBox] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [drawing, setDrawing] = useState(false);
  const [hasCrop, setHasCrop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    setDrawing(true);
    setHasCrop(false);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setBox((prev) => ({ ...prev, x2: pos.x, y2: pos.y }));
  };

  const handleEnd = () => {
    setDrawing(false);
    setHasCrop(true);
  };

  const cropStyle = (() => {
    const x = Math.min(box.x1, box.x2);
    const y = Math.min(box.y1, box.y2);
    const w = Math.abs(box.x2 - box.x1);
    const h = Math.abs(box.y2 - box.y1);
    if (w < 2 || h < 2) {
      // Standard: mittlerer Bereich
      return { left: "5%", top: "10%", width: "90%", height: "80%" };
    }
    return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
  })();

  const applyCrop = useCallback(async () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const x = Math.min(box.x1, box.x2) / 100;
      const y = Math.min(box.y1, box.y2) / 100;
      const w = Math.abs(box.x2 - box.x1) / 100;
      const h = Math.abs(box.y2 - box.y1) / 100;

      let sx: number, sy: number, sw: number, sh: number;
      if (w < 0.02 || h < 0.02) {
        // Kein Zuschnitt – ganzes Bild
        sx = 0; sy = 0; sw = img.width; sh = img.height;
      } else {
        sx = Math.round(x * img.width);
        sy = Math.round(y * img.height);
        sw = Math.round(w * img.width);
        sh = Math.round(h * img.height);
      }

      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob((blob) => {
        if (blob) onCrop(new File([blob], "crop.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.92);
    };
    img.src = imageUrl;
  }, [box, imageUrl, onCrop]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Crop className="size-5 text-amber" />
          <span className="font-semibold text-paper">Zuschnitt-Editor</span>
        </div>
        <button className="btn btn-ghost !px-3 !py-1.5 !text-xs text-clay" onClick={onCancel}>
          <X className="size-3.5" /> Abbrechen
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
        <div
          ref={containerRef}
          className="relative touch-none cursor-crosshair"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Zuschnitt" className="max-h-[65vh] max-w-full rounded-lg" draggable={false} />
          {/* Overlay mit Zuschnitt-Box */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Abgedunkelte Ränder */}
            <div className="absolute inset-0 bg-black/50" />
            {/* Heller Bereich (Zuschnitt) */}
            <div
              className="absolute border-2 border-dashed border-amber bg-transparent"
              style={cropStyle}
            />
            {/* Ecken-Griffe */}
            <div className="absolute size-4 border-2 border-amber bg-ink rounded-sm" style={{ left: cropStyle.left, top: cropStyle.top, transform: "translate(-50%, -50%)" }} />
            <div className="absolute size-4 border-2 border-amber bg-ink rounded-sm" style={{ left: `calc(${cropStyle.left} + ${cropStyle.width})`, top: cropStyle.top, transform: "translate(-50%, -50%)" }} />
            <div className="absolute size-4 border-2 border-amber bg-ink rounded-sm" style={{ left: cropStyle.left, top: `calc(${cropStyle.top} + ${cropStyle.height})`, transform: "translate(-50%, -50%)" }} />
            <div className="absolute size-4 border-2 border-amber bg-ink rounded-sm" style={{ left: `calc(${cropStyle.left} + ${cropStyle.width})`, top: `calc(${cropStyle.top} + ${cropStyle.height})`, transform: "translate(-50%, -50%)" }} />
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-center text-xs text-mute">
          Zeichne mit dem Finger ein Rechteck um das Info-Feld
        </p>
        <button className="btn btn-amber w-full !py-3" onClick={applyCrop}>
          <Check className="size-4.5" strokeWidth={2.6} />
          Zuschnitt anwenden & OCR starten
        </button>
      </div>
    </div>
  );
}
