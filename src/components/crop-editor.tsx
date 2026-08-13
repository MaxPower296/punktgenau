"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { X, Crop, RotateCw, Check, AlertTriangle, Maximize2, ScanLine } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };
type DragMode = null | "move" | "tl" | "tr" | "bl" | "br" | "draw";

export function CropEditor({ src, onCrop, onCancel }: { src: string; onCrop: (blob: Blob)=>void; onCancel: ()=>void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState<Rect>({ x: 8, y: 10, w: 84, h: 68 });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef<{ x:number; y:number; rect: Rect }|null>(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState<{w:number,h:number}|null>(null);

  // reset when src changes
  useEffect(()=> {
    setImgLoaded(false);
    setImgError(false);
    setRect({ x: 8, y: 10, w: 84, h: 68 });
  }, [src]);

  const getWrapperRect = useCallback(()=> wrapperRef.current?.getBoundingClientRect() ?? null, []);

  const handlePointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragMode(mode);
    dragStart.current = { x: e.clientX, y: e.clientY, rect: { ...rect } };
  };

  // Draw new rectangle by dragging on background
  const handleWrapperPointerDown = (e: React.PointerEvent) => {
    // only if clicking on wrapper/image itself, not on rect/handles
    const target = e.target as HTMLElement;
    if (target.closest("[data-crop-handle]") || target.closest("[data-crop-rect]")) return;
    const wr = getWrapperRect();
    if (!wr) return;
    const xPct = ((e.clientX - wr.left) / wr.width) * 100;
    const yPct = ((e.clientY - wr.top) / wr.height) * 100;
    const newRect: Rect = { x: Math.max(0, Math.min(92, xPct)), y: Math.max(0, Math.min(92, yPct)), w: 8, h: 8 };
    setRect(newRect);
    setDragMode("br");
    dragStart.current = { x: e.clientX, y: e.clientY, rect: newRect };
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: PointerEvent) => {
      const wr = getWrapperRect();
      if (!wr || !dragStart.current) return;
      const dxPct = ((e.clientX - dragStart.current.x) / wr.width) * 100;
      const dyPct = ((e.clientY - dragStart.current.y) / wr.height) * 100;
      const orig = dragStart.current.rect;
      let next: Rect = { ...orig };

      if (dragMode === "move") {
        next.x = Math.min(100 - orig.w, Math.max(0, orig.x + dxPct));
        next.y = Math.min(100 - orig.h, Math.max(0, orig.y + dyPct));
      } else if (dragMode === "tl") {
        next.x = Math.min(orig.x + orig.w - 8, Math.max(0, orig.x + dxPct));
        next.y = Math.min(orig.y + orig.h - 8, Math.max(0, orig.y + dyPct));
        next.w = orig.w - (next.x - orig.x);
        next.h = orig.h - (next.y - orig.y);
      } else if (dragMode === "tr") {
        next.y = Math.min(orig.y + orig.h - 8, Math.max(0, orig.y + dyPct));
        next.w = Math.max(8, Math.min(100 - orig.x, orig.w + dxPct));
        next.h = orig.h - (next.y - orig.y);
      } else if (dragMode === "bl") {
        next.x = Math.min(orig.x + orig.w - 8, Math.max(0, orig.x + dxPct));
        next.w = orig.w - (next.x - orig.x);
        next.h = Math.max(8, Math.min(100 - orig.y, orig.h + dyPct));
      } else if (dragMode === "br" || dragMode === "draw") {
        next.w = Math.max(8, Math.min(100 - orig.x, orig.w + dxPct));
        next.h = Math.max(8, Math.min(100 - orig.y, orig.h + dyPct));
      }
      next.w = Math.max(8, Math.min(100 - next.x, next.w));
      next.h = Math.max(8, Math.min(100 - next.y, next.h));
      setRect(next);
    };
    const onUp = () => {
      setDragMode(null);
      dragStart.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragMode, getWrapperRect]);

  const doCrop = async () => {
    const img = imgRef.current; const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (!img.naturalWidth || !img.naturalHeight) {
      try { const r = await fetch(src); const b = await r.blob(); onCrop(b); return; } catch { return; }
    }
    // use natural size for best quality
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    // clamp rect to image
    const clamped = {
      x: Math.max(0, Math.min(100, rect.x)),
      y: Math.max(0, Math.min(100, rect.y)),
      w: Math.max(8, Math.min(100, rect.w)),
      h: Math.max(8, Math.min(100, rect.h)),
    };
    const sx = Math.round((clamped.x/100)*nw);
    const sy = Math.round((clamped.y/100)*nh);
    const sw = Math.round((clamped.w/100)*nw);
    const sh = Math.round((clamped.h/100)*nh);
    const cw = Math.max(120, sw);
    const ch = Math.max(120, sh);
    canvas.width = cw;
    canvas.height = ch;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,cw,ch);
    // high quality
    ctx.imageSmoothingEnabled = true;
    // @ts-ignore
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    canvas.toBlob(b=>{ if(b) onCrop(b); else fetch(src).then(r=>r.blob()).then(bl=> onCrop(bl)); }, "image/jpeg", 0.90);
  };

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (img) setImgSize({w: img.naturalWidth, h: img.naturalHeight});
    setImgLoaded(true);
  };

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-ink/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5 shrink-0">
        <h3 className="flex items-center gap-2 font-semibold text-sm"><Crop className="size-4 text-amber"/> Zuschnitt wählen</h3>
        <button onClick={onCancel} className="btn btn-ghost !py-1.5 !px-3 !text-xs shrink-0"><X className="size-4"/> Schließen</button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col items-center gap-3 p-3 min-h-0">
        <p className="text-center text-xs leading-relaxed text-mute max-w-[36rem] shrink-0">
          Tippe &amp; ziehe auf dem Bild, um einen <span className="text-amber font-medium">gelben Rahmen</span> zu erstellen.
          Ziehe den Rahmen nur um das <b className="text-paper">beige Info-Feld</b> mit <span className="font-mono text-paper">GPS: N ...</span>.
        </p>

        {/* Wrapper - hugs image */}
        <div
          ref={wrapperRef}
          className="relative inline-block max-w-full shrink-0 select-none touch-none shadow-2xl rounded-xl overflow-hidden border border-line bg-black"
          onPointerDown={handleWrapperPointerDown}
          style={{ touchAction: "none" }}
        >
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 text-xs text-mute p-6 min-h-[200px] min-w-[280px]">
              <span className="flex items-center gap-2"><ScanLine className="size-4 animate-pulse"/> Bild lädt…</span>
            </div>
          )}
          {imgError && (
            <div className="relative z-10 grid place-items-center bg-clay/10 text-clay p-8 text-xs text-center min-h-[220px] min-w-[300px]">
              <div>
                <AlertTriangle className="size-7 mx-auto mb-2"/>
                Bild konnte nicht angezeigt werden.<br/>Tipp auf „Original nutzen“ um trotzdem zu scannen.
              </div>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Zum Zuschneiden - ziehe zum Rahmen erstellen"
            className="block h-auto w-auto max-h-[56vh] max-w-[92vw] md:max-h-[60vh] md:max-w-[640px] object-contain select-none"
            style={{ display: imgError ? "none" : "block" }}
            draggable={false}
            onLoad={handleImgLoad}
            onError={()=> setImgError(true)}
          />
          {/* Overlay - only when loaded */}
          {imgLoaded && !imgError && (
            <>
              {/* darken outside */}
              <div className="absolute inset-0 bg-black/55 pointer-events-none" style={{
                clipPath: `polygon(0% 0%, 0% 100%, ${rect.x}% 100%, ${rect.x}% ${rect.y}%, ${rect.x+rect.w}% ${rect.y}%, ${rect.x+rect.w}% ${rect.y+rect.h}%, ${rect.x}% ${rect.y+rect.h}%, ${rect.x}% 100%, 100% 100%, 100% 0%)`
              }}/>
              {/* selection rect */}
              <div
                data-crop-rect
                className="absolute border-[2.5px] border-amber bg-amber/10 cursor-move touch-none"
                style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`, touchAction: "none" }}
                onPointerDown={(e)=>handlePointerDown(e,"move")}
              >
                {/* 3x3 grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                  <div className="border-r border-amber"></div><div className="border-r border-amber"></div><div></div>
                  <div className="border-t border-r border-amber"></div><div className="border-t border-r border-amber"></div><div className="border-t border-amber"></div>
                  <div className="border-t border-r border-amber"></div><div className="border-t border-r border-amber"></div><div className="border-t border-amber"></div>
                </div>
                {/* corner handles - extra large for thumb */}
                <div data-crop-handle onPointerDown={(e)=>handlePointerDown(e,"tl")} className="absolute -top-4 -left-4 size-8 rounded-full bg-amber border-[3px] border-white shadow-lg touch-none flex items-center justify-center active:scale-110 transition-transform"><div className="size-2 rounded-full bg-white/80"/></div>
                <div data-crop-handle onPointerDown={(e)=>handlePointerDown(e,"tr")} className="absolute -top-4 -right-4 size-8 rounded-full bg-amber border-[3px] border-white shadow-lg touch-none active:scale-110 transition-transform"></div>
                <div data-crop-handle onPointerDown={(e)=>handlePointerDown(e,"bl")} className="absolute -bottom-4 -left-4 size-8 rounded-full bg-amber border-[3px] border-white shadow-lg touch-none active:scale-110 transition-transform"></div>
                <div data-crop-handle onPointerDown={(e)=>handlePointerDown(e,"br")} className="absolute -bottom-4 -right-4 size-8 rounded-full bg-amber border-[3px] border-white shadow-lg touch-none active:scale-110 transition-transform"></div>
                {/* center hint */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-ink/85 text-amber rounded-full p-2 pointer-events-none shadow-md border border-amber/30">
                  <Crop className="size-4"/>
                </div>
                {/* size label */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-ink/90 text-paper text-[10px] font-mono px-2 py-1 rounded-full border border-line whitespace-nowrap pointer-events-none">
                  {Math.round(rect.w)}% × {Math.round(rect.h)}%
                </div>
              </div>
            </>
          )}
        </div>

        {imgSize && (
          <p className="text-[10px] font-mono text-dim">
            Original: {imgSize.w} × {imgSize.h} px • Auswahl: {Math.round((rect.w/100)*imgSize.w)} × {Math.round((rect.h/100)*imgSize.h)} px
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 shrink-0">
          <button onClick={()=> setRect({ x: 6, y: 8, w: 88, h: 74 })} className="btn btn-ghost !py-1.5 !text-xs"><Maximize2 className="size-3"/> Beige Feld</button>
          <button onClick={()=> setRect({x:2,y:2,w:96,h:96})} className="btn btn-ghost !py-1.5 !text-xs"><ScanLine className="size-3"/> Vollbild</button>
          <button onClick={()=> setRect({x: 8, y: 20, w: 84, h: 40})} className="btn btn-ghost !py-1.5 !text-xs"><Crop className="size-3"/> Nur GPS-Zeile</button>
        </div>
        <p className="text-[11px] text-dim text-center max-w-md">
          Tipp: Ziehe direkt auf dem Bild zum neuen Rahmen. An den <span className="text-amber">gelben Punkten</span> kannst du die Ecken ziehen. In der Mitte verschiebst du.
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden"/>
      <div className="border-t border-line bg-panel p-3 flex gap-2 shrink-0 safe-pb">
        <button onClick={doCrop} className="btn btn-amber flex-1 !py-3.5 text-[15px] font-semibold"><Check className="size-5"/> Zuschneiden & Scannen</button>
        <button onClick={onCancel} className="btn btn-ghost !py-3.5 !px-5">Original nutzen</button>
      </div>
    </div>
  );
}
