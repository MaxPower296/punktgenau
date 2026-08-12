import { NextRequest, NextResponse } from "next/server";
import { parseGuideText } from "@/lib/guide-parse";

/** Zerlegt eingefügten Text (ohne OCR) in Koordinaten + Reiseführer-Felder. */
export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };
  if (!text || text.trim().length < 3) {
    return NextResponse.json({ error: "Kein Text übergeben" }, { status: 400 });
  }
  return NextResponse.json({ parsed: parseGuideText(text.slice(0, 20000)) });
}

export const dynamic = "force-dynamic";
