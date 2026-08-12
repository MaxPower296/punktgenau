"use client";
import { useRef, useState, useEffect } from "react";
export function CropEditor({ src, onCrop, onCancel }: { src: string; onCrop: (blob: Blob)=>void; onCancel: ()=>void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState({ x: 10, y: 10, w: 80, h: 60 });
  const dragging = useRef(false);
  const doCrop = async () => {
    const img = imgRef.current; const canvas = canvasRef.current; if (!img || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const sx = (rect.x/100)*img.naturalWidth;
    const sy = (rect.y/100)*img.naturalHeight;
    const sw = (rect.w/100)*img.naturalWidth;
    const sh = (rect.h/100)*img.naturalHeight;
    canvas.width = sw; canvas.height = sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(b=>{ if(b) onCrop(b); }, "image/jpeg", 0.92);
  };
  return (
    <div className="fixed inset-0 z-[80] bg-ink/90 flex flex-col p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Zuschnitt wählen</h3>
        <button onClick={onCancel} className="btn btn-ghost !py-1">Abbrechen</button>
      </div>
      <div className="relative flex-1 grid place-items-center overflow-hidden rounded-xl border border-line bg-panel">
        <img ref={imgRef} src={src} alt="" className="max-h-[70vh] max-w-full object-contain" draggable={false}/>
        <div className="absolute border-2 border-amber bg-amber/10" style={{left:`${rect.x}%`, top:`${rect.y}%`, width:`${rect.w}%`, height:`${rect.h}%`}} />
        <div className="absolute inset-0 flex">
          <input type="range" min={0} max={80} value={rect.x} onChange={e=>setRect({...rect,x:parseInt(e.target.value)})} className="absolute bottom-2 left-2 right-2" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden"/>
      <div className="flex gap-2 mt-3">
        <button onClick={doCrop} className="btn btn-amber flex-1">Zuschneiden & Scannen</button>
        <button onClick={onCancel} className="btn btn-ghost">Original nutzen</button>
      </div>
      <p className="text-xs text-dim mt-2 text-center">Tipp: Auf Mobil einfach das beige Info-Feld möglichst vollflächig einrahmen.</p>
    </div>
  );
}
