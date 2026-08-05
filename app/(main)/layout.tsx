import Link from "next/link";
import Nav from "@/components/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {/* pb-16 reserves space for the fixed mobile bottom tab bar (sm:hidden in Nav) */}
      <div className="min-h-[calc(100vh-57px)] pb-16 sm:pb-0">{children}</div>
      <footer className="border-t border-neutral-200 px-4 py-4 text-center text-xs text-ink-secondary">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </footer>
    </>
  );
}
