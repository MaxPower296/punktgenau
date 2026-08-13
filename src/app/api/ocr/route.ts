import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import exifr from "exifr";
import { findCoordinates } from "@/lib/coordinates";
import { parseGuideText } from "@/lib/guide-parse";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

// Lazy Worker - erst beim ersten Aufruf laden, damit Build nicht bricht
let workerPromise: Promise<any> | null = null;

async function getWorker(): Promise<any> {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    const cachePath = process.env.VERCEL ? "/tmp/.tessdata-cache" : ".tessdata-cache";
    workerPromise = createWorker("deu", 1, {
      cachePath,
      logger: () => {},
      errorHandler: (e: any) => console.error("[tesseract]", e),
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      gzip: true,
    });
  }
  return workerPromise;
}

const KEYWORDS = [
  "gps", "womo", "stellplatz", "camping", "beschreibung",
  "ausstattung", "anfahrt", "picknick", "wanderparkplatz", "max",
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
  const reqId = Math.random().toString(36).slice(2,6);
  console.log(`[ocr:${reqId}] start`);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Keine Bilddatei übergeben", fallback: true }, { status: 400 });
  }
  console.log(`[ocr:${reqId}] file ${file.name} ${(file.size/1024).toFixed(0)}KB type=${file.type}`);
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max. 10 MB) - bitte vorher mit Zuschnitt verkleinern", fallback: true }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  let photoGps: { latitude: number; longitude: number } | null = null;
  try {
    const gps = await exifr.gps(input);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      photoGps = { latitude: gps.latitude, longitude: gps.longitude };
    }
  } catch {}

  // Farberkennung VOR sharp-greyscale, sonst gehen Farben verloren
  let detectedColorCategory: string | null = null;
  try {
    const pixelBuf = await sharp(input).resize(80, 80, { fit: "cover" }).raw().toBuffer();
    let blueCount=0, violetCount=0, greenCount=0, yellowCount=0, lightGreenCount=0;
    for (let i=0;i<pixelBuf.length;i+=4){
      const r=pixelBuf[i], g=pixelBuf[i+1], b=pixelBuf[i+2];
      const rf=r/255,gf=g/255,bf=b/255;
      const max=Math.max(rf,gf,bf), min=Math.min(rf,gf,bf);
      let h=0,s=0; const l=(max+min)/2;
      if(max!==min){
        const d=max-min; s=l>0.5? d/(2-max-min): d/(max+min);
        switch(max){
          case rf: h=(gf-bf)/d + (gf<bf?6:0); break;
          case gf: h=(bf-rf)/d +2; break;
          case bf: h=(rf-gf)/d +4; break;
        } h/=6;
      }
      const hue=h*360, sat=s*100, lum=l*100;
      if(sat<12||lum<15||lum>88) continue;
      if(hue>=110&&hue<165) greenCount++;
      else if(hue>=65&&hue<110) lightGreenCount++;
      else if(hue>=165&&hue<250) blueCount++;
      else if(hue>=250&&hue<355||(hue>=0&&hue<15&&sat>25)) violetCount++;
      else if(hue>=15&&hue<65) yellowCount++;
    }
    const counts=[
      {cat:"Wanderparkplatz",count:greenCount},
      {cat:"Campingplatz",count:lightGreenCount},
      {cat:"Badeplatz",count:blueCount},
      {cat:"Picknickplatz",count:violetCount},
      {cat:"Stellplatz",count:yellowCount},
    ];
    counts.sort((a,b)=>b.count-a.count);
    if(counts[0].count>35) detectedColorCategory=counts[0].cat;
    console.log(`[ocr:${reqId}] color ${detectedColorCategory} (${JSON.stringify(counts)})`);
  } catch (e){ console.error(`[ocr:${reqId}] color fail`, e); }

  let base: Buffer;
  try {
    base = await sharp(input).rotate().resize({ width: 1300, withoutEnlargement: true }).greyscale().normalize({ lower: 2, upper: 98 }).sharpen().png().toBuffer();
  } catch (e:any) {
    console.error(`[ocr:${reqId}] sharp fail`, e);
    return NextResponse.json({ error: "Bildformat nicht lesbar: "+ (e?.message||e), fallback: true }, { status: 422 });
  }

  let worker: any;
  try {
    console.log(`[ocr:${reqId}] getWorker...`);
    worker = await getWorker();
    console.log(`[ocr:${reqId}] worker ready`);
  } catch (e:any) {
    console.error(`[ocr:${reqId}] getWorker failed`, e);
    return NextResponse.json({ error: `OCR Worker Start fehlgeschlagen (${e?.message||e}). Das ist auf Vercel Hobby beim ersten Foto normal - bitte Zuschnitt nutzen und erneut versuchen.`, fallback: true, details: String(e?.message||e) }, { status: 503 });
  }

  const attempts: Attempt[] = [];
  const recognizeAt = async (angle: number): Promise<Attempt> => {
    const img = angle===0 ? base : await sharp(base).rotate(angle).toBuffer();
    const { data } = await worker.recognize(img);
    const text = data.text ?? "";
    const lower=text.toLowerCase();
    const keywordHits=KEYWORDS.reduce((n,k)=> n+(lower.includes(k)?1:0),0);
    const hasGps=findCoordinates(text).length>0;
    const confidence=data.confidence ?? 0;
    console.log(`[ocr:${reqId}] attempt ${angle}° conf=${confidence} hasGps=${hasGps} kw=${keywordHits}`);
    return { angle, text, confidence, hasGps, keywordHits, score: confidence + (hasGps?70:0) + keywordHits*5 };
  };

  try {
    const first = await recognizeAt(0);
    attempts.push(first);
    let best=first;
    const hasGoodFirstScan=first.hasGps && first.confidence>=40;
    if(!hasGoodFirstScan){
      const angles=[180,90,270];
      for(const angle of angles){
        if(best.hasGps && best.confidence>=55) break;
        const a=await recognizeAt(angle);
        attempts.push(a);
        if(a.score>best.score) best=a;
      }
    }
    const bestFinal = attempts.reduce((a,b)=> b.score>a.score?b:a, attempts[0]);
    const parsed=parseGuideText(bestFinal.text);
    if(detectedColorCategory){
      if(detectedColorCategory==="Wanderparkplatz") parsed.category="WOMO-Wanderparkplatz";
      else if(detectedColorCategory==="Campingplatz") parsed.category="WOMO-Campingplatz";
      else if(detectedColorCategory==="Badeplatz") parsed.category="Badeplatz";
      else if(detectedColorCategory==="Picknickplatz") parsed.category="WOMO-Picknickplatz";
      else if(detectedColorCategory==="Stellplatz") parsed.category="Offizieller WOMO-Stellplatz";
    }
    console.log(`[ocr:${reqId}] done best=${bestFinal.angle}° conf=${bestFinal.confidence} parsed=${parsed.name} ${parsed.category}`);
    return NextResponse.json({
      rotation: bestFinal.angle,
      confidence: Math.round(bestFinal.confidence),
      foundGps: bestFinal.hasGps,
      ocrText: bestFinal.text,
      parsed,
      photoGps,
      detectedColorCategory,
    });
  } catch (e:any) {
    console.error(`[ocr:${reqId}] recognize failed`, e);
    const msg=String(e?.message||e);
    const isModuleError=msg.includes("Cannot find module");
    return NextResponse.json({
      error: isModuleError
        ? `Vercel Modul-Fehler: ${msg}. Bitte erneut versuchen - beim 2. Foto klappt es meist.`
        : `OCR fehlgeschlagen: ${msg}`,
      fallback: true,
      details: msg,
    }, { status: isModuleError?503:500 });
  }
}
