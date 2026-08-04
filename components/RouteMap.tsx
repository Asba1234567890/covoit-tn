"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface RouteMapProps {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  geometry?: { type: "LineString"; coordinates: [number, number][] } | null;
}

// Leaflet touches `window` on import, so this only ever runs client-side —
// callers must dynamic-import with ssr:false (see RouteMapLoader below).
export default function RouteMap({ originLat, originLng, destinationLat, destinationLng, geometry }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      const originPoint: [number, number] = [originLat, originLng];
      const destinationPoint: [number, number] = [destinationLat, destinationLng];

      L.circleMarker(originPoint, { radius: 8, color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip("Pickup");
      L.circleMarker(destinationPoint, { radius: 8, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip("Drop-off");

      const line =
        geometry?.type === "LineString"
          ? L.geoJSON(geometry as any, { style: { color: "#000", weight: 4, opacity: 0.7 } }).addTo(map)
          : L.polyline([originPoint, destinationPoint], { color: "#000", weight: 3, opacity: 0.5, dashArray: "6 6" }).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [24, 24] });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLat, originLng, destinationLat, destinationLng]);

  return <div ref={containerRef} className="h-56 w-full rounded-xl border" />;
}
