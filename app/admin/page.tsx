"use client";

import { useEffect, useState } from "react";

interface Analytics {
  users: number;
  drivers: number;
  rides: number;
  completedRides: number;
  bookings: number;
  completedBookings: number;
  cancellationRate: number;
  openReports: number;
  pendingReviews: number;
  gmv: number;
  platformRevenue: number;
}

function Card({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className={`rounded-card p-4 shadow-card ${flag ? "bg-warning/10" : "bg-white"}`}>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${flag ? "text-warning-dark" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-ink-secondary">Loading…</p>;

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Analytics</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Total users" value={data.users.toString()} />
        <Card label="Drivers" value={data.drivers.toString()} />
        <Card label="Rides published" value={data.rides.toString()} />
        <Card label="Completed rides" value={data.completedRides.toString()} />
        <Card label="Bookings" value={data.bookings.toString()} />
        <Card label="Cancellation rate" value={`${(data.cancellationRate * 100).toFixed(1)}%`} flag={data.cancellationRate > 0.2} />
        <Card label="Open reports" value={data.openReports.toString()} flag={data.openReports > 0} />
        <Card label="Reviews to moderate" value={data.pendingReviews.toString()} flag={data.pendingReviews > 0} />
        <Card label="GMV" value={`${Number(data.gmv).toFixed(3)} TND`} />
        <Card label="Platform revenue" value={`${Number(data.platformRevenue).toFixed(3)} TND`} />
      </div>
    </div>
  );
}
