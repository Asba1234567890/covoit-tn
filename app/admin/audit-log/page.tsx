"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  adminUser: { name: string } | null;
  user: { firstName: string; phone: string } | null;
}

const RESOURCES = ["", "user", "ride", "verification", "review", "report", "settings"];

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata !== "object") return null;
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [resource, setResource] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/admin/audit-log${resource ? `?resource=${resource}` : ""}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [resource]);

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Audit log</h1>
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {RESOURCES.map((r) => (
          <button
            key={r}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              resource === r ? "bg-primary text-white" : "border border-neutral-200 text-ink-secondary"
            }`}
            onClick={() => setResource(r)}
          >
            {r || "All"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <div key={e.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">{e.action}</p>
              <span className="shrink-0 text-xs text-ink-secondary">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-ink-secondary">
              {e.adminUser?.name ?? "Unknown admin"}
              {e.user && ` · target: ${e.user.firstName} (${e.user.phone})`}
            </p>
            {formatMetadata(e.metadata) && <p className="mt-1 text-xs text-ink-secondary">{formatMetadata(e.metadata)}</p>}
          </div>
        ))}
        {entries.length === 0 && !loading && <EmptyState message="No audit log entries in this category." />}
      </div>
    </div>
  );
}
