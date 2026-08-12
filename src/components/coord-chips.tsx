"use client";

import { Copy, Check, Navigation, Mountain } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui";

export function toDMSClient(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const minFull = (abs - d) * 60;
  const m = Math.floor(minFull);
  const s = (minFull - m) * 60;
  return `${hemi} ${d}°${String(m).padStart(2, "0")}'${s.toFixed(1)}"`;
}

export function toDDMClient(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const m = (abs - d) * 60;
  return `${hemi} ${d}° ${m.toFixed(4)}'`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function copyText(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast(`${label} kopiert`))
    .catch(() => toast("Kopieren fehlgeschlagen", "err"));
}

/** Kompakte Koordinatenanzeige mit Kopier-Buttons für alle Formate. */
export function CoordChips({
  lat,
  lng,
  altitude,
  format,
  compact = false,
}: {
  lat: number;
  lng: number;
  altitude?: number | null;
  format?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const dms = `${toDMSClient(lat, "lat")}  ${toDMSClient(lng, "lng")}`;
  const ddm = `${toDDMClient(lat, "lat")}  ${toDDMClient(lng, "lng")}`;
  const dd = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  const Row = ({
    id,
    label,
    value,
  }: {
    id: string;
    label: string;
    value: string;
  }) => (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-ink/60 px-2.5 py-1.5">
      <span className="chip shrink-0 !text-[9px]">{label}</span>
      <span className="flex-1 truncate font-mono text-xs text-paper">{value}</span>
      <button
        className="shrink-0 text-dim transition-colors hover:text-amber"
        onClick={() => {
          copyText(value, label);
          setOpen(id);
          setTimeout(() => setOpen(null), 1200);
        }}
        title={`${label} kopieren`}
      >
        {open === id ? <Check className="size-3.5 text-amber" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <Row id="dms" label={format === "DMS" ? "DMS ✓" : "DMS"} value={dms} />
      {!compact && (
        <>
          <Row id="ddm" label={format === "DDM" ? "DDM ✓" : "DDM"} value={ddm} />
          <Row id="dd" label={format === "DD" ? "DD ✓" : "DD"} value={dd} />
        </>
      )}
      <div className="flex items-center gap-2 pt-0.5">
        {altitude != null && (
          <span className="chip">
            <Mountain className="size-3" />
            {altitude} m
          </span>
        )}
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-amber !px-3 !py-1.5 !text-xs"
        >
          <Navigation className="size-3.5" />
          Google Maps
        </a>
      </div>
    </div>
  );
}
