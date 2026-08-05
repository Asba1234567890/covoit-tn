export interface CurrentUserResponse {
  user: {
    id: string;
    firstName: string;
    phone: string;
    bio: string | null;
    profilePhotoUrl: string | null;
    languages: string[];
    verificationLevel: number;
    memberSince: string;
    isDriver: boolean;
    driverRating: number | null;
    driverCompletedRides: number | null;
  } | null;
  unreadNotifications: number;
}

let cachedPromise: Promise<CurrentUserResponse> | null = null;

// Nav and useRequireAuth both need the current session on every
// authenticated page, which previously meant two identical /api/auth/me
// requests firing on every page load. Sharing one in-flight/cached request
// removes the duplicate. Safe without manual invalidation: every login/
// logout in this app does a hard window.location.href navigation (see
// app/(auth)/signup/page.tsx, components/Nav.tsx), which reloads the JS
// module and clears this cache along with it.
export function fetchCurrentUser(): Promise<CurrentUserResponse> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/auth/me")
      .then((r) => r.json())
      .catch(() => ({ user: null, unreadNotifications: 0 }));
  }
  return cachedPromise;
}
