"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/currentUserCache";

export interface CurrentUser {
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
}

// Client-side auth guard for pages that require a logged-in user. Redirects
// to /signup when the session check comes back empty. Returns undefined
// while the check is in flight so callers can render a loading state.
export function useRequireAuth(): CurrentUser | undefined {
  const [user, setUser] = useState<CurrentUser | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser().then((d) => {
      if (!d.user) {
        window.location.href = "/signup";
        return;
      }
      setUser(d.user);
    });
  }, []);

  return user;
}
