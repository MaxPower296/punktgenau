import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy für Overpass API – POI-Suche in der Nähe (Tankstellen, Supermärkte, Wasser, WC).
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const radius = req.nextUrl.searchParams.get("radius") ?? "2000"; // Meter
  const type = req.nextUrl.searchParams.get("type") ?? "fuel"; // fuel, supermarket, water, toilets

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat und lng erforderlich" }, { status: 400 });
  }

  const TAG_MAP: Record<string, string> = {
    fuel: '"amenity"="fuel"',
    supermarket: '"shop"="supermarket"',
    water: '"amenity"="drinking_water"',
    toilets: '"amenity"="toilets"',
    restaurant: '"amenity"="restaurant"',
    parking: '"amenity"="parking"',
    campsite: '"tourism"="camp_site"',
  };

  const tag = TAG_MAP[type] ?? TAG_MAP.fuel;

  const query = `
    [out:json][timeout:8];
    (
      node[${tag}](around:${radius},${lat},${lng});
      way[${tag}](around:${radius},${lat},${lng});
    );
    out center body;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return NextResponse.json({ pois: [] });
    const data = await res.json();
    const pois = (data.elements || []).map((el: Record<string, unknown>) => {
      const tags = (el.tags || {}) as Record<string, string>;
      const poiLat = (el.lat ?? (el.center as Record<string, number>)?.lat) as number;
      const poiLng = (el.lon ?? (el.center as Record<string, number>)?.lon) as number;
      return {
        id: el.id,
        lat: poiLat,
        lng: poiLng,
        name: tags.name || tags["name:de"] || tags.brand || type,
        type,
        distance: Math.round(
          6371000 *
            2 *
            Math.asin(
              Math.sqrt(
                Math.sin(((poiLat - Number(lat)) * Math.PI) / 360) ** 2 +
                  Math.cos((Number(lat) * Math.PI) / 180) *
                    Math.cos((poiLat * Math.PI) / 180) *
                    Math.sin(((poiLng - Number(lng)) * Math.PI) / 360) ** 2
              )
            )
        ),
      };
    });
    pois.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
    return NextResponse.json({ pois: pois.slice(0, 20) });
  } catch {
    return NextResponse.json({ pois: [] });
  }
}

export const dynamic = "force-dynamic";
