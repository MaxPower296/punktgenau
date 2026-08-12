"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, Map as MapIcon, ScanLine, Download } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa-install";

const NAV = [
  { href: "/scan", label: "Scannen", icon: ScanLine },
  { href: "/maps", label: "Karten", icon: MapIcon },
  { href: "/install", label: "Installieren", icon: Download },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl border border-line-2 bg-panel text-amber transition-transform duration-300 group-hover:-rotate-90">
            <Crosshair className="size-4.5" strokeWidth={2.2} />
          </span>
          <span className="leading-none">
            <span className="font-display block text-lg tracking-tight">Punktgenau</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
              Reiseführer → Karte
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-mute hover:bg-panel hover:text-paper"
          >
            <ScanLine className="size-3.5" />
            <span className="hidden sm:inline">Scannen</span>
          </Link>
          <Link
            href="/maps"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-mute hover:bg-panel hover:text-paper"
          >
            <MapIcon className="size-3.5" />
            <span className="hidden sm:inline">Karten</span>
          </Link>
          <Link
            href="/install"
            className="flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-2.5 py-1.5 text-xs font-semibold text-amber hover:bg-amber/20"
          >
            <Download className="size-3.5" />
            App
          </Link>
          <Link href="/scan" className="btn btn-amber !py-1.5 !px-3 !text-xs ml-1">
            <ScanLine className="size-3.5" strokeWidth={2.4} />
            Punkt erfassen
          </Link>
        </nav>
      </div>
    </header>
  );
}
