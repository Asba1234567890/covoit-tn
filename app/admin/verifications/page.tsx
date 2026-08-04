"use client";

import { useEffect, useState } from "react";

interface AdminVerificationRow {
  id: string;
  type: string;
  status: string;
  submittedAt: string;
  rejectionReason: string | null;
  user: { firstName: string; phone: string; verificationLevel: number };
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<AdminVerificationRow[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch(`/api/admin/verifications?status=${status}`)
      .then((r) => r.json())
      .then((d) => setRows(d.verifications ?? []));
  }

  useEffect(load, [status]);

  async function viewDocument(id: string) {
    const res = await fetch(`/api/admin/verifications/${id}/document-url`);
    const data = await res.json();
    if (res.ok) {
      setDocUrls((prev) => ({ ...prev, [id]: data.url }));
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
  }

  async function approve(id: string) {
    setBusy(id);
    try {
      await fetch("/api/admin/verifications", {
        method: "POST",
        body: JSON.stringify({ verificationId: id, decision: "APPROVED" }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    const rejectionReason = prompt("Reason for rejecting this document?");
    if (!rejectionReason) return;
    setBusy(id);
    try {
      await fetch("/api/admin/verifications", {
        method: "POST",
        body: JSON.stringify({ verificationId: id, decision: "REJECTED", rejectionReason }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Verification documents</h1>
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
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {r.type} <span className="text-xs text-neutral-500">— {r.user.firstName} ({r.user.phone})</span>
              </p>
              <span className="text-xs text-neutral-500">{new Date(r.submittedAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Current level: {r.user.verificationLevel}</p>
            {r.status === "REJECTED" && r.rejectionReason && (
              <p className="mt-1 text-xs text-red-700">Rejected: {r.rejectionReason}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => viewDocument(r.id)}>
                View document
              </button>
              {r.status === "PENDING" && (
                <>
                  <button
                    className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                    disabled={busy === r.id}
                    onClick={() => approve(r.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                    disabled={busy === r.id}
                    onClick={() => reject(r.id)}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
            {docUrls[r.id] && <p className="mt-1 text-[10px] text-neutral-400">Link expires in 5 minutes.</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-500">No documents in this status.</p>}
      </div>
    </div>
  );
}
