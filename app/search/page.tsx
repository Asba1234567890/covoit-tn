"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SearchResult {
  id: string;
  driver: { firstName: string; rating: number };
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

export default function SearchPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

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
      });
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
        <select
          className="rounded-lg border px-3 py-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        >
          <option value="">From</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        >
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
          <Link
            key={r.id}
            href={`/rides/${r.id}`}
            className="rounded-xl border p-4 hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.driver.firstName}</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                {r.matchScore}% Match
              </span>
            </div>
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
          <p className="text-sm text-neutral-500">No matching rides yet — try a different time.</p>
        )}
      </div>
    </main>
  );
}
