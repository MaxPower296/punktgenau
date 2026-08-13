import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "");
  const radius = parseInt(req.nextUrl.searchParams.get("radius") || "2000");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  const query = `
[out:json][timeout:10];
(
  node["amenity"~"fuel|drinking_water|toilets|restaurant|cafe|shop"](around:${radius},${lat},${lng});
  node["shop"~"supermarket|convenience"](around:${radius},${lat},${lng});
  node["tourism"~"camp_site|caravan_site"](around:${radius},${lat},${lng});
);
out 20;
`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("overpass failed");
    const data = await res.json();
    const elements = (data.elements || []).map((el: any) => ({
      id: el.id,
      lat: el.lat,
      lon: el.lon,
      tags: el.tags,
      type: el.tags.amenity || el.tags.shop || el.tags.tourism || "poi",
      name: el.tags.name || el.tags.amenity || el.tags.shop || "POI",
    }));
    return NextResponse.json({ elements });
  } catch {
    return NextResponse.json({ elements: [] });
  }
}
