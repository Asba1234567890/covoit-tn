// Client-only, localStorage-backed recent-search memory for the Home screen
// (design spec §4). Deliberately not backed by any API/DB table — it's
// per-device UI convenience, not a feature with server state.
export interface RecentSearch {
  originCityId: string;
  originLabel: string;
  destinationCityId: string;
  destinationLabel: string;
}

const KEY = "covoit:recent-searches";
const MAX = 5;

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(entry: RecentSearch): void {
  if (typeof window === "undefined") return;
  const existing = getRecentSearches().filter(
    (s) => !(s.originCityId === entry.originCityId && s.destinationCityId === entry.destinationCityId)
  );
  const next = [entry, ...existing].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}
