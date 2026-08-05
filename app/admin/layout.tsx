import { redirect } from "next/navigation";
import { getAdminFromCookies } from "@/server/admin/adminAuth";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromCookies();
  if (!admin) redirect("/signup");

  return (
    <div className="min-h-screen bg-background md:flex">
      <AdminSidebar adminName={admin.name} adminRole={admin.role} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
