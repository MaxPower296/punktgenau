"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, CheckCircle2, ArrowRight, Globe, Menu, Download } from "lucide-react";

export default function InstallPage() {
  const [url, setUrl] = useState("");
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin);
    const ua = navigator.userAgent;
    setIsAndroid(/android/i.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }, []);

  if (isStandalone) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card max-w-md p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 size-16 text-sage" />
          <h1 className="font-display text-3xl">Bereits installiert! ✅</h1>
          <p className="mt-3 text-mute">Punktgenau läuft als App auf diesem Gerät.</p>
          <Link href="/scan" className="btn btn-amber mt-6">
            <ArrowRight className="size-4" />
            Zur App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card p-8 text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-amber/15 text-amber">
          <Download className="size-10" />
        </div>
        <h1 className="font-display text-3xl tracking-tight">
          <span className="text-amber">Punktgenau</span> installieren
        </h1>
        <p className="mt-3 text-sm text-mute">
          Installiere die App auf deinem Startbildschirm für schnellen Zugriff,
          Vollbildmodus und Offline-Nutzung.
        </p>

        {/* Android Anleitung */}
        <div className="mt-8 space-y-4 text-left">
          <h2 className="flex items-center gap-2 font-semibold text-paper">
            <Smartphone className="size-5 text-amber" />
            Android (Chrome)
          </h2>
          
          <div className="space-y-3">
            <Step nr={1} text="Öffne diese Seite in Chrome" icon={<Globe className="size-4" />} />
            <Step nr={2} text="Tippe oben rechts auf die drei Punkte (⋮)" icon={<Menu className="size-4" />} />
            <Step nr={3} text={'Wähle "App installieren"'} icon={<Download className="size-4" />} />
            <Step nr={4} text={'Bestätige mit "Installieren"'} icon={<CheckCircle2 className="size-4" />} />
          </div>

          <div className="rounded-lg border border-amber/30 bg-amber/10 p-3 text-xs text-amber">
            <strong>Tipp:</strong> Falls nur &quot;Verknüpfung erstellen&quot; erscheint:
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Seite neu laden (Aktualisieren-Symbol ↻)</li>
              <li>5 Sekunden warten</li>
              <li>Nochmal Chrome-Menü öffnen</li>
            </ul>
          </div>
        </div>

        {/* QR Code für andere Geräte */}
        {url && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 text-xs text-dim">
              QR-Code für andere Geräte scannen:
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=14180f&color=e9a13b`}
              alt="QR Code"
              className="mx-auto rounded-xl border border-line"
              width={200}
              height={200}
            />
            <p className="mt-2 break-all font-mono text-[10px] text-dim">{url}</p>
          </div>
        )}

        <Link href="/" className="btn btn-ghost mt-8 w-full">
          <ArrowRight className="size-4" />
          Zurück zur App
        </Link>
      </div>
    </div>
  );
}

function Step({ nr, text, icon }: { nr: number; text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber text-xs font-bold text-ink">
        {nr}
      </span>
      <span className="flex items-center gap-2 text-sm text-paper">
        {icon}
        {text}
      </span>
    </div>
  );
}
