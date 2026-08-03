import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminFromCookies } from "@/server/admin/adminAuth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromCookies();
  if (!admin) redirect("/signup");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="font-semibold">Covoit TN Admin</span>
            <span className="ml-2 text-xs text-neutral-500">{admin.name} · {admin.role}</span>
          </div>
        </div>
        <nav className="mx-auto mt-2 flex max-w-5xl gap-1 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 hover:bg-neutral-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
