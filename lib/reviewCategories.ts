// Shared between the client-side ReviewForm (labels) and the server-side
// reviewService (validation) so the two never drift apart.
export const DRIVER_REVIEW_CATEGORIES = [
  { key: "drivingQuality", label: "Driving quality" },
  { key: "punctuality", label: "Punctuality" },
  { key: "communication", label: "Communication" },
  { key: "safety", label: "Safety" },
] as const;

export const PASSENGER_REVIEW_CATEGORIES = [
  { key: "respect", label: "Respect" },
  { key: "punctuality", label: "Punctuality" },
  { key: "communication", label: "Communication" },
  { key: "reliability", label: "Reliability" },
] as const;
