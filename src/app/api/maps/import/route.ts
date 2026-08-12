import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points } from "@/db/schema";

/**
 * Importiert eine Backup-JSON-Datei, GPX oder KML als neue Karte.
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const data = JSON.parse(text);

    // JSON-Backup-Import
    if (data.version && data.map && data.points) {
      const [map] = await db
        .insert(maps)
        .values({
          name: `${data.map.name} (Import)`,
          description: data.map.description ?? "",
          color: data.map.color ?? "#E9A13B",
        })
        .returning();

      if (Array.isArray(data.points) && data.points.length > 0) {
        const insertData = data.points
          .filter((p: Record<string, unknown>) => typeof p.lat === "number" && typeof p.lng === "number")
          .map((p: Record<string, unknown>) => ({
            mapId: map.id,
            name: String(p.name || "Importierter Punkt"),
            refNumber: String(p.refNumber || ""),
            category: String(p.category || ""),
            lat: Number(p.lat),
            lng: Number(p.lng),
            altitude: p.altitude != null ? Number(p.altitude) : null,
            maxWomos: String(p.maxWomos || ""),
            equipment: String(p.equipment || ""),
            description: String(p.description || ""),
            prices: String(p.prices || ""),
            directions: String(p.directions || ""),
            phone: String(p.phone || ""),
            notes: String(p.notes || ""),
            rawGps: String(p.rawGps || ""),
            favorite: Boolean(p.favorite),
            visited: Boolean(p.visited),
            address: String(p.address || ""),
            source: "import" as const,
          }));

        // Inserts in Batches von 50
        for (let i = 0; i < insertData.length; i += 50) {
          await db.insert(points).values(insertData.slice(i, i + 50));
        }
      }

      return NextResponse.json({
        ok: true,
        mapId: map.id,
        count: data.points?.length ?? 0,
        message: `Karte „${map.name}" mit ${data.points?.length ?? 0} Punkten importiert`,
      });
    }

    return NextResponse.json({ error: "Nicht unterstütztes Dateiformat" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Datei ist kein gültiges JSON" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
