"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/currentUserCache";

interface CurrentUser {
  id: string;
  firstName: string;
  isDriver: boolean;
}

const SIGNED_IN_TABS = [
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/my-bookings", label: "Trips", icon: TripsIcon },
  { href: "/messages", label: "Chat", icon: ChatIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

// Signed-out visitors previously always had direct nav access to search and
// offer-ride (both work without an account) — keep that reachable here
// instead of only inside the Home page body.
const SIGNED_OUT_TABS = [
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/offer-ride", label: "Offer", icon: OfferIcon },
  { href: "/signup", label: "Sign up", icon: ProfileIcon },
];

// Single component rendering both the slim top bar (brand + notifications,
// every screen size) and the mobile bottom tab bar (design spec §4 — Search
// / Trips / Chat / Profile). Uses fetchCurrentUser() (lib/currentUserCache)
// so this and useRequireAuth share one /api/auth/me request per page load
// instead of firing it twice.
export default function Nav() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetchCurrentUser()
      .then((d) => {
        setUser(d.user ?? null);
        setUnread(d.unreadNotifications ?? 0);
      })
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="shrink-0 font-display text-base font-extrabold text-primary">
            Covoit
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              <Link
                href="/notifications"
                className="relative rounded-full p-2 hover:bg-neutral-100"
                aria-label="Notifications"
              >
                <BellIcon />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <button
                onClick={logout}
                className="hidden whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-secondary hover:bg-neutral-100 sm:block"
              >
                Log out
              </button>
            </div>
          )}
          {user === null && (
            <Link href="/signup" className="whitespace-nowrap rounded-control bg-primary px-3 py-1.5 text-sm font-semibold text-white">
              Sign up / log in
            </Link>
          )}
        </div>
        {/* Everything else (offer a ride, my rides, vehicles, verification) lives on
            Home's quick actions and the Profile menu — see spec §4 and §9. */}
      </header>

      {user !== undefined && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white sm:hidden">
          <div className="mx-auto flex max-w-3xl justify-around">
            {(user ? SIGNED_IN_TABS : SIGNED_OUT_TABS).map((tab) => {
              const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    active ? "text-primary" : "text-ink-secondary"
                  }`}
                >
                  <tab.icon active={!!active} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-ink-secondary">
      <path d="M10 2a6 6 0 00-6 6c0 3.4-1.4 4.6-1.4 4.6a1 1 0 00.7 1.7h13.4a1 1 0 00.7-1.7S16 11.4 16 8a6 6 0 00-6-6zM8.3 16a1.7 1.7 0 003.4 0h-3.4z" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-5 w-5">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

function TripsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-5 w-5">
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M7 5V3.5M13 5V3.5M3 9h14" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-5 w-5">
      <path d="M3 4h14v9H8l-4 3v-3H3V4z" strokeLinejoin="round" />
    </svg>
  );
}

function OfferIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-5 w-5">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v6M7 10h6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-5 w-5">
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" strokeLinecap="round" />
    </svg>
  );
}
