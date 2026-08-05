"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";

interface AdminReviewRow {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  author: { firstName: string };
  subject: { firstName: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);

  function load() {
    fetch("/api/admin/reviews?status=PENDING").then((r) => r.json()).then((d) => setReviews(d.reviews ?? []));
  }

  useEffect(load, []);

  async function moderate(reviewId: string, decision: "APPROVED" | "REJECTED") {
    await fetch("/api/admin/reviews", { method: "POST", body: JSON.stringify({ reviewId, decision }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Reviews to moderate</h1>
      <div className="flex flex-col gap-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-card bg-white p-4 shadow-card">
            <p className="font-semibold text-ink">
              {r.author.firstName} → {r.subject.firstName} · <span className="text-accent-dark">{"★".repeat(r.stars)}</span>
            </p>
            {r.comment && <p className="mt-1 text-sm text-ink-secondary">{r.comment}</p>}
            <div className="mt-2 flex gap-1">
              <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => moderate(r.id, "APPROVED")}>
                Approve
              </button>
              <button className={buttonClasses("destructive", "px-2 py-1 text-xs")} onClick={() => moderate(r.id, "REJECTED")}>
                Reject
              </button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <EmptyState message="Nothing pending review." />}
      </div>
    </div>
  );
}
