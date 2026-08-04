"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface CurrentUser {
  id: string;
  firstName: string;
  isDriver: boolean;
}

export default function Nav() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
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
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 font-semibold">
          Covoit TN
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/search" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
            Find a ride
          </Link>
          <Link href="/offer-ride" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
            Offer a ride
          </Link>
          {user && (
            <>
              <Link href="/my-bookings" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                My bookings
              </Link>
              {user.isDriver && (
                <>
                  <Link href="/my-rides" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                    My rides
                  </Link>
                  <Link href="/vehicles" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                    Vehicles
                  </Link>
                </>
              )}
              <Link href="/messages" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                Messages
              </Link>
              <Link href="/notifications" className="relative whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                Notifications
                {unread > 0 && (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/verification" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                Verification
              </Link>
              <Link href="/profile" className="whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-neutral-100">
                {user.firstName}
              </Link>
              <button onClick={logout} className="whitespace-nowrap rounded-lg px-2 py-1.5 text-neutral-500 hover:bg-neutral-100">
                Log out
              </button>
            </>
          )}
          {user === null && (
            <Link href="/signup" className="whitespace-nowrap rounded-lg bg-black px-3 py-1.5 text-white">
              Sign up / log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
