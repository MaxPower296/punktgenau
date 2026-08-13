"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, LocateFixed, Maximize2 } from "lucide-react";

export interface LitePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  refNumber?: string | null;
  category?: string | null;
  favorite?: boolean;
  visited?: boolean;
}

export function getCategoryColor(cat?: string | null, fallback = "#E9A13B"): string {
  if (!cat) return fallback;
  const c = cat.toLowerCase();
  if (c.includes("wander")) return "#22c55e";     // grün = Wanderparkplatz
  if (c.includes("picknick")) return "#c084fc";   // violett = Picknickplatz
  if (c.includes("bad")) return "#38bdf8";        // blau = Badeplatz
  if (c.includes("camping") || c.includes("camp")) return "#a3e635"; // hellgrün = Campingplatz
  if (c.includes("stell")) return "#fbbf24";       // gelb = Stellplatz
  return fallback;
}

interface Props {
  points: LitePoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onDragEnd?: (id: string, lat: number, lng: number) => void;
  addMode?: boolean;
  draggable?: boolean;
  userPos?: { lat: number; lng: number } | null;
  onUserPos?: (pos: { lat: number; lng: number }) => void;
  fitKey?: string;
  interactive?: boolean;
  color?: string;
  className?: string;
  poiMarkers?: { lat: number; lng: number; label: string; type: string }[];
}

const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function pinHtml(p: LitePoint, selected: boolean, fallbackColor: string): string {
  const label = p.refNumber ? p.refNumber : p.favorite ? "★" : "";
  const color = getCategoryColor(p.category, fallbackColor);
  return `<div class="pg-pin${selected ? " selected" : ""}${p.visited ? " visited" : ""}" style="--pin:${color}"><span>${label}</span></div>`;
}

export default function LeafletMap({
  points,
  selectedId,
  onSelect,
  onMapClick,
  onDragEnd,
  addMode,
  draggable,
  userPos,
  poiMarkers,
  onUserPos,
  fitKey,
  interactive = true,
  color = "#E9A13B",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const layersRef = useRef<{ osm: L.TileLayer; sat: L.TileLayer } | null>(null);
  const [sat, setSat] = useState(false);
  const callbacks = useRef({ onSelect, onMapClick, onDragEnd });
  (callbacks as any).current = { onSelect, onMapClick, onDragEnd };

  // Map einmalig initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [47.2, 7.4],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const osm = L.tileLayer(OSM, { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    const satLayer = L.tileLayer(SAT, { maxZoom: 19, attribution: "© Esri World Imagery" });
    layersRef.current = { osm, sat: satLayer };
    map.on("click", (e: L.LeafletMouseEvent) => {
      callbacks.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    // Fix für abgeschnittene Karte: Leaflet muss nach dem ersten Render seine Größe neu berechnen
    setTimeout(() => map.invalidateSize(), 120);
    setTimeout(() => map.invalidateSize(), 400);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Layer wechseln
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    if (sat) {
      layers.osm.remove();
      layers.sat.addTo(map);
      map.getContainer().classList.add("leaflet-sat");
    } else {
      layers.sat.remove();
      layers.osm.addTo(map);
      map.getContainer().classList.remove("leaflet-sat");
    }
  }, [sat]);

  // Marker rendern
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const alive = new Set<string>();

    for (const p of points) {
      alive.add(p.id);
      const selected = p.id === selectedId;
      const icon = L.divIcon({
        html: pinHtml(p, selected, color),
        className: "",
        iconSize: [30, 30],
        iconAnchor: [4, 28],
      });
      const marker = existing.get(p.id);
      if (marker) {
        marker.setLatLng([p.lat, p.lng]).setIcon(icon);
        if (draggable) { try { (marker as any).dragging?.enable(); } catch {} }
      } else {
        const m = L.marker([p.lat, p.lng], { icon, keyboard: false, draggable: !!draggable });
        m.on("click", () => callbacks.current.onSelect?.(p.id));
        if (draggable) {
          m.on("dragend", () => {
            const ll = m.getLatLng();
            // @ts-ignore
            const cb = (callbacks as any).current?.onDragEnd;
            if (cb) cb(p.id, ll.lat, ll.lng);
          });
        }
        m.addTo(map);
        existing.set(p.id, m);
      }
    }
    // POI markers
    const poiLayer = (map as any)._poiLayer as L.LayerGroup | undefined;
    if (poiMarkers && poiMarkers.length) {
      if (poiLayer) map.removeLayer(poiLayer);
      const group = L.layerGroup();
      poiMarkers.forEach(pm=>{
        const icon = L.divIcon({ html: `<div style="background:#fff;border:1px solid #26301f;border-radius:999px;padding:2px 5px;font-size:9px">${pm.label.slice(0,14)}</div>`, className:"", iconAnchor:[20,10]});
        L.marker([pm.lat,pm.lng],{icon}).addTo(group);
      });
      group.addTo(map);
      (map as any)._poiLayer = group;
    } else if (poiLayer) {
      map.removeLayer(poiLayer);
      (map as any)._poiLayer = null;
    }
    for (const [id, marker] of existing) {
      if (!alive.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    if (selectedId && existing.has(selectedId)) {
      const ll = existing.get(selectedId)!.getLatLng();
      if (!map.getBounds().pad(-0.25).contains(ll)) {
        map.panTo(ll, { animate: true });
      }
    }
  }, [points, selectedId, color, draggable, poiMarkers]);

  // Fitting
  const lastFit = useRef<string>("");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitKey || lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: true });
  }, [fitKey, points]);

  // Nutzerposition
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPos) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const icon = L.divIcon({
      html: `<div class="pg-user"></div>`,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]).setIcon(icon);
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], {
        icon,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [userPos]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUserPos?.(p);
        mapRef.current?.flyTo([p.lat, p.lng], Math.max(13, mapRef.current.getZoom()), {
          duration: 1.2,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const refit = () => {
    lastFit.current = "";
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: true });
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={containerRef}
        className={`h-full w-full ${addMode ? "cursor-crosshair" : ""}`}
        style={{ minHeight: 240 }}
      />
      {interactive && (
        <div className="absolute left-3 top-3 z-[500] flex gap-1.5">
          <button
            onClick={() => setSat((s) => !s)}
            className="btn btn-ghost !border-line !bg-ink/85 !px-3 !py-1.5 !text-xs backdrop-blur-sm"
            title="Karten-Layer wechseln"
          >
            <Layers className="size-3.5" />
            {sat ? "Karte" : "Satellit"}
          </button>
          <button
            onClick={locate}
            className="btn btn-ghost !border-line !bg-ink/85 !px-3 !py-1.5 !text-xs backdrop-blur-sm"
            title="Mein Standort"
          >
            <LocateFixed className="size-3.5" />
            Standort
          </button>
          {points.length > 1 && (
            <button
              onClick={refit}
              className="btn btn-ghost !border-line !bg-ink/85 !px-3 !py-1.5 !text-xs backdrop-blur-sm"
              title="Alle Punkte einpassen"
            >
              <Maximize2 className="size-3.5" />
              Alle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
