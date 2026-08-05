"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface RouteMapProps {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  // GoogleMapProvider.route() stores Directions API's overview_polyline.points
  // (an encoded polyline string) here. Rides created before the switch to
  // Google Maps may still have the old OSM provider's GeoJSON LineString
  // object in this column — anything that isn't a string falls back to a
  // straight line between origin and destination rather than crashing.
  geometry?: unknown;
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (apiKey) setOptions({ key: apiKey, v: "weekly" });

// The Google Maps JS API touches `window` on load, so this only ever runs
// client-side — callers must dynamic-import with ssr:false (see
// RouteMapLoader below).
export default function RouteMap({ originLat, originLng, destinationLat, destinationLng, geometry }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    // Loading "maps" triggers the full API bootstrap, after which the
    // deprecated-but-still-supported google.maps.Marker/Polyline classes
    // (not part of importLibrary's typed per-library exports) are usable
    // via the global `google.maps` namespace.
    Promise.all([importLibrary("maps"), importLibrary("geometry")]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        scrollwheel: false,
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;

      const originPoint = { lat: originLat, lng: originLng };
      const destinationPoint = { lat: destinationLat, lng: destinationLng };

      new google.maps.Marker({
        position: originPoint,
        map,
        title: "Pickup",
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#16a34a", fillOpacity: 1, strokeWeight: 0 },
      });
      new google.maps.Marker({
        position: destinationPoint,
        map,
        title: "Drop-off",
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#dc2626", fillOpacity: 1, strokeWeight: 0 },
      });

      const path =
        typeof geometry === "string"
          ? google.maps.geometry.encoding.decodePath(geometry)
          : [originPoint, destinationPoint];

      new google.maps.Polyline({
        path,
        map,
        strokeColor: "#000",
        strokeOpacity: typeof geometry === "string" ? 0.7 : 0,
        strokeWeight: typeof geometry === "string" ? 4 : 0,
        // Dashed fallback line when there's no real route geometry to draw —
        // Polyline has no native dashArray, so opacity is zeroed above and
        // the dash comes from repeating this icon along the path instead.
        icons:
          typeof geometry === "string"
            ? undefined
            : [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.5, scale: 3 }, offset: "0", repeat: "12px" }],
      });

      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 24);
    }, (e) => {
      // Network/ad-blocker/quota failures reject this promise rather than
      // throwing synchronously — same "degrade, don't crash" posture as the
      // server-side providers.
      if (!cancelled) {
        console.error("[RouteMap] Google Maps JS API failed to load:", e);
        setLoadFailed(true);
      }
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLat, originLng, destinationLat, destinationLng, geometry]);

  if (!apiKey || loadFailed) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl border bg-neutral-50 text-sm text-ink-secondary">
        Map unavailable
      </div>
    );
  }

  return <div ref={containerRef} className="h-56 w-full rounded-xl border" />;
}
