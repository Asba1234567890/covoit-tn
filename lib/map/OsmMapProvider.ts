import { MapProvider, GeocodeResult, RouteResult, LatLng, haversineMeters } from "./MapProvider";

// Development-stage implementation: Nominatim for geocoding, OSRM for routing.
// Both are free and key-less, which is why they're the practical starting
// choice for an MVP per spec §11. Swap for Mapbox/Google in production by
// implementing the same MapProvider interface — nothing else changes.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";

export class OsmMapProvider implements MapProvider {
  async geocode(query: string, countryCode: string): Promise<GeocodeResult[]> {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=${countryCode.toLowerCase()}&limit=5`;
    const res = await fetch(url, { headers: { "User-Agent": "covoit-tn/0.1" } });
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return data.map((d) => ({
      label: d.display_name,
      location: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
    }));
  }

  async reverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${point.lat}&lon=${point.lng}`;
    const res = await fetch(url, { headers: { "User-Agent": "covoit-tn/0.1" } });
    const d = (await res.json()) as { display_name?: string };
    if (!d.display_name) return null;
    return { label: d.display_name, location: point };
  }

  async route(origin: LatLng, destination: LatLng, waypoints: LatLng[] = []): Promise<RouteResult> {
    const coords = [origin, ...waypoints, destination]
      .map((p) => `${p.lng},${p.lat}`)
      .join(";");
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes?.[0];
    return {
      distanceMeters: route?.distance ?? haversineMeters(origin, destination),
      durationSeconds: route?.duration ?? 0,
      geometry: route?.geometry ?? null,
    };
  }

  distanceMeters(a: LatLng, b: LatLng): number {
    return haversineMeters(a, b);
  }

  async nearbyPickupPoints(point: LatLng, radiusMeters: number): Promise<GeocodeResult[]> {
    // MVP heuristic: query Nominatim for well-known place categories nearby.
    // Replace with a curated "safe pickup points" table once seeded per city.
    const delta = radiusMeters / 111000; // rough degrees
    const viewbox = `${point.lng - delta},${point.lat + delta},${point.lng + delta},${point.lat - delta}`;
    const url = `${NOMINATIM_BASE}/search?format=json&viewbox=${viewbox}&bounded=1&q=station,mall,cafe&limit=10`;
    const res = await fetch(url, { headers: { "User-Agent": "covoit-tn/0.1" } });
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return data.map((d) => ({
      label: d.display_name,
      location: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
    }));
  }
}
