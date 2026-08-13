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
  const format = (req.nextUrl.searchParams.get("format") ?? "kml") as ExportFormat;
  const spec = EXPORT_FORMATS[format];
  if (!spec) return NextResponse.json({ error: "Unbekanntes Format" }, { status: 400 });

  const [map] = await db.select().from(maps).where(eq(maps.id, id));
  if (!map) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const pts = await db
    .select()
    .from(points)
    .where(eq(points.mapId, id))
    .orderBy(asc(points.createdAt));

  const content =
    format === "csv" || format === "geojson"
      ? (spec.build as (p: typeof pts, n: string) => string)(pts, map.name)
      : (spec.build as (p: typeof pts, n: string) => string)(pts, map.name);

  const safeName = map.name.replace(/[^\wäöüÄÖÜß -]+/g, "").trim() || "karte";
  return new NextResponse(content, {
    headers: {
      "Content-Type": `${spec.mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${safeName}.${spec.ext}"`,
    },
  });
}

export const dynamic = "force-dynamic";
