// Seed-level configuration for the initial market. This file is DATA, not
// logic — business rules elsewhere must read from the Country/PlatformSetting
// tables (see prisma schema), not import constants from here directly in
// production code. This is only used by the seed script.

export const initialCountries = [
  {
    code: "TN",
    name: "Tunisia",
    currency: { code: "TND", symbol: "DT", decimals: 3 },
    defaultLocale: "fr-TN",
    supportedLangs: ["ar-TN", "fr-TN", "en"],
    emergencyNumbers: { police: "197", ambulance: "190", civilProtection: "198" },
    cities: [
      { name: "Tunis", nameAr: "تونس", lat: 36.8065, lng: 10.1815 },
      { name: "Ariana", nameAr: "أريانة", lat: 36.8625, lng: 10.1956 },
      { name: "Ben Arous", nameAr: "بن عروس", lat: 36.7469, lng: 10.2317 },
      { name: "La Marsa", nameAr: "المرسى", lat: 36.8781, lng: 10.3247 },
      { name: "Hammamet", nameAr: "الحمامات", lat: 36.4000, lng: 10.6167 },
      { name: "Nabeul", nameAr: "نابل", lat: 36.4561, lng: 10.7376 },
      { name: "Sousse", nameAr: "سوسة", lat: 35.8256, lng: 10.6412 },
      { name: "Monastir", nameAr: "المنستير", lat: 35.7643, lng: 10.8113 },
      { name: "Mahdia", nameAr: "المهدية", lat: 35.5047, lng: 11.0622 },
      { name: "Sfax", nameAr: "صفاقس", lat: 34.7406, lng: 10.7603 },
      { name: "Bizerte", nameAr: "بنزرت", lat: 37.2744, lng: 9.8739 },
      { name: "Kairouan", nameAr: "القيروان", lat: 35.6781, lng: 10.0963 },
    ],
  },
];

export const defaultPlatformSettings = [
  { key: "commission_percent", value: 10 },
  { key: "cancellation_free_window_minutes", value: 120 },
  { key: "max_pickup_walk_meters", value: 800 },
  { key: "sos_enabled", value: true },
];
