"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { buttonClasses } from "@/lib/ui";
import EmptyState from "@/components/EmptyState";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string;
  licensePlate: string;
  seatsTotal: number;
  verificationStatus: string;
  isDefault: boolean;
  photoUrls: string[];
}

const emptyForm = { make: "", model: "", year: "", color: "", licensePlate: "", seatsTotal: 4 };

export default function VehiclesPage() {
  const currentUser = useRequireAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function load() {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => setVehicles(d.vehicles ?? []));
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser]);

  function startEdit(v: Vehicle) {
    setEditingId(v.id);
    setShowAdd(false);
    setForm({
      make: v.make,
      model: v.model,
      year: v.year ? String(v.year) : "",
      color: v.color,
      licensePlate: v.licensePlate,
      seatsTotal: v.seatsTotal,
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowAdd(false);
    setError(null);
  }

  async function submitAdd() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicles", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add vehicle");
      resetForm();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editingId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update vehicle");
      resetForm();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete vehicle");
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify({ setDefault: true }) });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(vehicle: Vehicle, file: File) {
    setUploadingId(vehicle.id);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", "vehicle");
      body.set("vehicleId", vehicle.id);
      const res = await fetch("/api/upload", { method: "POST", body });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. a platform error page) — fall through to the status-based message below.
      }
      if (!res.ok) throw new Error(data.error ?? `Could not upload photo (${res.status})`);
      await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ photoUrls: [...vehicle.photoUrls, data.url] }),
      });
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploadingId(null);
    }
  }

  async function removePhoto(vehicle: Vehicle, url: string) {
    setUploadingId(vehicle.id);
    try {
      await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ photoUrls: vehicle.photoUrls.filter((u) => u !== url) }),
      });
      load();
    } finally {
      setUploadingId(null);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  const formValid = form.make && form.model && form.color && form.licensePlate && form.seatsTotal;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-ink">Your vehicles</h1>
        {!showAdd && !editingId && (
          <button className="text-sm font-semibold text-primary" onClick={() => setShowAdd(true)}>
            + Add vehicle
          </button>
        )}
      </div>

      {(showAdd || editingId) && (
        <section className="mb-4 flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="Make (e.g. Renault)" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="Model (e.g. Clio)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="License plate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
          <input className="rounded-control border border-neutral-200 px-3 py-2 text-sm" placeholder="Total seats" type="number" min={1} max={8} value={form.seatsTotal} onChange={(e) => setForm({ ...form, seatsTotal: Number(e.target.value) })} />
          {error && <p className="text-sm text-error-dark">{error}</p>}
          <div className="flex gap-2">
            <button
              className={buttonClasses("primary", "flex-1")}
              disabled={!formValid || busy}
              onClick={editingId ? submitEdit : submitAdd}
            >
              {editingId ? "Save changes" : "Register vehicle"}
            </button>
            <button className={buttonClasses("secondary")} onClick={resetForm}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {v.color} {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                </p>
                <p className="text-sm text-ink-secondary">{v.licensePlate} · {v.seatsTotal} seats</p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {v.isDefault && <span className="mr-2 rounded-full bg-success/15 px-2 py-0.5 text-success-dark">Default</span>}
                  Verification: {v.verificationStatus}
                </p>
              </div>
            </div>

            {v.photoUrls.length > 0 && (
              <div className="mt-3 flex gap-2">
                {v.photoUrls.map((url) => (
                  <div key={url} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-control object-cover" />
                    <button
                      className="absolute -right-1 -top-1 rounded-full bg-ink px-1.5 text-xs text-white"
                      onClick={() => removePhoto(v, url)}
                      disabled={uploadingId === v.id}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {!v.isDefault && (
                <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => makeDefault(v.id)} disabled={busy}>
                  Set as default
                </button>
              )}
              <button className={buttonClasses("secondary", "px-2 py-1 text-xs")} onClick={() => startEdit(v)} disabled={busy}>
                Edit
              </button>
              <button className={buttonClasses("destructive", "px-2 py-1 text-xs")} onClick={() => remove(v.id)} disabled={busy}>
                Delete
              </button>
              <label className={buttonClasses("secondary", "cursor-pointer px-2 py-1 text-xs")}>
                {uploadingId === v.id ? "Uploading…" : "+ Add photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingId === v.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(v, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && !showAdd && <EmptyState message="No vehicles registered yet." />}
      </div>
    </main>
  );
}
