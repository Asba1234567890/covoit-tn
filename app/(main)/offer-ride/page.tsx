"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import RouteMap from "@/components/RouteMapLoader";
import { buttonClasses } from "@/lib/ui";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  isDefault?: boolean;
}

interface City {
  id: string;
  name: string;
}

interface LocationOption {
  label: string;
  lat: number;
  lng: number;
}

function AddVehicleForm({ onAdded }: { onAdded: (v: Vehicle) => void }) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({ make, model, color, licensePlate, seatsTotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register vehicle");
      onAdded(data.vehicle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder="Make (e.g. Renault)"
        value={make}
        onChange={(e) => setMake(e.target.value)}
      />
      <input
        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder="Model (e.g. Clio)"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />
      <input
        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder="Color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />
      <input
        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder="License plate"
        value={licensePlate}
        onChange={(e) => setLicensePlate(e.target.value)}
      />
      <input
        type="number"
        min={1}
        max={8}
        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder="Total seats"
        value={seatsTotal}
        onChange={(e) => setSeatsTotal(Number(e.target.value))}
      />
      {error && <p className="text-sm text-error-dark">{error}</p>}
      <button
        className={buttonClasses("primary")}
        disabled={!make || !model || !color || !licensePlate || !seatsTotal || submitting}
        onClick={submit}
      >
        {submitting ? "Registering…" : "Register vehicle"}
      </button>
    </div>
  );
}

function LocationPicker({
  placeholder,
  value,
  onSelect,
}: {
  placeholder: string;
  value: LocationOption | null;
  onSelect: (loc: LocationOption) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3 || (value && value.label === query)) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/locations?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setOptions(d.results ?? []))
        .finally(() => setLoading(false));
    }, 350); // debounce so we don't hammer Nominatim on every keystroke
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {value && value.label === query && (
        <span className="absolute right-3 top-2.5 text-xs text-success-dark">✓ location set</span>
      )}
      {open && (loading || options.length > 0) && (
        <div className="absolute z-10 mt-1 w-full rounded-control border border-neutral-200 bg-white shadow-card">
          {loading && <p className="px-3 py-2 text-xs text-ink-secondary">Searching…</p>}
          {!loading &&
            options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  onSelect(opt);
                  setQuery(opt.label);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export default function OfferRidePage() {
  const currentUser = useRequireAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");
  const [origin, setOrigin] = useState<LocationOption | null>(null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [seats, setSeats] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState(10);
  const [bookingMode, setBookingMode] = useState<"INSTANT" | "APPROVAL">("APPROVAL");

  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("07:30");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default, matches spec's commuter example

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => {
        const list: Vehicle[] = d.vehicles ?? [];
        setVehicles(list);
        const def = list.find((v) => v.isDefault) ?? list[0];
        if (def) setVehicleId(def.id);
      });
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
  }, [currentUser]);

  function toggleDay(v: number) {
    setDays((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      if (!origin || !destination) {
        setResult("Pick a departure and destination from the suggestions list.");
        setSubmitting(false);
        return;
      }
      const payload: Record<string, unknown> = {
        vehicleId,
        originCityId,
        destinationCityId,
        originLabel: origin.label,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        seats,
        pricePerSeat,
        bookingMode,
        isRecurring: mode === "recurring",
      };
      if (mode === "one-time") {
        payload.departureAt = new Date(`${date}T${time}:00`).toISOString();
      } else {
        payload.daysOfWeek = days;
        payload.departureTime = time;
      }

      const res = await fetch("/api/rides/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Could not publish ride");
      }
      setResult("Ride published.");
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Offer a ride</h1>

      <section className="mb-4 rounded-card bg-white p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold text-ink">Vehicle</p>
        {vehicles.length === 0 && !showAddVehicle && (
          <button className="text-sm font-semibold text-primary" onClick={() => setShowAddVehicle(true)}>
            + Register a vehicle first
          </button>
        )}
        {vehicles.length === 0 && showAddVehicle && (
          <AddVehicleForm
            onAdded={(v) => {
              setVehicles((prev) => [v, ...prev]);
              setVehicleId(v.id);
              setShowAddVehicle(false);
            }}
          />
        )}
        {vehicles.length > 0 && (
          <select
            className="w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} {v.make} {v.model}
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="mb-4 flex gap-2">
        <button
          className={`flex-1 rounded-control border py-2 text-sm font-semibold ${
            mode === "one-time" ? "border-primary bg-primary text-white" : "border-neutral-200 text-ink"
          }`}
          onClick={() => setMode("one-time")}
        >
          One-time ride
        </button>
        <button
          className={`flex-1 rounded-control border py-2 text-sm font-semibold ${
            mode === "recurring" ? "border-primary bg-primary text-white" : "border-neutral-200 text-ink"
          }`}
          onClick={() => setMode("recurring")}
        >
          Recurring ride
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
        <select
          className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          value={originCityId}
          onChange={(e) => setOriginCityId(e.target.value)}
        >
          <option value="">Departure city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <LocationPicker placeholder="Pickup point (e.g. Hammamet louage station)" value={origin} onSelect={setOrigin} />
        <select
          className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          value={destinationCityId}
          onChange={(e) => setDestinationCityId(e.target.value)}
        >
          <option value="">Destination city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <LocationPicker placeholder="Drop-off point" value={destination} onSelect={setDestination} />

        {origin && destination && (
          <RouteMap
            originLat={origin.lat}
            originLng={origin.lng}
            destinationLat={destination.lat}
            destinationLng={destination.lng}
          />
        )}

        {mode === "one-time" ? (
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="time"
              className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <p className="mb-1 text-sm text-ink-secondary">Repeats on</p>
            <div className="flex gap-1">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  className={`rounded-control border px-2 py-1 text-xs font-medium ${
                    days.includes(d.value) ? "border-primary bg-primary text-white" : "border-neutral-200 text-ink"
                  }`}
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <input
              type="time"
              className="mt-2 w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={8}
            className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Seats"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
          <input
            type="number"
            min={0}
            step="0.5"
            className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Price per seat (TND)"
            value={pricePerSeat}
            onChange={(e) => setPricePerSeat(Number(e.target.value))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={bookingMode === "INSTANT"}
            onChange={(e) => setBookingMode(e.target.checked ? "INSTANT" : "APPROVAL")}
          />
          Accept bookings instantly (skip manual approval)
        </label>

        <button
          className={buttonClasses("primary")}
          disabled={!vehicleId || !originCityId || !destinationCityId || !origin || !destination || submitting}
          onClick={submit}
        >
          {submitting ? "Publishing…" : "Publish ride"}
        </button>

        {result && <p className="text-sm text-ink-secondary">{result}</p>}
      </section>
    </main>
  );
}
