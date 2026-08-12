import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import exifr from "exifr";
import { findCoordinates } from "@/lib/coordinates";
import { parseGuideText } from "@/lib/guide-parse";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Worker wird prozessweit wiederverwendet (Sprachdaten-Cache)
let workerPromise: Promise<Worker> | null = null;
type Worker = Awaited<ReturnType<typeof createWorker>>;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("deu", undefined, {
      cachePath: ".tessdata-cache",
      errorHandler: (e) => console.error("[tesseract]", e),
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
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max. 25 MB)" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  // EXIF-GPS des Fotos (falls direkt am Ort fotografiert wurde)
  let photoGps: { latitude: number; longitude: number } | null = null;
  try {
    const gps = await exifr.gps(input);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      photoGps = { latitude: gps.latitude, longitude: gps.longitude };
    }
  } catch {
    /* kein EXIF-GPS */
  }

  // Vorverarbeitung: EXIF-Drehung, max. 2400 px, Graustufen, Kontrast
  let base: Buffer;
  try {
    base = await sharp(input)
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
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

  const worker = await getWorker();
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
    // Hochgradig beschleunigtes adaptives OCR: 0°-Fast-Path
    const first = await recognizeAt(0);
    attempts.push(first);
    let best = first;

    // Wenn bei 0° bereits Koordinaten und eine plausible Konfidenz vorliegen,
    // überspringen wir die rechenintensiven Rotationsscans komplett!
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
  } catch (e) {
    console.error("[ocr]", e);
    return NextResponse.json(
      { error: "OCR fehlgeschlagen – bitte erneut versuchen." },
      { status: 500 }
    );
  }

  // Farbbasierte Kategorie-Erkennung aus dem Originalfoto
  let detectedColorCategory: string | null = null;
  try {
    // Bild verkleinern auf 80x80 und unkomprimierte RGBA-Pixel laden
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

      // Unbunte Pixel ausblenden (Papierweiß, schwarzer Text, graue Ränder/Schatten)
      if (sat < 12 || lum < 15 || lum > 88) {
        continue;
      }

      // HSL-Hue Einteilung mit der neuen Kategorie Hellgrün (65°-110°) für Campingplatz
      if (hue >= 110 && hue < 165) {
        greenCount++;      // grün = Wanderparkplatz
      } else if (hue >= 65 && hue < 110) {
        lightGreenCount++;  // hellgrün = Campingplatz
      } else if (hue >= 165 && hue < 250) {
        blueCount++;       // blau = Badeplatz
      } else if (hue >= 250 && hue < 355 || (hue >= 0 && hue < 15 && sat > 25)) {
        violetCount++;     // violett = Picknickplatz
      } else if (hue >= 15 && hue < 65) {
        yellowCount++;     // gelb = Stellplatz
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
    // Mindestens 35 farbige Pixel für Relevanz
    if (top && top.count > 35) {
      detectedColorCategory = top.cat;
    }
  } catch (err) {
    console.error("[color-detection]", err);
  }

  const best = attempts.reduce((a, b) => (b.score > a.score ? b : a), attempts[0]);
  const parsed = parseGuideText(best.text);

  // Falls eine Hintergrundfarbe erkannt wurde, überschreiben wir die Text-Kategorie
  if (detectedColorCategory) {
    if (detectedColorCategory === "Wanderparkplatz") {
      parsed.category = "WOMO-Wanderparkplatz";
    } else if (detectedColorCategory === "Campingplatz") {
      parsed.category = "WOMO-Campingplatz";
    } else if (detectedColorCategory === "Badeplatz") {
      parsed.category = "Badeplatz";
    } else if (detectedColorCategory === "Picknickplatz") {
      parsed.category = "WOMO-Picknickplatz";
    } else if (detectedColorCategory === "Stellplatz") {
      parsed.category = "Offizieller WOMO-Stellplatz";
    }
  }

  return NextResponse.json({
    rotation: best.angle,
    confidence: Math.round(best.confidence),
    foundGps: best.hasGps,
    ocrText: best.text,
    parsed,
    photoGps,
    detectedColorCategory, // mitschicken für UI-Feedback
  });
}
