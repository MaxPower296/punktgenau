"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Crosshair,
  Download,
  Fuel,
  ShoppingCart,
  Droplets,
  Accessibility,
  UtensilsCrossed,
  Mountain,
  Navigation,
  Pencil,
  Phone,
  ScanLine,
  Search,
  Star,
  Share2,
  Trash2,
  X,
  Check,
  MapPin,
  MousePointerClick,
  Calendar,
  Camera,
  Route,
} from "lucide-react";
import type { MapWithCount, PointDto } from "@/lib/types";
import { PointForm, EMPTY_DRAFT, draftLatLng, parseDraftNumber, type PointDraft } from "@/components/point-form";
import { CoordChips, googleMapsUrl, toDMSClient } from "@/components/coord-chips";
import { SectionTitle, toast } from "@/components/ui";
import { WeatherGeocode } from "@/components/weather-geocode";
import { NavChooser } from "@/components/nav-chooser";
import { BackupImport } from "@/components/backup-import";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-panel" />,
});

interface MapData {
  map: MapWithCount;
  points: PointDto[];
}

function pointToDraft(p: PointDto): PointDraft {
  return {
    ...EMPTY_DRAFT,
    name: p.name,
    refNumber: p.refNumber ?? "",
    category: p.category ?? "",
    lat: p.lat.toFixed(7),
    lng: p.lng.toFixed(7),
    altitude: p.altitude != null ? String(p.altitude) : "",
    maxWomos: p.maxWomos ?? "",
    equipment: p.equipment ?? "",
    description: p.description ?? "",
    prices: p.prices ?? "",
    directions: p.directions ?? "",
    phone: p.phone ?? "",
    notes: p.notes ?? "",
    rawGps: p.rawGps ?? "",
  };
}

