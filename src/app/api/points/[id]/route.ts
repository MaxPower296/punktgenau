import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { points } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  const allowed = new Set([
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
    "favorite",
    "visited",
    "visitedAt",
    "imageUrl",
  ]);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) {
      if (k === "visitedAt") {
        set[k] = v ? new Date(v as string) : null;
      } else {
        set[k] = v;
      }
    }
  }
  if (body.visited === true && !body.visitedAt) set.visitedAt = new Date();
  if (body.visited === false) set.visitedAt = null;
  if (set.lat !== undefined) {
    const lat = Number(set.lat);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
      return NextResponse.json({ error: "Ungültige Latitude" }, { status: 400 });
    }
    set.lat = lat;
  }
  if (set.lng !== undefined) {
    const lng = Number(set.lng);
    if (!Number.isFinite(lng) || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Ungültige Longitude" }, { status: 400 });
    }
    set.lng = lng;
  }
  const [updated] = await db.update(points).set(set).where(eq(points.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json({ point: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(points).where(eq(points.id, id));
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
