import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const rawFormat = req.nextUrl.searchParams.get("format") ?? "kml";

  const [map] = await db.select().from(maps).where(eq(maps.id, id));
  if (!map) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const pts = await db
    .select()
    .from(points)
    .where(eq(points.mapId, id))
    .orderBy(asc(points.createdAt));

  // JSON-Backup-Format
  if (rawFormat === "json" || rawFormat === "backup") {
    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      map: { name: map.name, description: map.description, color: map.color },
      points: pts.map((p) => ({
        name: p.name,
        refNumber: p.refNumber,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        altitude: p.altitude,
        maxWomos: p.maxWomos,
        equipment: p.equipment,
        description: p.description,
        prices: p.prices,
        directions: p.directions,
        phone: p.phone,
        notes: p.notes,
        rawGps: p.rawGps,
        favorite: p.favorite,
        visited: p.visited,
        visitedAt: p.visitedAt?.toISOString() ?? null,
        photoUrl: p.photoUrl,
        address: p.address,
      })),
    };
    const safeName = map.name.replace(/[^\wäöüÄÖÜß -]+/g, "").trim() || "backup";
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-backup.json"`,
      },
    });
  }

  const format = rawFormat as ExportFormat;
  const spec = EXPORT_FORMATS[format];
  if (!spec) return NextResponse.json({ error: "Unbekanntes Format" }, { status: 400 });

  const content = (spec.build as (p: typeof pts, n: string) => string)(pts, map.name);
  const safeName = map.name.replace(/[^\wäöüÄÖÜß -]+/g, "").trim() || "karte";
  return new NextResponse(content, {
    headers: {
      "Content-Type": `${spec.mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${safeName}.${spec.ext}"`,
    },
  });
}

export const dynamic = "force-dynamic";
