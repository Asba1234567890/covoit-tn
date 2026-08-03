"use client";

import { useEffect, useState } from "react";

interface AdminReportRow {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  reportingUser: { firstName: string; phone: string };
  reportedUser: { firstName: string; phone: string } | null;
}

const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [status, setStatus] = useState("OPEN");

  function load() {
    fetch(`/api/admin/reports?status=${status}`).then((r) => r.json()).then((d) => setReports(d.reports ?? []));
  }

  useEffect(load, [status]);

  async function updateStatus(reportId: string, newStatus: string) {
    await fetch("/api/admin/reports", { method: "POST", body: JSON.stringify({ reportId, status: newStatus }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Reports</h1>
      <div className="mb-4 flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`rounded-lg border px-3 py-1 text-xs ${status === s ? "bg-black text-white" : ""}`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.type}</p>
              <span className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-700">{r.description}</p>
            <p className="mt-1 text-xs text-neutral-500">
              reported by {r.reportingUser.firstName} ({r.reportingUser.phone})
              {r.reportedUser && ` · about ${r.reportedUser.firstName} (${r.reportedUser.phone})`}
            </p>
            <div className="mt-2 flex gap-1">
              {STATUSES.filter((s) => s !== status).map((s) => (
                <button key={s} className="rounded-lg border px-2 py-1 text-xs" onClick={() => updateStatus(r.id, s)}>
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-sm text-neutral-500">No reports in this status.</p>}
      </div>
    </div>
  );
}
