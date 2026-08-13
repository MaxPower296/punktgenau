import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points, pointImages } from "@/db/schema";
export const dynamic = "force-dynamic";
export async function GET() {
  const allMaps = await db.select().from(maps);
  const allPoints = await db.select().from(points);
  const allImages = await db.select().from(pointImages);
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    maps: allMaps,
    points: allPoints,
    images: allImages,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="punktgenau-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { maps: m, points: p, images: imgs } = body;
  if (!Array.isArray(m) || !Array.isArray(p)) return NextResponse.json({ error: "invalid backup" }, { status: 400 });
  // Simple import: create missing maps/points; keep IDs if not exists
  let importedMaps = 0;
  let importedPoints = 0;
  for (const map of m) {
    try {
      await db.insert(maps).values({
        id: map.id,
        name: map.name,
        description: map.description,
        color: map.color,
        shareToken: map.shareToken,
      }).onConflictDoNothing();
      importedMaps++;
    } catch {}
  }
  for (const pt of p) {
    try {
      await db.insert(points).values({
        id: pt.id,
        mapId: pt.mapId,
        name: pt.name,
        refNumber: pt.refNumber,
        category: pt.category,
        lat: pt.lat,
        lng: pt.lng,
        altitude: pt.altitude,
        maxWomos: pt.maxWomos,
        equipment: pt.equipment,
        description: pt.description,
        prices: pt.prices,
        directions: pt.directions,
        phone: pt.phone,
        notes: pt.notes,
        rawGps: pt.rawGps,
        rawText: pt.rawText,
        source: pt.source,
        favorite: pt.favorite,
        visited: pt.visited,
        visitedAt: pt.visitedAt ? new Date(pt.visitedAt) : null,
        imageUrl: pt.imageUrl,
      }).onConflictDoNothing();
      importedPoints++;
    } catch {}
  }
  if (Array.isArray(imgs)) {
    for (const im of imgs) {
      try { await db.insert(pointImages).values({ id: im.id, pointId: im.pointId, url: im.url, caption: im.caption }).onConflictDoNothing(); } catch {}
    }
  }
  return NextResponse.json({ importedMaps, importedPoints });
}
