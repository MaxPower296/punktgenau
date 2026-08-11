import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { points, maps } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { haversineM } from "@/lib/coordinates";

const EDITABLE = [
  "name",
  "refNumber",
  "category",
  "lat",
  "lng",
  "altitude",
  "maxWomos",
  "equipment",
  "description",
  "prices",
  "directions",
  "phone",
  "notes",
  "rawGps",
  "rawText",
  "source",
  "favorite",
  "visited",
] as const;

type PointPayload = Partial<Record<(typeof EDITABLE)[number], unknown>> & {
  mapId?: string;
  force?: boolean;
};

function pickEditable(body: PointPayload) {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PointPayload;
  const mapId = body.mapId;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!mapId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "mapId, lat und lng sind erforderlich" }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Koordinaten außerhalb des gültigen Bereichs" }, { status: 400 });
  }
  const [map] = await db.select().from(maps).where(eq(maps.id, mapId));
  if (!map) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

  // Duplikat-Check (± ~100 m im selben Kartenset)
  if (!body.force) {
    const near = await db
      .select()
      .from(points)
      .where(
        and(
          eq(points.mapId, mapId),
          gte(points.lat, lat - 0.0012),
          lte(points.lat, lat + 0.0012),
          gte(points.lng, lng - 0.0018),
          lte(points.lng, lng + 0.0018)
        )
      );
    const dup = near
      .map((p) => ({ p, d: haversineM(lat, lng, p.lat, p.lng) }))
      .filter((x) => x.d < 100)
      .sort((a, b) => a.d - b.d)[0];
    if (dup) {
      return NextResponse.json(
        {
          duplicate: {
            id: dup.p.id,
            name: dup.p.name,
            distanceM: Math.round(dup.d),
          },
        },
        { status: 409 }
      );
    }
  }

  const values = pickEditable(body) as Record<string, unknown>;
  values.lat = lat;
  values.lng = lng;
  values.mapId = mapId;
  delete values.force;

  const [created] = await db
    .insert(points)
    .values(values as typeof points.$inferInsert)
    .returning();
  return NextResponse.json({ point: created }, { status: 201 });
}

export const dynamic = "force-dynamic";
