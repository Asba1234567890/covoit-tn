import { NextRequest, NextResponse } from "next/server";
import { GoogleMapProvider } from "@/lib/map/GoogleMapProvider";

const map = new GoogleMapProvider();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await map.geocode(q.trim(), "tn");
    return NextResponse.json({
      results: results.map((r) => ({ label: r.label, lat: r.location.lat, lng: r.location.lng })),
    });
  } catch (e) {
    // Unlike route(), there's no reasonable fallback location to hand back
    // here — surface a distinct error instead of a raw 500, so the client
    // can tell "the search failed" apart from "no matches for this query".
    console.error("[locations] geocode failed:", (e as Error).message);
    return NextResponse.json({ error: "Location search is temporarily unavailable" }, { status: 503 });
  }
}
