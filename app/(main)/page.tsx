"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRecentSearches, addRecentSearch, type RecentSearch } from "@/lib/recentSearches";
import { buttonClasses } from "@/lib/ui";

interface City {
  id: string;
  name: string;
}

// Search-first home per design spec §1/§4: a single route-search module
// above the fold, trust + "offer a ride" as equal-weight quick actions
// beneath it, recent searches as secondary scroll content. Submitting hands
// off to the existing /search page (same API, same required fields) rather
// than duplicating search logic here.
export default function HomePage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");
  const [date, setDate] = useState("");
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
    setRecent(getRecentSearches());
  }, []);

  function goToSearch(originId: string, destinationId: string, originLabel: string, destinationLabel: string, searchDate: string) {
    addRecentSearch({ originCityId: originId, originLabel, destinationCityId: destinationId, destinationLabel });
    const params = new URLSearchParams({ originCityId: originId, destinationCityId: destinationId, date: searchDate });
    router.push(`/search?${params.toString()}`);
  }

  function submit() {
    if (!originCityId || !destinationCityId || !date) return;
    const originLabel = cities.find((c) => c.id === originCityId)?.name ?? "";
    const destinationLabel = cities.find((c) => c.id === destinationCityId)?.name ?? "";
    goToSearch(originCityId, destinationCityId, originLabel, destinationLabel, date);
  }

  function openRecent(r: RecentSearch) {
    // A remembered route with today's date is a better default than
    // re-showing an empty date field the user has to fill in again.
    goToSearch(r.originCityId, r.destinationCityId, r.originLabel, r.destinationLabel, new Date().toISOString().slice(0, 10));
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-display text-lg font-extrabold text-primary">Covoit</h1>
      <p className="mt-1 text-sm text-ink-secondary">Où allez-vous ?</p>

      <div className="mt-4 rounded-card bg-white p-4 shadow-card">
        <div className="flex items-center gap-2 border-b border-neutral-100 py-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <select
            className="w-full bg-transparent text-sm text-ink outline-none"
            value={originCityId}
            onChange={(e) => setOriginCityId(e.target.value)}
          >
            <option value="">Leaving from</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 py-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" aria-hidden />
          <select
            className="w-full bg-transparent text-sm text-ink outline-none"
            value={destinationCityId}
            onChange={(e) => setDestinationCityId(e.target.value)}
          >
            <option value="">Going to</option>
            {cities
              .filter((c) => c.id !== originCityId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
        <input
          type="date"
          className="mt-2 w-full rounded-control border border-neutral-200 px-3 py-2 text-sm text-ink"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          className={buttonClasses("primary", "mt-3 w-full")}
          disabled={!originCityId || !destinationCityId || !date}
          onClick={submit}
        >
          Search rides
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-control bg-accent/10 py-2.5 text-center text-xs font-semibold text-accent-dark">
          ✓ Verified drivers
        </div>
        <Link
          href="/offer-ride"
          className="flex-1 rounded-control bg-neutral-100 py-2.5 text-center text-xs font-semibold text-primary"
        >
          Offer a ride
        </Link>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-ink">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((r, i) => (
              <button
                key={i}
                onClick={() => openRecent(r)}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-ink-secondary hover:bg-neutral-50"
              >
                {r.originLabel} → {r.destinationLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <Link href="/signup" className="mt-8 block text-center text-sm text-ink-secondary underline">
        Sign up / log in
      </Link>
    </main>
  );
}
