"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map as MapIcon, MapPin, Plus, ScanLine, Trash2, Download, ChevronRight, Upload } from "lucide-react";
import type { MapWithCount } from "@/lib/types";
import { toast } from "@/components/ui";
import { BackupPanel } from "@/components/feature-panels";

export default function MapsPage() {
  const [maps, setMaps] = useState<MapWithCount[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () =>
    fetch("/api/maps")
      .then((r) => r.json())
      .then((d: { maps: MapWithCount[] }) => setMaps(d.maps))
      .catch(() => toast("Karten konnten nicht geladen werden", "err"));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName("");
        toast("Karte angelegt");
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/maps/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Karte gelöscht");
      setConfirmDelete(null);
      load();
    } else {
      toast("Löschen fehlgeschlagen", "err");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6">
      <div className="anim-fade-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber">Sammlung</p>
          <h1 className="font-display mt-1 text-4xl tracking-tight sm:text-5xl">
            Deine <span className="italic text-amber">Karten</span>
          </h1>
        </div>
        <div className="flex w-full max-w-md items-end gap-2 sm:w-auto">
          <input
            className="field flex-1"
            placeholder="Neue Karte, z. B. Schottland Westkuste"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button className="btn btn-amber" onClick={create} disabled={busy || !name.trim()}>
            <Plus className="size-4" />
            Anlegen
          </button>
        </div>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <BackupPanel />
        <label className="btn btn-ghost !py-1.5 !text-xs cursor-pointer">
          <Upload className="size-3" /> GPX/KML Import
          <input
            type="file"
            accept=".gpx,.kml"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !maps?.[0]) return;
              const fd = new FormData();
              fd.append("file", f);
              fd.append("mapId", maps[0].id);
              const r = await fetch("/api/import-gpx", { method: "POST", body: fd });
              const d = await r.json();
              if (r.ok) {
                toast(`${d.imported} Punkte importiert`);
                load();
              } else toast(d.error || "Import fehlgeschlagen", "err");
            }}
          />
        </label>
        <span className="text-xs text-dim ml-auto">Backup sichert alle Karten & Punkte als JSON</span>
      </div>

      {!maps ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-44 animate-pulse" />
          ))}
        </div>
      ) : maps.length === 0 ? (
        <div className="card grid place-items-center p-16 text-center">
          <MapIcon className="mb-4 size-10 text-dim" />
          <p className="text-mute">Noch keine Karten. Lege oben deine erste an.</p>
        </div>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <div key={m.id} className="card group relative overflow-hidden p-5 transition-colors hover:border-line-2">
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                style={{ background: m.color ?? "#E9A13B" }}
              />
              <Link href={`/maps/${m.id}`} className="block">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ background: m.color ?? "#E9A13B" }}
                  />
                  {m.pointCount} {m.pointCount === 1 ? "Punkt" : "Punkte"}
                </div>
                <h2 className="font-display mt-2 line-clamp-2 text-2xl leading-tight tracking-tight group-hover:text-amber-soft">
                  {m.name}
                </h2>
                {m.description ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mute">
                    {m.description}
                  </p>
                ) : (
                  <p className="mt-2 text-xs italic text-dim">Keine Beschreibung</p>
                )}
              </Link>
              <div className="mt-5 flex items-center gap-2">
                <Link href={`/maps/${m.id}`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                  <MapPin className="size-3.5" />
                  Öffnen
                  <ChevronRight className="size-3" />
                </Link>
                <Link href={`/scan`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                  <ScanLine className="size-3.5" />
                  Scannen
                </Link>
                <div className="ml-auto flex items-center gap-1">
                  <a
                    className="grid size-8 place-items-center rounded-lg text-dim transition-colors hover:bg-panel hover:text-amber"
                    href={`/api/maps/${m.id}/export?format=geojson`}
                    title="GeoJSON exportieren"
                  >
                    <Download className="size-4" />
                  </a>
                  {confirmDelete === m.id ? (
                    <button
                      className="rounded-lg bg-clay/15 px-2.5 py-1.5 text-xs font-semibold text-clay"
                      onClick={() => remove(m.id)}
                    >
                      Wirklich löschen?
                    </button>
                  ) : (
                    <button
                      className="grid size-8 place-items-center rounded-lg text-dim transition-colors hover:bg-panel hover:text-clay"
                      onClick={() => setConfirmDelete(m.id)}
                      title="Karte löschen"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
