import {
  findCoordinates,
  altitudeFromText,
  normalizeOcrText,
  type CoordCandidate,
} from "./coordinates";

export interface GuideParseResult {
  refNumber: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  format: string | null;
  latRaw: string;
  lngRaw: string;
  rawGps: string;
  altitude: number | null;
  maxWomos: string;
  equipment: string;
  description: string;
  prices: string;
  directions: string;
  phone: string;
  opened: string;
  coordinates: CoordCandidate[];
  rawText: string;
}

const CATEGORIES = [
  "Offizieller WOMO-Stellplatz",
  "WOMO-Campingplatz",
  "WOMO-Picknickplatz",
  "WOMO-Wanderparkplatz",
  "WOMO-Stellplatz",
  "Campingplatz",
  "Stellplatz",
  "Wanderparkplatz",
  "Picknickplatz",
  "Rastplatz",
  "Aussichtspunkt",
  "Sehenswürdigkeit",
];

const LABEL_RE =
  /(\bGPS\b|\bAusstattung\b|\bBeschreibung\b|\bPreise?\b|\bAnfahrt\b|\bGeöffnet\b|\bTel(?:efon)?\b|max\.?\s*WOMOs?)\s*:?/gi;

const LABEL_TEST =
  /(\bGPS\b|\bAusstattung\b|\bBeschreibung\b|\bPreise?\b|\bAnfahrt\b|\bGeöffnet\b|\bTel(?:efon)?\b|max\.?\s*WOMOs?)\s*:?/i;

function captureField(text: string, label: string): string {
  const rx = new RegExp(`\\b${label}\\b\\s*[.:]?\\s*`, "i");
  const m = rx.exec(text);
  if (!m) return "";
  const rest = text.slice(m.index + m[0].length);
  LABEL_RE.lastIndex = 0;
  let end = rest.length;
  const next = new RegExp(LABEL_RE.source, "gi");
  const n = next.exec(rest);
  if (n) end = n.index;
  const val = rest
    .slice(0, end)
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return val.length > 900 ? val.slice(0, 900).trim() + "…" : val;
}

function extractHeadline(text: string): { name: string; category: string; refNumber: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // 1) Suche bevorzugt nach einer Zeile mit Klammernnummer (z. B. "(003)")
  for (let li = 0; li < Math.min(lines.length, 12); li++) {
    const line = lines[li];
    const m = line.match(/\((\d{1,4})\)/);
    if (m) {
      const refNumber = m[1];
      let rest = line.slice(m.index! + m[0].length).trim();
      
      let category = "";
      for (const cat of CATEGORIES) {
        if (line.toLowerCase().includes(cat.toLowerCase())) {
          category = cat;
          break;
        }
      }
      
      let name = "";
      const colonIdx = rest.indexOf(":");
      if (colonIdx !== -1) {
        name = rest.slice(colonIdx + 1).trim();
      } else {
        let cleaned = rest;
        if (category) {
          const catRx = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          cleaned = cleaned.replace(catRx, "").trim();
        }
        name = cleaned.replace(/^[-–—:\s]+/, "").trim();
      }
      
      // Nächste Zeile anhängen falls sinnvoll (kein Label, kurz, fortlaufender Text)
      const next = lines[li + 1];
      if (
        next &&
        !LABEL_TEST.test(next) &&
        !/\bmax\b/i.test(next) &&
        next.length < 75 &&
        !next.includes("(") &&
        /^[A-ZÄÖÜa-zäöü(]/.test(next)
      ) {
        name = `${name} ${next.replace(/\s+/g, " ").trim()}`;
      }
      
      // Bereinigen von doppelten Leerzeichen und Trennstrichen am Anfang
      name = name.replace(/^[-–—:\s]+/, "").replace(/\s+/g, " ").trim();
      return { name, category, refNumber };
    }
  }
  
  // 2) Fallback ohne Nummer
  for (let li = 0; li < Math.min(lines.length, 8); li++) {
    const line = lines[li];
    for (const cat of CATEGORIES) {
      const idx = line.toLowerCase().indexOf(cat.toLowerCase());
      if (idx === -1) continue;
      let name = "";
      const after = line.slice(idx + cat.length).trim();
      if (after.startsWith(":")) {
        name = after.slice(1).trim();
        const next = lines[li + 1];
        if (
          next &&
          !LABEL_TEST.test(next) &&
          !/\bmax\b/i.test(next) &&
          next.length < 70 &&
          /^[A-ZÄÖÜ(]/.test(next)
        ) {
          name = `${name} ${next.replace(/\s+/g, " ").trim()}`;
        }
      }
      return { name, category: cat, refNumber: "" };
    }
  }
  
  return { name: "", category: "", refNumber: "" };
}

/** Zerlegt OCR-Text in strukturierte Reiseführer-Felder. */
export function parseGuideText(rawText: string): GuideParseResult {
  const text = normalizeOcrText(rawText);

  const coordinates = findCoordinates(text);
  const primary = coordinates[0] ?? null;

  // Höhe: bevorzugt direkt hinter dem gefundenen Koordinatenpaar
  let altitude: number | null = null;
  if (primary) {
    const after = text.slice(
      text.indexOf(primary.lngRaw) + primary.lngRaw.length,
      text.indexOf(primary.lngRaw) + primary.lngRaw.length + 40
    );
    altitude = altitudeFromText(after) ?? altitudeFromText(text);
  } else {
    altitude = altitudeFromText(text);
  }

  const { name, category, refNumber: parsedRef } = extractHeadline(text);
  const refM = text.match(/\((\d{1,4})\)/);
  const refNumber = parsedRef || (refM ? refM[1] : "");

  const maxM = text.match(/max\.?\s*WOMO[Ss]?\s*[.:]?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
  const phoneM = text.match(
    /(?:Tel|Telefon)\.?\s*[.:]?\s*(\+?\d[\d()\-–\s/]{5,18}\d)/
  );

  return {
    refNumber,
    name,
    category,
    lat: primary ? primary.lat : null,
    lng: primary ? primary.lng : null,
    format: primary ? primary.format : null,
    latRaw: primary ? primary.latRaw : "",
    lngRaw: primary ? primary.lngRaw : "",
    rawGps: primary ? primary.raw : "",
    altitude,
    maxWomos: maxM ? maxM[1].replace(/\s+/g, "") : "",
    equipment: captureField(text, "Ausstattung"),
    description: captureField(text, "Beschreibung"),
    prices: captureField(text, "Preise?"),
    directions: captureField(text, "Anfahrt"),
    phone: phoneM ? phoneM[1].trim() : "",
    opened: captureField(text, "Geöffnet"),
    coordinates,
    rawText: rawText,
  };
}
