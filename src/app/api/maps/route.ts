import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { seedDemoIfEmpty } from "@/lib/seed";

export async function GET() {
  await seedDemoIfEmpty();
  const rows = await db
    .select({
      id: maps.id,
      name: maps.name,
      description: maps.description,
      color: maps.color,
      createdAt: maps.createdAt,
      pointCount: count(points.id),
    })
    .from(maps)
    .leftJoin(points, eq(points.mapId, maps.id))
    .groupBy(maps.id)
    .orderBy(maps.createdAt);
  return NextResponse.json({ maps: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    color?: string;
  };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }
  const [created] = await db
    .insert(maps)
    .values({
      name,
      description: body.description ?? "",
      color: body.color ?? "#E9A13B",
    })
    .returning();
  return NextResponse.json({ map: created }, { status: 201 });
}

export const dynamic = "force-dynamic";
