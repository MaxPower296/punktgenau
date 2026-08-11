"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ScanLine,
  MapPin,
  Navigation,
  Compass,
  RotateCw,
  Layers,
  Download,
  ShieldCheck,
  LocateFixed,
  ChevronRight,
  ClipboardType,
  Mountain,
  FileText,
  Smartphone,
  WifiOff,
} from "lucide-react";
import type { MapWithCount } from "@/lib/types";

const STEPS = [
  {
    icon: Camera,
    nr: "01",
    title: "Infotafel fotografieren",
    text: "GPS-Zeile aus dem Reiseführer abfotografieren oder ein vorhandenes Bild einfügen – OCR erkennt den Text vollautomatisch, selbst kopfstehend.",
  },
  {
    icon: ScanLine,
    nr: "02",
    title: "Ergebnis prüfen & ergänzen",
    text: "Koordinaten (DMS, DDM oder DD), Name, Ausstattung, Preise und Anfahrt werden extrahiert – alles zur Kontrolle editierbar, mit Karten-Vorschau.",
  },
  {
    icon: Navigation,
    nr: "03",
    title: "Speichern & navigieren",
    text: "Der Punkt landet auf deiner Karte. Ein Klick öffnet Google Maps zur Navigation – oder du exportierst alles als KML, CSV, GeoJSON oder GPX.",
  },
];

const FEATURES = [
  {
    icon: Compass,
    title: "Alle GPS-Formate",
    text: "Grad-Minuten-Sekunden (hddd° mm′ ss.s″), Dezimalminuten, reine Dezimalgrade, mit N/S/E/W/O oder Vorzeichen – inklusive deutscher Dezimalkommas.",
  },
  {
    icon: RotateCw,
    title: "Drehungserkennung",
    text: "Fotos, die auf dem Kopf oder quer aufgenommen wurden, werden automatisch in bis zu vier Ausrichtungen analysiert.",
  },
  {
    icon: Layers,
    title: "Mehrere Karten",
    text: "Eine Karte pro Tour, Region oder Reiseführer – mit eigener Farbe für alle Pins.",
  },
  {
    icon: Download,
    title: "Export: KML · CSV · GeoJSON · GPX",
    text: "Für Google Earth, Basecamp, dein Navi oder jede GIS-Software – mit einem Klick pro Karte.",
  },
  {
    icon: ShieldCheck,
    title: "Duplikat-Schutz & Plausibilität",
    text: "Punkte näher als 100 m an einem vorhandenen Ort werden als mögliches Duplikat markiert; Koordinaten werden auf gültige Bereiche geprüft.",
  },
  {
    icon: LocateFixed,
    title: "EXIF-Fallback",
    text: "Enthält dein Foto selbst einen GPS-Standort, kannst du ihn per Klick übernehmen – falls die OCR einmal scheitert.",
  },
  {
    icon: ClipboardType,
    title: "Zwischenablage-Modus",
    text: "Koordinaten auch ohne Foto: Text aus eBooks, PDFs oder Webseiten einfügen und sofort parsen lassen.",
  },
  {
    icon: Mountain,
    title: "Reiseführer-Felder",
    text: "Nummer, Kategorie, Höhe, max. WOMOs, Ausstattung, Beschreibung, Preise, Anfahrt und Telefon werden mit erkannt.",
  },
];

