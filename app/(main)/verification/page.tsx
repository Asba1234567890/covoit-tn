"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";

type DocumentType = "ID_CARD" | "PASSPORT" | "DRIVING_LICENSE" | "VEHICLE_REGISTRATION";

interface VerificationRecord {
  id: string;
  type: DocumentType;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  rejectionReason: string | null;
}

const SLOTS: { type: DocumentType; label: string; hint: string; driverOnly?: boolean }[] = [
  { type: "ID_CARD", label: "ID card", hint: "National ID card — or upload a passport instead below" },
  { type: "PASSPORT", label: "Passport", hint: "Only needed if you're not submitting an ID card" },
  { type: "DRIVING_LICENSE", label: "Driving license", hint: "Required to offer rides as a driver", driverOnly: true },
  { type: "VEHICLE_REGISTRATION", label: "Vehicle registration", hint: "Required to offer rides as a driver", driverOnly: true },
];

function StatusBadge({ status }: { status: VerificationRecord["status"] }) {
  const styles: Record<VerificationRecord["status"], string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>;
}

export default function VerificationPage() {
  const currentUser = useRequireAuth();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/verifications")
      .then((r) => r.json())
      .then((d) => setRecords(d.verifications ?? []));
  }

  useEffect(() => {
    if (currentUser) load();
  }, [currentUser]);

  async function upload(type: DocumentType, file: File) {
    setUploading(type);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("type", type);
      const res = await fetch("/api/verifications", { method: "POST", body });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. a platform error page) — fall through to the status-based message below.
      }
      if (!res.ok) throw new Error(data.error ?? `Could not upload document (${res.status})`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  const byType = new Map(records.map((r) => [r.type, r]));

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">Verification</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Verification level {currentUser.verificationLevel}. Submit documents below to raise it — an admin reviews every
        submission before it takes effect.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3">
        {SLOTS.filter((s) => !s.driverOnly || currentUser.isDriver).map((slot) => {
          const record = byType.get(slot.type);
          return (
            <div key={slot.type} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{slot.label}</p>
                {record && <StatusBadge status={record.status} />}
              </div>
              <p className="mt-1 text-xs text-neutral-500">{slot.hint}</p>
              {record?.status === "REJECTED" && record.rejectionReason && (
                <p className="mt-1 text-xs text-red-700">Reason: {record.rejectionReason}</p>
              )}
              {record?.status === "PENDING" && (
                <p className="mt-1 text-xs text-neutral-500">
                  Submitted {new Date(record.submittedAt).toLocaleDateString()} — awaiting review.
                </p>
              )}
              {record?.status !== "APPROVED" && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploading === slot.type}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) upload(slot.type, file);
                    }}
                    className="text-sm"
                  />
                  {uploading === slot.type && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
                  {record?.status === "REJECTED" && (
                    <p className="mt-1 text-xs text-neutral-500">Uploading a new file resubmits this document.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
