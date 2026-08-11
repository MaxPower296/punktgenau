import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy für Nominatim Reverse Geocoding (OpenStreetMap).
 * Kein API-Key nötig – kostenlos und privat.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat und lng erforderlich" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&accept-language=de`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Punktgenau-PWA/1.0 (contact@punktgenau.app)" },
    });
    if (!res.ok) return NextResponse.json({ address: null });
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road,
      a.house_number,
      a.village || a.town || a.city || a.municipality,
      a.state || a.county,
      a.country,
    ].filter(Boolean);
    return NextResponse.json({
      address: data.display_name || parts.join(", "),
      short: [a.village || a.town || a.city, a.state, a.country].filter(Boolean).join(", "),
      osm: data,
    });
  } catch {
    return NextResponse.json({ address: null });
  }
}

export const dynamic = "force-dynamic";
