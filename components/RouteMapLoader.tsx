"use client";

import dynamic from "next/dynamic";

// next/dynamic's ssr:false is only usable from a Client Component in the App
// Router — this thin wrapper is what lets the (server) ride details page
// pull in a Leaflet map without ever trying to render it on the server.
const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl border bg-neutral-100" />,
});

export default RouteMap;
