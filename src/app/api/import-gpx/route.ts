import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { points } from "@/db/schema";
export const dynamic = "force-dynamic";
function parseGpx(text: string) {
  const wpts: any[] = [];
  const wptRe = /<wpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/g;
  let m;
  while ((m = wptRe.exec(text))) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    const inner = m[3];
    const nameM = inner.match(/<name>([^<]*)<\/name>/);
    const descM = inner.match(/<desc>([^<]*)<\/desc>/);
    const eleM = inner.match(/<ele>([^<]*)<\/ele>/);
    wpts.push({ lat, lng, name: nameM?.[1] || "Import", description: descM?.[1] || "", altitude: eleM ? parseInt(eleM[1]) : null });
  }
  // also KML
  const pmRe = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  while ((m = pmRe.exec(text))) {
    const inner = m[1];
    const coordM = inner.match(/<coordinates>([^<]+)<\/coordinates>/);
    const nameM = inner.match(/<name>([^<]*)<\/name>/);
    if (coordM) {
      const [lngS, latS, altS] = coordM[1].trim().split(",").map(s => s.trim());
      const lat = parseFloat(latS);
      const lng = parseFloat(lngS);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        wpts.push({ lat, lng, name: nameM?.[1] || "Import", description: "", altitude: altS ? parseInt(altS) : null });
      }
    }
  }
  return wpts;
}
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const mapId = form.get("mapId") as string | null;
  if (!file || !mapId) return NextResponse.json({ error: "file and mapId required" }, { status: 400 });
  const text = await file.text();
  const pts = parseGpx(text);
  if (pts.length === 0) return NextResponse.json({ error: "no points found" }, { status: 400 });
  const inserted = [];
  for (const p of pts) {
    const [created] = await db.insert(points).values({
      mapId,
      name: p.name.slice(0, 120),
      lat: p.lat,
      lng: p.lng,
      altitude: p.altitude,
      description: p.description.slice(0, 500),
      source: "import",
    }).returning();
    inserted.push(created);
  }
  return NextResponse.json({ imported: inserted.length, points: inserted });
}
