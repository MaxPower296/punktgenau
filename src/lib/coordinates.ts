// Universeller GPS-Koordinaten-Parser.
// Unterstützt: DMS (hddd° mm ss.s), DDM (hddd° mm.mmm), DD (dd.ddddd / N dd.ddddd),
// deutsche Dezimalkommas, unterschiedliche Grad-/Minuten-/Sekundenzeichen,
// Hemisphären N/S/E/W/O(=Ost) sowie typische OCR-Fehler (O↔0, l↔1, fehlende Symbole).

export type GpsFormat = "DMS" | "DDM" | "DD" | "DD-HEMI";

export interface CoordCandidate {
  lat: number;
  lng: number;
  latRaw: string;
  lngRaw: string;
  raw: string;
  format: GpsFormat;
  index: number;
}

const DEG = "[°º˚°∘ˉ˙]";
const MIN = "['′’‘`´ʼ']";
const SEC = "(?:[\"”„¨˝″]|''|´´|“)";

/** OCR-typische Zeichen in ASCII-Normalform bringen */
export function normalizeOcrText(input: string): string {
  let t = input;
  // Grad-/Minuten-/Sekundenzeichen
  t = t.replace(/[º˚°∘ˉ˙]/g, "°");
  t = t.replace(/[′’‘`´ʼ]/g, "'");
  t = t.replace(/[″”„¨˝“]/g, '"');
  t = t.replace(/''/g, '"');
  t = t.replace(/[‐‑–—]/g, "-");
  // Buchstaben, die OCR gern als Ziffern zurückgibt (nur innerhalb von Zahlblöcken)
  t = t.replace(/(\d)\s*[oO](?=[\s°'\d])/g, "$1 0");
  t = t.replace(/(?<=[°\s])[oO](?=\s?\d)/g, "0");
  t = t.replace(/(?<=\d)\s*[lI|](?=\s?['″".])/g, "1");
  // Häufige OCR-Artefakte zwischen Ziffern
  return t;
}

function fixNum(s: string): string {
  return s.replace(/[oO]/g, "0").replace(/[lI|]/g, "1").replace(",", ".");
}

function toDec(d: number, m = 0, s = 0): number {
  return d + m / 60 + s / 3600;
}

function hemiSign(h: string): number {
  return h === "S" || h === "W" ? -1 : 1;
}

function hemiAxis(h: string): "lat" | "lng" {
  return h === "N" || h === "S" ? "lat" : "lng";
}

interface Atom {
  value: number;
  axis: "lat" | "lng" | "unknown";
  format: GpsFormat;
  raw: string;
  index: number;
}

function collectAtoms(rawText: string): Atom[] {
  const text = normalizeOcrText(rawText);
  const atoms: Atom[] = [];
  const covered: Array<[number, number]> = [];

  const isCovered = (i: number, len: number) =>
    covered.some(([s, e]) => i < e && i + len > s);

  const pushAtom = (a: Atom, start: number, end: number) => {
    atoms.push(a);
    covered.push([start, end]);
  };

  // 1) DMS mit nachgestellter Hemisphäre zuerst: 47°35'10.0"N
  //    (sonst würde das N von „…10.0\"N 7°…“ fälschlich als führendes N von 7° gelesen)
  const rxTrail =
    new RegExp(
      `(\\d{1,3})\\s*${DEG}\\s*(\\d{1,2})\\s*${MIN}\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*${SEC}([NSEWO])`,
      "gi"
    );
  let m: RegExpExecArray | null;
  while ((m = rxTrail.exec(text))) {
    const d = parseFloat(fixNum(m[1]));
    const min = parseFloat(fixNum(m[2]));
    const sec = parseFloat(fixNum(m[3]));
    const h = m[4].toUpperCase();
    if (min >= 60 || sec >= 60 || d > 180) continue;
    pushAtom(
      {
        value: hemiSign(h) * toDec(d, min, sec),
        axis: hemiAxis(h),
        format: "DMS",
        raw: m[0].trim(),
        index: m.index,
      },
      m.index,
      m.index + m[0].length
    );
  }

  // 2) DMS / DDM mit führender Hemisphäre: N 47°35'10.0" / N 47°35.167'
  const rxLead =
    new RegExp(
      `([NSEWO])\\s{0,2}(\\d{1,3})\\s*${DEG}\\s*(\\d{1,2}(?:[.,]\\d+)?)\\s*${MIN}\\s*(?:(\\d{1,3}(?:[.,]\\d+)?)\\s*${SEC}?)?`,
      "gi"
    );
  while ((m = rxLead.exec(text))) {
    if (isCovered(m.index, m[0].length)) continue;
    const h = m[1].toUpperCase();
    const d = parseFloat(fixNum(m[2]));
    const min = parseFloat(fixNum(m[3]));
    const sec = m[4] ? parseFloat(fixNum(m[4])) : undefined;
    if (min >= 60 || (sec !== undefined && sec >= 60) || d > 180) continue;
    const value = hemiSign(h) * toDec(d, min, sec ?? 0);
    pushAtom(
      {
        value,
        axis: hemiAxis(h),
        format: sec !== undefined ? "DMS" : "DDM",
        raw: m[0].trim(),
        index: m.index,
      },
      m.index,
      m.index + m[0].length
    );
  }

  // 3) DD mit Hemisphäre: N 47.5861 / N 47,5861°
  const rxDDHemi = new RegExp(
    `([NSEO])\\s{0,2}(\\d{1,3}[.,]\\d{2,7})\\s*(?:${DEG})?`,
    "g"
  );
  while ((m = rxDDHemi.exec(text))) {
    if (isCovered(m.index, m[0].length)) continue;
    const h = m[1].toUpperCase();
    const d = fixNum(m[2]);
    // Nur Dezimalpunkt/Komma direkt gefolgt von Ziffern – nicht "E 7°..."
    const v = hemiSign(h) * parseFloat(d);
    if (Math.abs(v) > 180) continue;
    pushAtom(
      { value: v, axis: hemiAxis(h), format: "DD-HEMI", raw: m[0].trim(), index: m.index },
      m.index,
      m.index + m[0].length
    );
  }

  // 4) Reine Dezimalwerte (4+ Nachkommastellen): 47.586111 / -7.617889
  const rxDD = /(?<![\d.])(-?\d{1,3}\.\d{4,7})(?![\d.])/g;
  while ((m = rxDD.exec(text))) {
    if (isCovered(m.index, m[0].length)) continue;
    const v = parseFloat(m[1]);
    if (Math.abs(v) > 180) continue;
    pushAtom(
      { value: v, axis: "unknown", format: "DD", raw: m[1], index: m.index },
      m.index,
      m.index + m[0].length
    );
  }

  atoms.sort((a, b) => a.index - b.index);
  return atoms;
}

/** Findet alle plausiblen Koordinatenpaare, beste zuerst. */
export function findCoordinates(text: string): CoordCandidate[] {
  const atoms = collectAtoms(text);
  const candidates: CoordCandidate[] = [];

  for (let i = 0; i < atoms.length - 1; i++) {
    const a = atoms[i];
    const b = atoms[i + 1];
    if (b.index - a.index > 90) continue;

    let latA: Atom | null = null;
    let lngA: Atom | null = null;

    if (a.axis === "lat" && (b.axis === "lng" || b.axis === "unknown")) {
      latA = a;
      lngA = b;
    } else if (a.axis === "lng" && b.axis === "lat") {
      latA = b;
      lngA = a;
    } else if (a.axis === "unknown" && b.axis === "unknown") {
      latA = a;
      lngA = b;
    } else if (a.axis === "lat" && b.axis === "lat" && Math.abs(b.value) > 90) {
      continue;
    }
    if (!latA || !lngA) continue;

    const lat = latA.value;
    const lng = lngA.value;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;

    candidates.push({
      lat: round7(lat),
      lng: round7(lng),
      latRaw: latA.raw,
      lngRaw: lngA.raw,
      raw: `${latA.raw} · ${lngA.raw}`,
      format:
        latA.format === lngA.format ? latA.format : latA.format === "DMS" ? "DMS" : lngA.format,
      index: latA.index,
    });
  }

  // Duplikate entfernen (gleiche Position)
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.lat.toFixed(4)}|${c.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function round7(n: number): number {
  return Math.round(n * 1e7) / 1e7;
}

export function toDMS(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const minFull = (abs - d) * 60;
  const m = Math.floor(minFull);
  const s = (minFull - m) * 60;
  return `${hemi} ${d}°${String(m).padStart(2, "0")}'${s.toFixed(1)}"`;
}

export function toDDM(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const m = (abs - d) * 60;
  return `${hemi} ${d}° ${m.toFixed(4)}'`;
}

export function formatDD(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function altitudeFromText(text: string): number | null {
  const t = normalizeOcrText(text);
  const m = t.match(/(\d{1,2}[.\s]?\d{3}|\d{1,3})\s*m(?![a-zA-ZäöüÄÖÜ])/);
  if (!m) return null;
  const v = parseInt(m[1].replace(/[.\s]/g, ""), 10);
  return v > 0 && v < 9000 ? v : null;
}
