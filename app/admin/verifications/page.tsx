"use client";

import { useEffect, useState } from "react";
import StatusBadge, { type StatusTone } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { buttonClasses } from "@/lib/ui";

interface AdminVerificationRow {
  id: string;
  type: string;
  status: string;
  submittedAt: string;
  rejectionReason: string | null;
  user: { firstName: string; phone: string; verificationLevel: number };
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "error",
};

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<AdminVerificationRow[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/admin/verifications?status=${status}`)
      .then((r) => r.json())
      .then((d) => setRows(d.verifications ?? []))
      .finally(() => setLoading(false));
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

  async function reject(id: string, rejectionReason: string) {
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
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Driver verification queue</h1>
      <div className="mb-4 flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status === s ? "bg-primary text-white" : "border border-neutral-200 text-ink-secondary"
            }`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">
                {r.type} <span className="text-xs font-normal text-ink-secondary">— {r.user.firstName} ({r.user.phone})</span>
              </p>
              <span className="shrink-0 text-xs text-ink-secondary">{new Date(r.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-ink-secondary">Current level: {r.user.verificationLevel}</span>
              <StatusBadge label={r.status} tone={STATUS_TONE[r.status] ?? "neutral"} />
            </div>
            {r.status === "REJECTED" && r.rejectionReason && (
              <p className="mt-1 text-xs text-error-dark">Rejected: {r.rejectionReason}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => viewDocument(r.id)}>
                View document
              </button>
              {r.status === "PENDING" && (
                <>
                  <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} disabled={busy === r.id} onClick={() => approve(r.id)}>
                    Approve
                  </button>
                  <button className={buttonClasses("destructive", "px-2 py-1 text-xs")} disabled={busy === r.id} onClick={() => setConfirmRejectId(r.id)}>
                    Reject
                  </button>
                </>
              )}
            </div>
            {docUrls[r.id] && <p className="mt-1 text-[10px] text-ink-secondary/70">Link expires in 5 minutes.</p>}
          </div>
        ))}
        {rows.length === 0 && !loading && <EmptyState message="No documents in this status." />}
      </div>

      <ConfirmDialog
        open={!!confirmRejectId}
        title="Reject this document?"
        requireReason
        reasonPlaceholder="Reason for rejecting this document?"
        confirmLabel="Reject"
        destructive
        onConfirm={(reason) => {
          const id = confirmRejectId!;
          setConfirmRejectId(null);
          reject(id, reason!);
        }}
        onCancel={() => setConfirmRejectId(null)}
      />
    </div>
  );
}
