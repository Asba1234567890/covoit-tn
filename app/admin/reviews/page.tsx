"use client";

import { useEffect, useState } from "react";

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
      <h1 className="mb-4 text-lg font-semibold">Reviews to moderate</h1>
      <div className="flex flex-col gap-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">
              {r.author.firstName} → {r.subject.firstName} · {"⭐".repeat(r.stars)}
            </p>
            {r.comment && <p className="mt-1 text-sm text-neutral-700">{r.comment}</p>}
            <div className="mt-2 flex gap-1">
              <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => moderate(r.id, "APPROVED")}>
                Approve
              </button>
              <button className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => moderate(r.id, "REJECTED")}>
                Reject
              </button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-neutral-500">Nothing pending review.</p>}
      </div>
    </div>
  );
}
