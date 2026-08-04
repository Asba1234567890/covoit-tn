export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  return meters >= 1000 ? `${(meters / 1000).toFixed(0)} km` : `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}
