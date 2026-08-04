import Link from "next/link";
import Nav from "@/components/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="min-h-[calc(100vh-57px)]">{children}</div>
      <footer className="border-t px-4 py-4 text-center text-xs text-neutral-400">
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
