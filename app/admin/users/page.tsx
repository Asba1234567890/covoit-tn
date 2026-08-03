"use client";

import { useEffect, useState } from "react";

interface AdminUserRow {
  id: string;
  firstName: string;
  phone: string;
  verificationLevel: number;
  suspendedAt: string | null;
  bannedAt: string | null;
  createdAt: string;
  driverProfile: { rating: number; completedRidesCount: number } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(userId: string, action: string) {
    await fetch("/api/admin/users", { method: "POST", body: JSON.stringify({ userId, action }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Users</h1>
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Search name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {u.firstName} <span className="text-xs text-neutral-500">{u.phone}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  Verification level {u.verificationLevel}
                  {u.driverProfile && ` · driver, ${u.driverProfile.rating.toFixed(1)}★, ${u.driverProfile.completedRidesCount} rides`}
                  {u.suspendedAt && " · SUSPENDED"}
                  {u.bannedAt && " · BANNED"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {!u.suspendedAt && !u.bannedAt && (
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => act(u.id, "suspend")}>
                    Suspend
                  </button>
                )}
                {u.suspendedAt && (
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => act(u.id, "unsuspend")}>
                    Unsuspend
                  </button>
                )}
                {!u.bannedAt && (
                  <button className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => act(u.id, "ban")}>
                    Ban
                  </button>
                )}
                {u.bannedAt && (
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => act(u.id, "unban")}>
                    Unban
                  </button>
                )}
                {u.verificationLevel < 2 && (
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => act(u.id, "verify_identity")}>
                    Verify identity
                  </button>
                )}
                {u.driverProfile && u.verificationLevel < 3 && (
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => act(u.id, "verify_driver")}>
                    Verify driver
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading && <p className="text-sm text-neutral-500">No users found.</p>}
      </div>
    </div>
  );
}
