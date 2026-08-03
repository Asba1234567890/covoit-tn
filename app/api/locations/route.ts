import { NextRequest, NextResponse } from "next/server";
import { OsmMapProvider } from "@/lib/map/OsmMapProvider";

const map = new OsmMapProvider();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  const results = await map.geocode(q.trim(), "tn");
  return NextResponse.json({
    results: results.map((r) => ({ label: r.label, lat: r.location.lat, lng: r.location.lng })),
  });
}
