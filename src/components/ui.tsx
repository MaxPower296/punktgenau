"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

/* ---------- Mini-Toast-System ---------- */
type ToastMsg = { id: number; text: string; kind: "ok" | "err" };

export function vibrate(pattern: number | number[]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignorieren falls gesperrt */
    }
  }
}
let toastId = 0;

export function toast(text: string, kind: "ok" | "err" = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pg-toast", { detail: { text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { text, kind } = (e as CustomEvent).detail as { text: string; kind: "ok" | "err" };
      const id = ++toastId;
      setItems((prev) => [...prev, { id, text, kind }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
    };
    window.addEventListener("pg-toast", onToast);
    return () => window.removeEventListener("pg-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`anim-fade-up pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${
            t.kind === "ok"
              ? "border-line-2 bg-panel/95 text-paper"
              : "border-clay/50 bg-panel/95 text-clay"
          }`}
        >
          {t.kind === "ok" ? (
            <CheckCircle2 className="size-4.5 shrink-0 text-amber" />
          ) : (
            <AlertTriangle className="size-4.5 shrink-0" />
          )}
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-dim hover:text-paper"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Formular-Primitive ---------- */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
        {label}
        {hint ? <span className="normal-case tracking-normal text-dim/70">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-sage">{children}</h2>
      {right}
    </div>
  );
}
