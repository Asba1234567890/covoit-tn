"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(userId: string, action: string) {
    await fetch("/api/admin/users", { method: "POST", body: JSON.stringify({ userId, action }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Users</h1>
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
          placeholder="Search name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className={buttonClasses("secondary", "px-3 py-2 text-sm")} onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {u.firstName} <span className="text-xs font-normal text-ink-secondary">{u.phone}</span>
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                  <span>Verification level {u.verificationLevel}</span>
                  {u.driverProfile && (
                    <span>
                      · driver, {u.driverProfile.rating.toFixed(1)}★, {u.driverProfile.completedRidesCount} rides
                    </span>
                  )}
                  {u.suspendedAt && <StatusBadge label="Suspended" tone="pending" />}
                  {u.bannedAt && <StatusBadge label="Banned" tone="error" />}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {!u.suspendedAt && !u.bannedAt && (
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => act(u.id, "suspend")}>
                    Suspend
                  </button>
                )}
                {u.suspendedAt && (
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => act(u.id, "unsuspend")}>
                    Unsuspend
                  </button>
                )}
                {!u.bannedAt && (
                  <button className={buttonClasses("destructive", "px-2 py-1 text-xs")} onClick={() => act(u.id, "ban")}>
                    Ban
                  </button>
                )}
                {u.bannedAt && (
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => act(u.id, "unban")}>
                    Unban
                  </button>
                )}
                {u.verificationLevel < 2 && (
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => act(u.id, "verify_identity")}>
                    Verify identity
                  </button>
                )}
                {u.driverProfile && u.verificationLevel < 3 && (
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => act(u.id, "verify_driver")}>
                    Verify driver
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading && <EmptyState message="No users found." />}
      </div>
    </div>
  );
}
