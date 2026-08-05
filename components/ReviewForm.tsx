"use client";

import { useState } from "react";
import { buttonClasses } from "@/lib/ui";

interface ReviewFormProps {
  bookingId: string;
  subjectLabel: "driver" | "passenger";
  categories: ReadonlyArray<{ key: string; label: string }>;
  onDone: () => void;
}

export default function ReviewForm({ bookingId, subjectLabel, categories, onDone }: ReviewFormProps) {
  const [stars, setStars] = useState(5);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          stars,
          comment: comment || undefined,
          categories: Object.keys(categoryRatings).length > 0 ? categoryRatings : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit review");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-control bg-neutral-50 p-3">
      <p className="mb-1 text-xs font-medium text-ink">Rate your {subjectLabel}</p>
      <div className="flex gap-1 text-lg">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setStars(s)} className={s <= stars ? "text-accent" : "text-neutral-300"}>
            ★
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {categories.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-secondary">{c.label}</span>
            <div className="flex gap-0.5 text-sm">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCategoryRatings((prev) => ({ ...prev, [c.key]: s }))}
                  className={s <= (categoryRatings[c.key] ?? 0) ? "text-accent" : "text-neutral-300"}
                  aria-label={`${c.label}: ${s}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <textarea
        className="mt-2 w-full rounded-control border border-neutral-200 px-2 py-1 text-sm"
        rows={2}
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-xs text-error-dark">{error}</p>}
      <button className={buttonClasses("primary", "mt-2 px-3 py-1.5 text-xs")} disabled={submitting} onClick={submit}>
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