function distLabel(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function MapDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;

  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(search.get("point"));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PointDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"alle" | "favoriten" | "besucht" | "offen">("alle");
  const [renaming, setRenaming] = useState(false);
  const [mapName, setMapName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/maps/${id}`);
    if (!res.ok) {
      setError("Karte nicht gefunden");
      return;
    }
    const d = (await res.json()) as MapData;
    setData(d);
    setMapName(d.map.name);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const points = data?.points ?? [];
  const mapColor = data?.map.color ?? "#E9A13B";
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = points;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.refNumber ?? "").includes(q)
      );
    }
    if (filter === "favoriten") list = list.filter((p) => p.favorite);
    if (filter === "besucht") list = list.filter((p) => p.visited);
    if (filter === "offen") list = list.filter((p) => !p.visited);
    return list;
  }, [points, query, filter]);

  const select = (pid: string) => {
    setSelectedId(pid);
    setEditing(false);
    setConfirmDelete(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft(pointToDraft(selected));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    const coords = draftLatLng(draft);
    if (!coords) {
      toast("Koordinaten ungültig", "err");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/points/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim() || "Unbenannter Punkt",
          refNumber: draft.refNumber.trim(),
          category: draft.category.trim(),
          lat: coords.lat,
          lng: coords.lng,
          altitude: parseDraftNumber(draft.altitude),
          maxWomos: draft.maxWomos.trim(),
          equipment: draft.equipment.trim(),
          description: draft.description.trim(),
          prices: draft.prices.trim(),
          directions: draft.directions.trim(),
          phone: draft.phone.trim(),
          notes: draft.notes.trim(),
          rawGps: draft.rawGps.trim(),
        }),
      });
      if (res.ok) {
        toast("Gespeichert");
        setEditing(false);
        await load();
      } else {
        toast("Speichern fehlgeschlagen", "err");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (p: PointDto, key: "favorite" | "visited") => {
    const body: Record<string, unknown> = { [key]: !p[key] };
    // Besuchs-Datum automatisch setzen beim Haken
    if (key === "visited" && !p.visited) {
      body.visitedAt = new Date().toISOString();
    }
    await fetch(`/api/points/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  };

  const deletePoint = async (pid: string) => {
    const res = await fetch(`/api/points/${pid}`, { method: "DELETE" });
    if (res.ok) {
      toast("Punkt gelöscht");
      setSelectedId(null);
      setConfirmDelete(false);
      await load();
    }
  };

  const onMapClick = async (lat: number, lng: number) => {
    if (!addMode) return;
    setAddMode(false);
    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: id,
        name: "Neuer Punkt",
        lat,
        lng,
        source: "click",
      }),
    });
    if (res.ok) {
      const d = (await res.json()) as { point: PointDto };
      toast("Punkt angelegt – Details rechts ergänzen");
      await load();
      setSelectedId(d.point.id);
      setDraft(pointToDraft(d.point));
      setEditing(true);
    }
  };

  const renameMap = async () => {
    if (!mapName.trim() || !data) return;
    await fetch(`/api/maps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: mapName.trim() }),
    });
    setRenaming(false);
    load();
  };

  const changeColor = async (color: string) => {
    await fetch(`/api/maps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    load();
  };

  if (error) {
    return (
      <div className="grid flex-1 place-items-center p-10 text-center">
        <div>
          <p className="text-mute">{error}</p>
          <Link href="/maps" className="btn btn-ghost mt-4">
            <ArrowLeft className="size-4" />
            Zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-64px)] lg:flex-row lg:overflow-hidden">
      {/* ------- Seitenleiste ------- */}
      <aside className="order-2 flex w-full flex-col border-r border-line bg-ink-2 lg:order-1 lg:w-[410px] lg:min-w-[410px] lg:overflow-y-auto">
        <div className="border-b border-line p-4">
          <Link
            href="/maps"
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim transition-colors hover:text-paper"
          >
            <ArrowLeft className="size-3" />
            Alle Karten
          </Link>

          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                className="field flex-1"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && renameMap()}
                autoFocus
              />
              <button className="btn btn-amber !px-3 !py-2" onClick={renameMap}>
                <Check className="size-4" />
              </button>
            </div>
          ) : (
            <h1 className="font-display flex items-start gap-2 text-2xl leading-tight tracking-tight">
              <input
                type="color"
                value={mapColor}
                onChange={(e) => changeColor(e.target.value)}
                className="mt-1.5 size-5 shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                title="Kartenfarbe"
              />
              <span className="flex-1">{data?.map.name ?? "…"}</span>
              <button className="mt-1 text-dim hover:text-amber" onClick={() => setRenaming(true)}>
                <Pencil className="size-4" />
              </button>
            </h1>
          )}
          {data?.map.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-mute">{data.map.description}</p>
          )}

          {/* Aktionen */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Link href="/scan" className="btn btn-amber !px-3 !py-1.5 !text-xs">
              <ScanLine className="size-3.5" />
              Punkt scannen
            </Link>
            <button
              className={`btn !px-3 !py-1.5 !text-xs ${addMode ? "btn-amber" : "btn-ghost"}`}
              onClick={() => setAddMode((v) => !v)}
              title="Punkt durch Klick auf die Karte hinzufügen"
            >
              <MousePointerClick className="size-3.5" />
              {addMode ? "Auf Karte klicken …" : "Per Klick setzen"}
            </button>
            <div className="ml-auto flex items-center gap-1">
              <BackupImport mapId={id} />
              <button
                className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"
                onClick={() => {
                  const url = `${window.location.origin}/maps/${id}`;
                  navigator.clipboard.writeText(url);
                  toast("Link zur Karte kopiert");
                }}
                title="Link kopieren"
              >
                <Share2 className="size-3.5" />
              </button>
              {(["kml", "csv", "geojson", "gpx"] as const).map((f) => (
                <a
                  key={f}
                  href={`/api/maps/${id}/export?format=${f}`}
                  className="grid h-8 place-items-center rounded-lg border border-line px-2 font-mono text-[9.5px] uppercase text-mute transition-colors hover:border-amber hover:text-amber"
                  title={`Als ${f.toUpperCase()} exportieren`}
                >
                  {f}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Suche + Filter */}
        <div className="space-y-2 border-b border-line p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input
              className="field !pl-9"
              placeholder="Punkte durchsuchen …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["alle", "favoriten", "offen", "besucht"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`chip flex-1 justify-center !py-1.5 capitalize transition-colors ${
                  filter === f ? "!border-amber !text-amber" : "hover:text-paper"
                }`}
              >
                {f === "offen" ? "offen" : f}
              </button>
            ))}
          </div>
          {/* Kategorie-Filter */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "Wander", color: "#22c55e", label: "🥾 Wander" },
              { key: "Camping", color: "#a3e635", label: "⛺ Camping" },
              { key: "Stell", color: "#fbbf24", label: "🅿️ Stell" },
              { key: "Picknick", color: "#c084fc", label: "🧺 Picknick" },
              { key: "Bad", color: "#38bdf8", label: "🏖️ Bad" },
            ].map((c) => {
              const count = points.filter(
                (p) => p.category?.toLowerCase().includes(c.key.toLowerCase())
              ).length;
              return (
                <button
                  key={c.key}
                  className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] transition-colors hover:border-line-2"
                  onClick={() => setQuery(c.key)}
                >
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Punkte-Liste */}
        <div className="flex-1 divide-y divide-line/60">
          {filtered.length === 0 && (
            <div className="grid place-items-center gap-2 p-10 text-center text-sm text-dim">
              <Crosshair className="size-6" />
              {query ? "Keine Treffer." : "Noch keine Punkte – scanne den ersten!"}
            </div>
          )}
          {filtered.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  active ? "bg-panel" : "hover:bg-panel/60"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px] font-semibold ${
                    active ? "border-amber text-amber" : "border-line-2 text-mute"
                  } ${p.visited ? "opacity-45" : ""}`}
                >
                  {p.refNumber || "·"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium leading-snug ${p.visited ? "line-through opacity-60" : ""}`}>
                    {p.favorite && <Star className="mr-1 inline size-3 fill-amber text-amber" />}
                    {p.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10.5px] text-dim">
                    {toDMSClient(p.lat, "lat")} {toDMSClient(p.lng, "lng")}
                    {p.altitude != null && ` · ${p.altitude} m`}
                  </span>
                  {p.category && (
                    <span className="mt-0.5 block truncate text-[11px] text-mute">{p.category}</span>
                  )}
                </span>
                {userPos && (
                  <span className="chip mt-1 shrink-0">{distLabel(haversine(userPos.lat, userPos.lng, p.lat, p.lng))}</span>
                )}
                <ChevronRight className={`mt-1 size-4 shrink-0 ${active ? "text-amber" : "text-dim"}`} />
              </button>
            );
          })}
        </div>
      </aside>

      {/* ------- Karte ------- */}
      <section className="relative order-1 h-[52dvh] flex-1 lg:order-2 lg:h-full lg:min-h-0">
        <LeafletMap
          points={filtered.map((p) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            refNumber: p.refNumber,
            category: p.category,
            favorite: p.favorite,
            visited: p.visited,
          }))}
          selectedId={selectedId}
          onSelect={select}
          onMapClick={onMapClick}
          addMode={addMode}
          userPos={userPos}
          onUserPos={setUserPos}
          fitKey={`${id}-${points.length}`}
          color={mapColor}
          className="absolute inset-0"
        />

        {/* Detail-Panel */}
        {selected && (
          <div className="anim-fade-up absolute inset-x-3 bottom-3 z-[600] max-h-[78%] overflow-y-auto lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-[430px]">
            <div className="card !rounded-2xl border-line-2 p-4 shadow-2xl">
              {editing ? (
                <>
                  <SectionTitle
                    right={
                      <button onClick={() => setEditing(false)} className="text-dim hover:text-paper">
                        <X className="size-4" />
                      </button>
                    }
                  >
                    Punkt bearbeiten
                  </SectionTitle>
                  <div className="mt-3.5">
                    <PointForm draft={draft} onChange={setDraft} />
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button className="btn btn-amber flex-1" onClick={saveEdit} disabled={saving}>
                      <Check className="size-4" />
                      {saving ? "Speichere …" : "Speichern"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                      Abbrechen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {selected.category && (
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber">
                          {selected.category}
                        </p>
                      )}
                      <h2 className="font-display mt-1 text-xl leading-tight tracking-tight">
                        {selected.refNumber && (
                          <span className="mr-1.5 font-mono text-sm text-dim">({selected.refNumber})</span>
                        )}
                        {selected.name}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className={`grid size-8 place-items-center rounded-lg transition-colors hover:bg-panel ${selected.favorite ? "text-amber" : "text-dim"}`}
                        onClick={() => toggleFlag(selected, "favorite")}
                        title="Favorit"
                      >
                        <Star className={`size-4 ${selected.favorite ? "fill-amber" : ""}`} />
                      </button>
                      <button
                        className={`grid size-8 place-items-center rounded-lg transition-colors hover:bg-panel ${selected.visited ? "text-sage" : "text-dim"}`}
                        onClick={() => toggleFlag(selected, "visited")}
                        title={selected.visited ? "Besucht" : "Als besucht markieren"}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        className="grid size-8 place-items-center rounded-lg text-dim transition-colors hover:bg-panel hover:text-amber"
                        onClick={startEdit}
                        title="Bearbeiten"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        className="grid size-8 place-items-center rounded-lg text-dim transition-colors hover:bg-panel hover:text-paper"
                        onClick={() => setSelectedId(null)}
                        title="Schließen"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    <CoordChips
                      lat={selected.lat}
                      lng={selected.lng}
                      altitude={selected.altitude}
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {selected.maxWomos && (
                        <span className="chip">max. WOMOs: {selected.maxWomos}</span>
                      )}
                      {selected.favorite && <span className="chip text-amber">Favorit</span>}
                      {selected.visited && <span className="chip text-sage">Besucht</span>}
                      {selected.source && <span className="chip">Quelle: {selected.source}</span>}
                    </div>

                    {selected.equipment && (
                      <InfoRow label="Ausstattung" value={selected.equipment} />
                    )}
                    {selected.description && (
                      <InfoRow label="Beschreibung" value={selected.description} />
                    )}
                    {selected.prices && <InfoRow label="Preise" value={selected.prices} />}
                    {selected.directions && <InfoRow label="Anfahrt" value={selected.directions} />}
                    {selected.phone && (
                      <InfoRow
                        label="Telefon"
                        value={selected.phone}
                        icon={<Phone className="size-3.5" />}
                      />
                    )}
                    {selected.notes && <InfoRow label="Notiz" value={selected.notes} />}
                    {selected.altitude != null && (
                      <InfoRow
                        label="Höhe"
                        value={`${selected.altitude} m ü. M.`}
                        icon={<Mountain className="size-3.5" />}
                      />
                    )}

                    {/* Besuchs-Datum */}
                    {selected.visitedAt && (
                      <InfoRow
                        label="Besucht am"
                        value={new Date(selected.visitedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        icon={<Calendar className="size-3.5" />}
                      />
                    )}

                    {/* Adresse / Reverse-Geocoding */}
                    {selected.address && (
                      <InfoRow label="Adresse" value={selected.address} icon={<MapPin className="size-3.5" />} />
                    )}
                  </div>

                  {/* Wetter + Reverse-Geocoding (live geladen) */}
                  <div className="mt-3">
                    <WeatherGeocode lat={selected.lat} lng={selected.lng} />
                  </div>

                  {/* Navigation wählen */}
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
                      Navigieren mit
                    </p>
                    <NavChooser
                      lat={selected.lat}
                      lng={selected.lng}
                      label={selected.name}
                    />
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-line pt-4">
                    {/* Besucht-Toggle mit Datum */}
                    <button
                      className={`btn flex-1 ${selected.visited ? "!bg-sage/20 !text-sage !border-sage/30" : "btn-ghost"}`}
                      onClick={() => toggleFlag(selected, "visited")}
                    >
                      <Check className="size-4" />
                      {selected.visited ? "Besucht ✓" : "Als besucht markieren"}
                    </button>
                    {confirmDelete ? (
                      <button
                        className="btn btn-ghost !border-clay !text-clay"
                        onClick={() => deletePoint(selected.id)}
                      >
                        <Trash2 className="size-4" />
                        Wirklich löschen?
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-danger"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Export-Hinweis auf der Karte */}
        {!selected && points.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] hidden -translate-x-1/2 lg:block">
            <span className="chip !bg-ink/80">
              <Download className="size-3" />
              Export: KML · CSV · GeoJSON · GPX in der Seitenleiste
            </span>
          </div>
        )}

        {!selected && points.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-1/2">
            <div className="card !rounded-2xl px-6 py-5 text-center shadow-2xl">
              <MapPin className="mx-auto mb-2 size-6 text-amber" />
              <p className="text-sm text-mute">Diese Karte ist noch leer.</p>
              <Link href="/scan" className="btn btn-amber pointer-events-auto mt-3 !py-2 !text-xs">
                <ScanLine className="size-3.5" />
                Ersten Punkt scannen
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-paper/90">{value}</p>
    </div>
  );
}
