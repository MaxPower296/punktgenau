import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import exifr from "exifr";
import { findCoordinates } from "@/lib/coordinates";
import { parseGuideText } from "@/lib/guide-parse";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lazy Worker - erst beim ersten Aufruf laden, damit Build nicht bricht wenn tesseract fehlt
let workerPromise: Promise<any> | null = null;

async function getWorker(): Promise<any> {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    const cachePath = process.env.VERCEL ? "/tmp/.tessdata-cache" : ".tessdata-cache";
    workerPromise = createWorker("deu", 1, {
      cachePath,
      logger: () => {},
      errorHandler: (e: any) => console.error("[tesseract]", e),
      // WICHTIG für Vercel: CDN Fallback wenn lokale .traineddata nicht gefunden wird
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      gzip: true,
    });
  }
  return workerPromise;
}

const KEYWORDS = [
  "gps",
  "womo",
  "stellplatz",
  "camping",
  "beschreibung",
  "ausstattung",
  "anfahrt",
  "picknick",
  "wanderparkplatz",
  "max",
];

interface Attempt {
  angle: number;
  text: string;
  confidence: number;
  hasGps: boolean;
  keywordHits: number;
  score: number;
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Keine Bilddatei übergeben" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max. 12 MB auf Vercel Free - bitte vorher zuschneiden)" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  let photoGps: { latitude: number; longitude: number } | null = null;
  try {
    const gps = await exifr.gps(input);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      photoGps = { latitude: gps.latitude, longitude: gps.longitude };
    }
  } catch {}

  let base: Buffer;
  try {
    base = await sharp(input)
      .rotate()
      .resize({ width: 1300, withoutEnlargement: true })
      .greyscale()
      .normalize({ lower: 2, upper: 98 })
      .sharpen()
      .png()
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Bildformat nicht lesbar – bitte als JPG oder PNG senden." },
      { status: 422 }
    );
  }

  let worker: any;
  try {
    worker = await getWorker();
  } catch (e: any) {
    console.error("[ocr getWorker failed]", e);
    // Fallback: Sage dem Client er soll im Browser OCR machen
    return NextResponse.json(
      { error: "OCR Worker konnte nicht gestartet werden (Vercel Memory Limit). Bitte nutze Zuschnitt-Editor oder versuche erneut. Detail: " + (e?.message || e), fallback: true },
      { status: 503 }
    );
  }

  const attempts: Attempt[] = [];

  const recognizeAt = async (angle: number): Promise<Attempt> => {
    const img =
      angle === 0 ? base : await sharp(base).rotate(angle).toBuffer();
    const { data } = await worker.recognize(img);
    const text = data.text ?? "";
    const lower = text.toLowerCase();
    const keywordHits = KEYWORDS.reduce(
      (n, k) => n + (lower.includes(k) ? 1 : 0),
      0
    );
    const hasGps = findCoordinates(text).length > 0;
    const confidence = data.confidence ?? 0;
    const score = confidence + (hasGps ? 70 : 0) + keywordHits * 5;
    return { angle, text, confidence, hasGps, keywordHits, score };
  };

  try {
    const first = await recognizeAt(0);
    attempts.push(first);
    let best = first;
    const hasGoodFirstScan = first.hasGps && first.confidence >= 40;
    if (!hasGoodFirstScan) {
      const angles = [180, 90, 270];
      for (const angle of angles) {
        if (best.hasGps && best.confidence >= 55) break;
        const a = await recognizeAt(angle);
        attempts.push(a);
        if (a.score > best.score) best = a;
      }
    }
  } catch (e: any) {
    console.error("[ocr recognize failed]", e);
    // Wenn es der bekannte "Cannot find module" Fehler ist, sende fallback Signal
    if (String(e?.message || e).includes("Cannot find module")) {
      return NextResponse.json(
        { error: "Vercel Server-OCR temporär nicht verfügbar - Browser-OCR wird versucht.", fallback: true, details: String(e?.message || e) },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "OCR fehlgeschlagen – bitte erneut versuchen." },
      { status: 500 }
    );
  }

  let detectedColorCategory: string | null = null;
  try {
    const pixelBuf = await sharp(input)
      .resize(80, 80, { fit: "cover" })
      .raw()
      .toBuffer();

    let blueCount = 0;
    let violetCount = 0;
    let greenCount = 0;
    let yellowCount = 0;
    let lightGreenCount = 0;

    for (let i = 0; i < pixelBuf.length; i += 4) {
      const r = pixelBuf[i];
      const g = pixelBuf[i + 1];
      const b = pixelBuf[i + 2];
      const rf = r / 255;
      const gf = g / 255;
      const bf = b / 255;
      const max = Math.max(rf, gf, bf);
      const min = Math.min(rf, gf, bf);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
          case gf: h = (bf - rf) / d + 2; break;
          case bf: h = (rf - gf) / d + 4; break;
        }
        h /= 6;
      }
      const hue = h * 360;
      const sat = s * 100;
      const lum = l * 100;
      if (sat < 12 || lum < 15 || lum > 88) continue;
      if (hue >= 110 && hue < 165) {
        greenCount++;
      } else if (hue >= 65 && hue < 110) {
        lightGreenCount++;
      } else if (hue >= 165 && hue < 250) {
        blueCount++;
      } else if (hue >= 250 && hue < 355 || (hue >= 0 && hue < 15 && sat > 25)) {
        violetCount++;
      } else if (hue >= 15 && hue < 65) {
        yellowCount++;
      }
    }
    const counts = [
      { cat: "Wanderparkplatz", count: greenCount },
      { cat: "Campingplatz", count: lightGreenCount },
      { cat: "Badeplatz", count: blueCount },
      { cat: "Picknickplatz", count: violetCount },
      { cat: "Stellplatz", count: yellowCount },
    ];
    counts.sort((a, b) => b.count - a.count);
    const top = counts[0];
    if (top && top.count > 35) detectedColorCategory = top.cat;
  } catch (err) {
    console.error("[color-detection]", err);
  }

  const best = attempts.reduce((a, b) => (b.score > a.score ? b : a), attempts[0]);
  const parsed = parseGuideText(best.text);

  if (detectedColorCategory) {
    if (detectedColorCategory === "Wanderparkplatz") parsed.category = "WOMO-Wanderparkplatz";
    else if (detectedColorCategory === "Campingplatz") parsed.category = "WOMO-Campingplatz";
    else if (detectedColorCategory === "Badeplatz") parsed.category = "Badeplatz";
    else if (detectedColorCategory === "Picknickplatz") parsed.category = "WOMO-Picknickplatz";
    else if (detectedColorCategory === "Stellplatz") parsed.category = "Offizieller WOMO-Stellplatz";
  }

  return NextResponse.json({
    rotation: best.angle,
    confidence: Math.round(best.confidence),
    foundGps: best.hasGps,
    ocrText: best.text,
    parsed,
    photoGps,
    detectedColorCategory,
  });
}
