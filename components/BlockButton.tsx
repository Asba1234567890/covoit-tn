"use client";

import { useEffect, useState } from "react";

export default function BlockButton({ userId }: { userId: string }) {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}/block`)
      .then((r) => (r.ok ? r.json() : { blocked: null }))
      .then((d) => setBlocked(d.blocked));
  }, [userId]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/block`, { method: blocked ? "DELETE" : "POST" });
      const data = await res.json();
      if (res.ok) setBlocked(data.blocked);
    } finally {
      setBusy(false);
    }
  }

  if (blocked === null) return null; // not logged in, or still loading

  return (
    <button onClick={toggle} disabled={busy} className="text-xs text-neutral-500 underline disabled:opacity-50">
      {blocked ? "Unblock user" : "Block user"}
    </button>
  );
}
