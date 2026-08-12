import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy für Open-Meteo Wetter-API. Komplett kostenlos, kein Key nötig.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat und lng erforderlich" }, { status: 400 });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=3`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ weather: null });
    const data = await res.json();
    return NextResponse.json({ weather: data });
  } catch {
    return NextResponse.json({ weather: null });
  }
}

export const dynamic = "force-dynamic";
