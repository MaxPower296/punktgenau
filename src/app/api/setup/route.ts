import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { seedDemoIfEmpty } from "@/lib/seed";

/**
 * Auto-Setup: Erstellt die Datenbank-Tabellen und fügt Demo-Daten ein.
 * Aufrufbar über /api/setup
 */
export async function GET() {
  try {
    // Tabellen erstellen falls nicht vorhanden
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS maps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#E9A13B',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Unbenannter Punkt',
        ref_number TEXT DEFAULT '',
        category TEXT DEFAULT '',
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        altitude INTEGER,
        max_womos TEXT DEFAULT '',
        equipment TEXT DEFAULT '',
        description TEXT DEFAULT '',
        prices TEXT DEFAULT '',
        directions TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        raw_gps TEXT DEFAULT '',
        raw_text TEXT DEFAULT '',
        source TEXT NOT NULL DEFAULT 'ocr',
        favorite BOOLEAN NOT NULL DEFAULT FALSE,
        visited BOOLEAN NOT NULL DEFAULT FALSE,
        visited_at TIMESTAMPTZ,
        photo_url TEXT,
        address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Demo-Daten einfügen
    await seedDemoIfEmpty();

    return NextResponse.json({
      ok: true,
      message: "Datenbank-Tabellen erstellt und Demo-Daten geladen",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error),
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
