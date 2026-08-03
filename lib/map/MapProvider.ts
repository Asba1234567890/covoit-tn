// Map abstraction layer. The rest of the app calls this interface only —
// never a specific vendor SDK directly — so we can swap Mapbox / Google /
// OSM later without touching business logic.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  label: string;
  location: LatLng;
  cityId?: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: unknown; // encoded polyline or GeoJSON, vendor-specific internally
}

export interface MapProvider {
  geocode(query: string, countryCode: string): Promise<GeocodeResult[]>;
  reverseGeocode(point: LatLng): Promise<GeocodeResult | null>;
  route(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult>;
  distanceMeters(a: LatLng, b: LatLng): number; // straight-line, for quick filtering
  nearbyPickupPoints(point: LatLng, radiusMeters: number): Promise<GeocodeResult[]>;
}

// Simple haversine helper shared by all provider implementations.
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
