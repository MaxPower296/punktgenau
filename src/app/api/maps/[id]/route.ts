import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const [map] = await db.select().from(maps).where(eq(maps.id, id));
  if (!map) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const pts = await db
    .select()
    .from(points)
    .where(eq(points.mapId, id))
    .orderBy(asc(points.createdAt));
  return NextResponse.json({ map, points: pts });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<{
    name: string;
    description: string;
    color: string;
  }>;
  const [updated] = await db
    .update(maps)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
    })
    .where(eq(maps.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json({ map: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(maps).where(eq(maps.id, id));
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
