"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TrustCluster from "@/components/TrustCluster";
import SkeletonCard from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";
import { addRecentSearch } from "@/lib/recentSearches";

interface SearchResult {
  id: string;
  driver: { id: string; firstName: string; rating: number; completedRidesCount: number; verificationLevel: number };
  vehicle: { make: string; model: string; color: string };
  departureAt: string;
  pricePerSeat: string;
  seatsAvailable: number;
  matchScore: number;
  matchExplanation: string[];
}

interface City {
  id: string;
  name: string;
}

const SORT_OPTIONS = [
  { value: "match", label: "Best match" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Driver rating" },
  { value: "departure_asc", label: "Earliest departure" },
];

function SearchPageInner() {
  const initialParams = useSearchParams();
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState(initialParams.get("originCityId") ?? "");
  const [to, setTo] = useState(initialParams.get("destinationCityId") ?? "");
  const [date, setDate] = useState(initialParams.get("date") ?? "");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hiddenByRatingCount, setHiddenByRatingCount] = useState(0);

  const [minSeats, setMinSeats] = useState(1);
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [sortBy, setSortBy] = useState("match");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
  }, []);

  async function runSearch(overrides?: { minRating?: string }) {
    setLoading(true);
    try {
      const effectiveMinRating = overrides?.minRating ?? minRating;
      const params = new URLSearchParams({
        originCityId: from,
        destinationCityId: to,
        date,
        minSeats: String(minSeats),
        sortBy,
      });
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (effectiveMinRating) params.set("minRating", effectiveMinRating);
      if (timeFrom) params.set("timeFrom", timeFrom);
      if (timeTo) params.set("timeTo", timeTo);

      const res = await fetch(`/api/rides/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setHiddenByRatingCount(data.hiddenByRatingCount ?? 0);

      const originLabel = cities.find((c) => c.id === from)?.name ?? "";
      const destinationLabel = cities.find((c) => c.id === to)?.name ?? "";
      if (originLabel && destinationLabel) {
        addRecentSearch({ originCityId: from, originLabel, destinationCityId: to, destinationLabel });
      }
    } finally {
      setLoading(false);
    }
  }

  // Arriving from Home with a route already picked — run the search
  // immediately instead of making the user press Search again.
  useEffect(() => {
    if (initialParams.get("originCityId") && initialParams.get("destinationCityId") && initialParams.get("date")) {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (results !== null) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  function clearRatingFilter() {
    setMinRating("");
    setShowMoreFilters(true);
    runSearch({ minRating: "" });
  }

  const fromName = cities.find((c) => c.id === from)?.name;
  const toName = cities.find((c) => c.id === to)?.name;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-display text-lg font-bold text-ink">
        {fromName && toName ? `${fromName} → ${toName}` : "Where are you going?"}
      </h1>

      <div className="mt-3 flex flex-col gap-2 rounded-card bg-white p-3 shadow-card">
        <div className="flex gap-2">
          <select className="w-1/2 rounded-control border border-neutral-200 px-2.5 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">From</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="w-1/2 rounded-control border border-neutral-200 px-2.5 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">To</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <input
          className="rounded-control border border-neutral-200 px-2.5 py-2 text-sm"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* Filters as horizontally scrollable chips (spec §4) — refining stays
            one thumb-reach away instead of opening a modal. */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setMinSeats(n)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                minSeats === n ? "bg-primary text-white" : "border border-neutral-200 text-ink-secondary"
              }`}
            >
              {n} seat{n > 1 ? "s" : ""}
            </button>
          ))}
          <button
            onClick={() => setShowMoreFilters((s) => !s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              showMoreFilters ? "bg-primary text-white" : "border border-neutral-200 text-ink-secondary"
            }`}
          >
            {maxPrice || minRating || timeFrom || timeTo ? "Filters •" : "More filters"}
          </button>
        </div>

        {showMoreFilters && (
          <div className="flex flex-col gap-2 rounded-control bg-neutral-50 p-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-ink-secondary">From time</label>
                <input type="time" className="mt-1 w-full rounded-control border border-neutral-200 px-2 py-1.5 text-sm" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-ink-secondary">To time</label>
                <input type="time" className="mt-1 w-full rounded-control border border-neutral-200 px-2 py-1.5 text-sm" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Max price (TND)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                className="mt-1 w-full rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Minimum driver rating</label>
              <select className="mt-1 w-full rounded-control border border-neutral-200 px-2 py-1.5 text-sm" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                <option value="">Any</option>
                <option value="3">3+ ⭐</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
              </select>
            </div>
          </div>
        )}

        <button className={buttonClasses("primary")} onClick={() => runSearch()} disabled={!from || !to || !date || loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {results !== null && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-secondary">
            {results.length} ride{results.length === 1 ? "" : "s"} found
          </span>
          <select
            className="bg-transparent font-semibold text-primary outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {results !== null && hiddenByRatingCount > 0 && (
        <p className="mt-1.5 text-xs text-ink-secondary">
          {hiddenByRatingCount} more ride{hiddenByRatingCount === 1 ? "" : "s"} hidden by your rating filter —{" "}
          <button onClick={clearRatingFilter} className="font-semibold text-primary underline">
            clear it
          </button>
        </p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading &&
          results?.map((r) => (
            <Link key={r.id} href={`/rides/${r.id}`} className="rounded-card bg-white p-3.5 shadow-card transition-colors hover:bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-200" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.driver.firstName}</p>
                  <TrustCluster verificationLevel={r.driver.verificationLevel} rating={r.driver.rating} completedRidesCount={r.driver.completedRidesCount} size="sm" />
                </div>
                <p className="shrink-0 text-base font-extrabold text-primary">{r.pricePerSeat} TND</p>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                {new Date(r.departureAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {r.vehicle.color} {r.vehicle.make} {r.vehicle.model} · {r.seatsAvailable} seat{r.seatsAvailable === 1 ? "" : "s"} left
              </p>
            </Link>
          ))}

        {!loading && results && results.length === 0 && hiddenByRatingCount > 0 && (
          <EmptyState
            message={`${hiddenByRatingCount} ride${hiddenByRatingCount === 1 ? "" : "s"} match, but ${hiddenByRatingCount === 1 ? "its driver doesn't" : "their drivers don't"} meet your rating filter yet.`}
            action={
              <button onClick={clearRatingFilter} className="underline">
                Clear rating filter →
              </button>
            }
          />
        )}
        {!loading && results && results.length === 0 && hiddenByRatingCount === 0 && (
          <EmptyState
            message="No rides match yet."
            action={
              <button onClick={() => setShowMoreFilters(false)} className="underline">
                Widen your time window →
              </button>
            }
          />
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-6 text-sm text-ink-secondary">Loading…</main>}>
      <SearchPageInner />
    </Suspense>
  );
}
