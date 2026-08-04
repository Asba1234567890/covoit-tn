"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VerificationBadge from "@/components/VerificationBadge";

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

export default function SearchPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [minSeats, setMinSeats] = useState(1);
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [sortBy, setSortBy] = useState("match");

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
  }, []);

  async function runSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        originCityId: from,
        destinationCityId: to,
        date,
        minSeats: String(minSeats),
        sortBy,
      });
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (minRating) params.set("minRating", minRating);
      if (timeFrom) params.set("timeFrom", timeFrom);
      if (timeTo) params.set("timeTo", timeTo);

      const res = await fetch(`/api/rides/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Where are you going?</h1>

      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <select className="rounded-lg border px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">From</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="rounded-lg border px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">To</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border px-3 py-2"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button type="button" className="text-left text-sm text-neutral-500 underline" onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? "Hide filters" : "More filters"}
        </button>

        {showFilters && (
          <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-600">From time</label>
                <input type="time" className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-600">To time</label>
                <input type="time" className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-600">Seats needed</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                  value={minSeats}
                  onChange={(e) => setMinSeats(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-600">Max price (TND)</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-600">Minimum driver rating</label>
              <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                <option value="">Any</option>
                <option value="3">3+ ⭐</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-600">Sort by</label>
              <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button
          className="rounded-lg bg-black py-2 text-white disabled:opacity-50"
          onClick={runSearch}
          disabled={!from || !to || !date || loading}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {results?.map((r) => (
          <Link key={r.id} href={`/rides/${r.id}`} className="rounded-xl border p-4 hover:bg-neutral-50">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                {r.driver.firstName}
                <VerificationBadge verificationLevel={r.driver.verificationLevel} />
              </span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">{r.matchScore}% Match</span>
            </div>
            <p className="text-sm text-neutral-600">
              ⭐ {r.driver.rating > 0 ? r.driver.rating.toFixed(1) : "New"} · {r.driver.completedRidesCount} rides completed
            </p>
            <p className="text-sm text-neutral-600">
              {r.vehicle.color} {r.vehicle.make} {r.vehicle.model} · {r.seatsAvailable} seats left
            </p>
            <p className="text-sm">{r.pricePerSeat} TND / seat</p>
            <ul className="mt-1 text-xs text-neutral-500">
              {r.matchExplanation.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </Link>
        ))}
        {results && results.length === 0 && (
          <p className="text-sm text-neutral-500">No matching rides yet — try a different time or fewer filters.</p>
        )}
      </div>
    </main>
  );
}
