import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const lats = req.nextUrl.searchParams.get("lats"); // comma separated
  const lngs = req.nextUrl.searchParams.get("lngs");
  const singleLat = req.nextUrl.searchParams.get("lat");
  const singleLng = req.nextUrl.searchParams.get("lng");
  let latArr: number[] = [];
  let lngArr: number[] = [];
  if (lats && lngs) {
    latArr = lats.split(",").map(parseFloat);
    lngArr = lngs.split(",").map(parseFloat);
  } else if (singleLat && singleLng) {
    latArr = [parseFloat(singleLat)];
    lngArr = [parseFloat(singleLng)];
  } else {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  try {
    const locations = latArr.map((la, i) => `${la},${lngArr[i]}`).join("|");
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${latArr.join(",")}&longitude=${lngArr.join(",")}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const elevations: number[] = data.elevation || [];
    return NextResponse.json({ elevations, lat: latArr, lng: lngArr });
  } catch {
    return NextResponse.json({ elevations: latArr.map(() => 0) });
  }
}
