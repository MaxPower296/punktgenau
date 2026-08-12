import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { "User-Agent": "Punktgenau/1.0 (punktgenau@example.com)" }, next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("nominatim failed");
    const data = await res.json();
    return NextResponse.json({
      display_name: data.display_name,
      address: data.address,
      lat: data.lat,
      lon: data.lon,
    });
  } catch (e) {
    return NextResponse.json({ error: "reverse failed", display_name: `${lat}, ${lng}` }, { status: 200 });
  }
}
