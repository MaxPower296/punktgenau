"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, Map as MapIcon, ScanLine } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa-install";

const NAV = [
  { href: "/scan", label: "Scannen", icon: ScanLine },
  { href: "/maps", label: "Karten", icon: MapIcon },
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

        <nav className="ml-auto flex items-center gap-1.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber/15 text-amber-soft"
                    : "text-mute hover:bg-panel hover:text-paper"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <PwaInstallButton compact />
          <Link href="/scan" className="btn btn-amber ml-2 hidden sm:inline-flex !py-2">
            <ScanLine className="size-4" strokeWidth={2.4} />
            Punkt erfassen
          </Link>
        </nav>
      </div>
    </header>
  );
}
