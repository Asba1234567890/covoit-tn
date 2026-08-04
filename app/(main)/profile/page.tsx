"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface Profile {
  id: string;
  firstName: string;
  phone: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  languages: string[];
  memberSince: string;
  verificationLevel: number;
  isDriver: boolean;
  driverRating: number | null;
  driverCompletedRides: number | null;
  passengerCompletedRides: number;
}

const LANGUAGE_OPTIONS = ["ar-TN", "fr-TN", "en"];

export default function ProfilePage() {
  const currentUser = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setFirstName(d.profile.firstName);
        setBio(d.profile.bio ?? "");
        setProfilePhotoUrl(d.profile.profilePhotoUrl ?? "");
        setLanguages(d.profile.languages ?? []);
      });
  }, [currentUser]);

  function toggleLanguage(l: string) {
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", "profile");
      const res = await fetch("/api/upload", { method: "POST", body });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. a platform error page) — fall through to the status-based message below.
      }
      if (!res.ok) throw new Error(data.error ?? `Could not upload photo (${res.status})`);
      setProfilePhotoUrl(data.url);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName, bio, profilePhotoUrl, languages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save profile");
      setMessage("Profile updated.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser || !profile) {
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Your profile</h1>

      <section className="mb-4 flex items-center gap-3 rounded-xl border p-4">
        {profile.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profilePhotoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold">
            {profile.firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{profile.firstName}</p>
          <p className="text-xs text-neutral-500">{profile.phone}</p>
          <p className="text-xs text-neutral-500">Member since {new Date(profile.memberSince).toLocaleDateString()}</p>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-neutral-500">As driver</p>
          {profile.isDriver ? (
            <p className="text-sm font-medium">
              ⭐ {profile.driverRating?.toFixed(1) ?? "New"} · {profile.driverCompletedRides ?? 0} rides
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Not a driver yet</p>
          )}
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-neutral-500">As passenger</p>
          <p className="text-sm font-medium">{profile.passengerCompletedRides} rides completed</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <div>
          <label className="text-sm text-neutral-600">First name</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-neutral-600">Bio</label>
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-neutral-600">Profile photo</label>
          <div className="mt-1 flex items-center gap-3">
            {profilePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }}
              className="text-sm"
            />
          </div>
          {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
        </div>
        <div>
          <label className="text-sm text-neutral-600">Languages</label>
          <div className="mt-1 flex gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                className={`rounded-lg border px-3 py-1 text-sm ${languages.includes(l) ? "bg-black text-white" : ""}`}
                onClick={() => toggleLanguage(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          className="rounded-lg bg-black py-2 text-white disabled:opacity-50"
          disabled={saving || !firstName.trim()}
          onClick={save}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </section>
    </main>
  );
}
