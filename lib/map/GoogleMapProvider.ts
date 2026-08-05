import { MapProvider, GeocodeResult, RouteResult, LatLng, haversineMeters } from "./MapProvider";

// Google Maps Platform implementation — Geocoding API, Directions API, and
// Places Nearby Search. Requires GOOGLE_MAPS_API_KEY (server-side secret,
// restrict by IP + API in Google Cloud Console) and billing enabled on the
// associated project; Google requires billing for all Maps Platform APIs
// even within the free monthly credit.

const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";
const PLACES_NEARBY_BASE = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return key;
}

export class GoogleMapProvider implements MapProvider {
  async geocode(query: string, countryCode: string): Promise<GeocodeResult[]> {
    const url = `${GEOCODE_BASE}?address=${encodeURIComponent(query)}&components=country:${countryCode.toUpperCase()}&key=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding API responded with ${res.status}`);
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK") throw new Error(`Geocoding API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
    return data.results.map((r) => ({
      label: r.formatted_address,
      location: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
    }));
  }

  async reverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
    const url = `${GEOCODE_BASE}?latlng=${point.lat},${point.lng}&key=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding API responded with ${res.status}`);
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results: Array<{ formatted_address: string }>;
    };
    if (data.status === "ZERO_RESULTS") return null;
    if (data.status !== "OK") throw new Error(`Geocoding API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
    const first = data.results[0];
    if (!first) return null;
    return { label: first.formatted_address, location: point };
  }

  async route(origin: LatLng, destination: LatLng, waypoints: LatLng[] = []): Promise<RouteResult> {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      key: apiKey(),
    });
    if (waypoints.length > 0) {
      params.set("waypoints", waypoints.map((p) => `${p.lat},${p.lng}`).join("|"));
    }
    try {
      const res = await fetch(`${DIRECTIONS_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error(`Directions API responded with ${res.status}`);
      const data = await res.json();
      if (data.status !== "OK") throw new Error(`Directions API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
      const route = data.routes?.[0];
      const legs: Array<{ distance: { value: number }; duration: { value: number } }> = route?.legs ?? [];
      return {
        distanceMeters: legs.reduce((sum, leg) => sum + leg.distance.value, 0) || haversineMeters(origin, destination),
        durationSeconds: legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        geometry: route?.overview_polyline?.points ?? null,
      };
    } catch (e) {
      // Same reliability posture as the OSM provider this replaces: a
      // routing failure (quota, billing not enabled, network) must degrade
      // search/ride-creation to straight-line distance, not take the whole
      // request down (this call sits on both paths).
      console.error("[GoogleMapProvider] route() failed, falling back to straight-line distance:", (e as Error).message);
      return {
        distanceMeters: haversineMeters(origin, destination),
        durationSeconds: 0,
        geometry: null,
      };
    }
  }

  distanceMeters(a: LatLng, b: LatLng): number {
    return haversineMeters(a, b);
  }

  async nearbyPickupPoints(point: LatLng, radiusMeters: number): Promise<GeocodeResult[]> {
    const url = `${PLACES_NEARBY_BASE}?location=${point.lat},${point.lng}&radius=${radiusMeters}&keyword=station,mall,cafe&key=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Places API responded with ${res.status}`);
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results: Array<{ name: string; vicinity?: string; geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK") throw new Error(`Places API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
    return data.results.map((r) => ({
      label: r.vicinity ? `${r.name}, ${r.vicinity}` : r.name,
      location: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
    }));
  }
}