export default function HomePage() {
  const [maps, setMaps] = useState<MapWithCount[] | null>(null);

  useEffect(() => {
    fetch("/api/maps")
      .then((r) => r.json())
      .then((d: { maps: MapWithCount[] }) => setMaps(d.maps))
      .catch(() => setMaps([]));
  }, []);

  const totalPoints = maps?.reduce((n, m) => n + m.pointCount, 0) ?? 0;

  return (
    <div className="flex-1">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, #e9a13b 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-10 hidden select-none font-mono text-[11px] leading-loose text-amber/30 lg:block xl:right-32">
          {["N 47°35'10.0″", "E 7°37'04.4″", "— 260 m —", "N 46°48'15.6″", "E 6°28'46.8″", "— 1.241 m —"].map(
            (line, i) => (
              <p key={i} style={{ transform: `translateX(${(i % 3) * 18}px)` }}>
                {line}
              </p>
            )
          )}
        </div>

        <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="anim-fade-up font-mono text-[11px] uppercase tracking-[0.32em] text-amber">
            Reiseführer · OCR · Karte
          </p>
          <h1
            className="font-display anim-fade-up mt-4 max-w-4xl text-[13vw] leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl"
            style={{ animationDelay: "0.08s" }}
          >
            Foto rein.
            <br />
            <span className="italic text-amber">Punkt</span> auf der Karte.
          </h1>
          <p
            className="anim-fade-up mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            Punktgenau liest GPS-Koordinaten direkt aus Fotos deines Reiseführers – Grad,
            Minuten, Sekunden und jedes andere Format. Prüfen, speichern, mit Google Maps
            hinfahren.
          </p>
          <div
            className="anim-fade-up mt-9 flex flex-wrap gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <Link href="/scan" className="btn btn-amber !px-6 !py-3.5 !text-sm">
              <Camera className="size-4.5" />
              Jetzt Punkt scannen
            </Link>
            <Link href="/maps" className="btn btn-ghost !px-6 !py-3.5 !text-sm">
              <MapPin className="size-4.5" />
              Meine Karten
            </Link>
          </div>

          <div
            className="anim-fade-up mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-line pt-6"
            style={{ animationDelay: "0.32s" }}
          >
            <div>
              <p className="font-display text-4xl text-amber">{maps ? maps.length : "–"}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                {maps?.length === 1 ? "Karte" : "Karten"}
              </p>
            </div>
            <div>
              <p className="font-display text-4xl text-amber">{maps ? totalPoints : "–"}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">Punkte</p>
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-4xl text-paper/80">3+1</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                Exportformate
              </p>
            </div>
            <div className="hidden md:block">
              <p className="font-display text-4xl text-paper/80">4</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                Drehwinkel-Versuche pro Scan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Schritte ---------- */}
      <section className="border-t border-line bg-ink-2/60">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            In drei Schritten zum <span className="italic text-amber">Punkt</span>
          </h2>
          <div className="stagger mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.nr} className="card group p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-6 text-amber" strokeWidth={1.8} />
                  <span className="font-mono text-xs text-dim">{s.nr}</span>
                </div>
                <h3 className="font-display mt-5 text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-mute">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display max-w-xl text-3xl tracking-tight sm:text-4xl">
              Gedacht wie ein <span className="italic text-amber">Reisebegleiter</span>
            </h2>
            <p className="max-w-sm text-sm text-mute">
              Alles, was beim Digitalisieren gedruckter Stellplatz- und Tourendaten zählt –
              und ein paar sinnvolle Extras obendrauf.
            </p>
          </div>
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5 transition-colors hover:border-line-2">
                <f.icon className="size-5 text-amber" strokeWidth={1.9} />
                <h3 className="mt-3.5 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mute">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Karten-Vorschau ---------- */}
      <section className="border-t border-line bg-ink-2/60">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Deine <span className="italic text-amber">Karten</span>
            </h2>
            <Link
              href="/maps"
              className="group flex items-center gap-1 font-mono text-xs uppercase tracking-[0.18em] text-mute transition-colors hover:text-amber"
            >
              Verwalten
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(maps ?? []).slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/maps/${m.id}`}
                className="card group relative overflow-hidden p-5 transition-colors hover:border-line-2"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                  style={{ background: m.color ?? "#E9A13B" }}
                />
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: m.color ?? "#E9A13B" }}
                  />
                  {m.pointCount} {m.pointCount === 1 ? "Punkt" : "Punkte"}
                </p>
                <h3 className="font-display mt-2 text-xl leading-tight tracking-tight group-hover:text-amber-soft">
                  {m.name}
                </h3>
                {m.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-mute">{m.description}</p>
                )}
              </Link>
            ))}
            <Link
              href="/scan"
              className="card grid min-h-32 place-items-center border-dashed !border-line-2 p-5 text-center transition-colors hover:!border-amber"
            >
              <span>
                <ScanLine className="mx-auto size-6 text-amber" />
                <span className="mt-2 block text-sm text-mute">Neuen Punkt scannen</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Fußnote ---------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-6 font-mono text-[10px] uppercase tracking-[0.18em] text-dim sm:px-6">
          <span className="flex items-center gap-2">
            <FileText className="size-3.5" />
            OCR lokal auf dem Server
          </span>
          <span>OpenStreetMap & Esri Tiles</span>
          <span>KML · CSV · GeoJSON · GPX</span>
          <span className="ml-auto flex items-center gap-2 text-amber/70">
            <Mountain className="size-3.5" />
            Punktgenau
          </span>
        </div>
      </footer>
    </div>
  );
}
