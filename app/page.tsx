import Link from "next/link";

// Home screen per spec §27: immediately ask "Where are you going?" with the
// two primary actions.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Covoit TN</h1>
        <p className="mt-1 text-neutral-600">Où allez-vous ?</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/search" className="rounded-xl bg-black py-4 text-center text-white">
          Find a ride
        </Link>
        <Link href="/offer-ride" className="rounded-xl border py-4 text-center">
          Offer a ride
        </Link>
      </div>

      <Link href="/signup" className="text-center text-sm text-neutral-500 underline">
        Sign up / log in
      </Link>
    </main>
  );
}
