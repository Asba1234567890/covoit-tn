"use client";

import { useState } from "react";

const TYPES = [
  { value: "SAFETY", label: "Safety concern" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "FRAUD", label: "Fraud" },
  { value: "VEHICLE_CONDITION", label: "Vehicle condition" },
  { value: "OTHER", label: "Other" },
];

export default function ReportForm({ reportedUserId, rideId }: { reportedUserId?: string; rideId?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ reportedUserId, rideId, type, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit report");
      setResult("Report submitted. Our team will review it.");
      setDescription("");
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button className="text-xs text-neutral-500 underline" onClick={() => setOpen(true)}>
        Report an issue
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <select className="w-full rounded-lg border px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <textarea
        className="mt-2 w-full rounded-lg border px-2 py-1.5 text-sm"
        rows={3}
        placeholder="Describe what happened"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {result && <p className="mt-1 text-xs text-neutral-700">{result}</p>}
      <div className="mt-2 flex gap-2">
        <button
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          disabled={submitting || !description.trim()}
          onClick={submit}
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
        <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
