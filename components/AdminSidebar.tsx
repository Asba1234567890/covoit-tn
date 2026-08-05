"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "Rides & bookings" and "Settings & audit log" in the design mockup (spec
// §10) map to two existing routes each here (rides/bookings are separate
// pages; there's no dedicated audit-log viewer) — kept as distinct nav
// entries rather than merging pages, so no routes change.
const NAV = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/verifications", label: "Driver verification" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar({ adminName, adminRole }: { adminName: string; adminRole: string }) {
  const pathname = usePathname();

  return (
    <aside className="bg-ink text-white md:flex md:w-56 md:shrink-0 md:flex-col">
      <div className="px-4 py-4 md:py-6">
        <p className="font-display text-base font-extrabold">Covoit Admin</p>
        <p className="mt-1 text-xs text-white/50">
          {adminName} · {adminRole}
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 text-sm md:flex-1 md:flex-col md:gap-0.5 md:overflow-visible md:pb-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-control px-3 py-2 font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
