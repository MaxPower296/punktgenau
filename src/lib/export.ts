import type { PointRow } from "@/db/schema";
import { toDMS } from "@/lib/coordinates";

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pointDescription(p: PointRow): string {
  const lines = [
    p.category,
    p.refNumber ? `Nr. ${p.refNumber}` : "",
    p.altitude != null ? `Höhe: ${p.altitude} m` : "",
    p.maxWomos ? `max. WOMOs: ${p.maxWomos}` : "",
    p.equipment ? `Ausstattung: ${p.equipment}` : "",
    p.description ? `Beschreibung: ${p.description}` : "",
    p.prices ? `Preise: ${p.prices}` : "",
    p.directions ? `Anfahrt: ${p.directions}` : "",
    p.phone ? `Tel: ${p.phone}` : "",
    p.notes ? `Notiz: ${p.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function toKML(points: PointRow[], mapName: string): string {
  const placemarks = points
    .map(
      (p) => `    <Placemark>
      <name>${xmlEsc(p.name)}</name>
      <description>${xmlEsc(pointDescription(p))}</description>
      <Style><IconStyle><color>ff3ba1e9</color><scale>1.1</scale></IconStyle></Style>
      <Point>${p.altitude != null ? `<altitudeMode>absolute</altitudeMode>` : ""}<coordinates>${p.lng},${p.lat}${p.altitude != null ? `,${p.altitude}` : ""}</coordinates></Point>
    </Placemark>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEsc(mapName)}</name>
${placemarks}
  </Document>
</kml>
`;
}

function csvEsc(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(points: PointRow[]): string {
  const header = [
    "name",
    "nummer",
    "kategorie",
    "latitude",
    "longitude",
    "hoehe_m",
    "dms",
    "max_womos",
    "ausstattung",
    "beschreibung",
    "preise",
    "anfahrt",
    "telefon",
    "besucht",
    "favorit",
    "erstellt_am",
  ];
  const rows = points.map((p) =>
    [
      csvEsc(p.name),
      csvEsc(p.refNumber ?? ""),
      csvEsc(p.category ?? ""),
      p.lat.toFixed(7),
      p.lng.toFixed(7),
      p.altitude != null ? String(p.altitude) : "",
      csvEsc(`${toDMS(p.lat, "lat")}  ${toDMS(p.lng, "lng")}`),
      csvEsc(p.maxWomos ?? ""),
      csvEsc(p.equipment ?? ""),
      csvEsc(p.description ?? ""),
      csvEsc(p.prices ?? ""),
      csvEsc(p.directions ?? ""),
      csvEsc(p.phone ?? ""),
      p.visited ? "ja" : "nein",
      p.favorite ? "ja" : "nein",
      p.createdAt.toISOString(),
    ].join(",")
  );
  return ["﻿" + header.join(","), ...rows].join("\r\n");
}

export function toGeoJSON(points: PointRow[], mapName: string): string {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      name: mapName,
      features: points.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates:
            p.altitude != null ? [p.lng, p.lat, p.altitude] : [p.lng, p.lat],
        },
        properties: {
          name: p.name,
          nummer: p.refNumber,
          kategorie: p.category,
          hoehe_m: p.altitude,
          max_womos: p.maxWomos,
          ausstattung: p.equipment,
          beschreibung: p.description,
          preise: p.prices,
          anfahrt: p.directions,
          telefon: p.phone,
          besucht: p.visited,
          favorit: p.favorite,
        },
      })),
    },
    null,
    2
  );
}

export function toGPX(points: PointRow[], mapName: string): string {
  const wpts = points
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    ${p.altitude != null ? `<ele>${p.altitude}</ele>` : ""}
    <name>${xmlEsc(p.name)}</name>
    <desc>${xmlEsc(pointDescription(p))}</desc>
    <sym>Flag, Blue</sym>
  </wpt>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Punktgenau" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${xmlEsc(mapName)}</name></metadata>
${wpts}
</gpx>
`;
}

export const EXPORT_FORMATS = {
  kml: { mime: "application/vnd.google-earth.kml+xml", ext: "kml", build: toKML },
  csv: { mime: "text/csv", ext: "csv", build: (p: PointRow[]) => toCSV(p) },
  geojson: { mime: "application/geo+json", ext: "geojson", build: toGeoJSON },
  gpx: { mime: "application/gpx+xml", ext: "gpx", build: toGPX },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;
