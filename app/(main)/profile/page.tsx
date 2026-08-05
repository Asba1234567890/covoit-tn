"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { buttonClasses } from "@/lib/ui";

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!currentUser || !profile) {
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <section className="rounded-card bg-white p-5 text-center shadow-card">
        {profile.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profilePhotoUrl} alt="" width={56} height={56} loading="lazy" className="mx-auto h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-ink-secondary">
            {profile.firstName[0]?.toUpperCase()}
          </div>
        )}
        <p className="mt-2 font-display font-bold text-ink">{profile.firstName}</p>
        <p className="text-xs text-ink-secondary">{profile.phone}</p>
        <p className="text-xs text-ink-secondary">Member since {new Date(profile.memberSince).toLocaleDateString()}</p>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-card bg-white p-3 shadow-card">
          <p className="text-xs text-ink-secondary">As driver</p>
          {profile.isDriver ? (
            <p className="text-sm font-semibold text-ink">
              ★ {profile.driverRating?.toFixed(1) ?? "New"} · {profile.driverCompletedRides ?? 0} rides
            </p>
          ) : (
            <p className="text-sm text-ink-secondary">Not a driver yet</p>
          )}
        </div>
        <div className="rounded-card bg-white p-3 shadow-card">
          <p className="text-xs text-ink-secondary">As passenger</p>
          <p className="text-sm font-semibold text-ink">{profile.passengerCompletedRides} rides completed</p>
        </div>
      </section>

      {/* Secondary navigation — moved here from the top nav so that bar can
          stay slim (design spec §9 "User profile" menu pattern). */}
      <section className="mt-3 divide-y divide-neutral-100 rounded-card bg-white shadow-card">
        {profile.isDriver && (
          <Link href="/my-rides" className="block px-4 py-3 text-sm text-ink hover:bg-neutral-50">
            My rides
          </Link>
        )}
        {profile.isDriver && (
          <Link href="/vehicles" className="block px-4 py-3 text-sm text-ink hover:bg-neutral-50">
            Vehicles
          </Link>
        )}
        <Link href="/verification" className="block px-4 py-3 text-sm text-ink hover:bg-neutral-50">
          Verification &amp; documents
        </Link>
        <button onClick={logout} className="block w-full px-4 py-3 text-left text-sm text-ink-secondary hover:bg-neutral-50">
          Log out
        </button>
      </section>

      <section className="mt-3 flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-ink">Edit profile</p>
        <div>
          <label className="text-sm text-ink-secondary">First name</label>
          <input
            className="mt-1 w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-ink-secondary">Bio</label>
          <textarea
            className="mt-1 w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-ink-secondary">Profile photo</label>
          <div className="mt-1 flex items-center gap-3">
            {profilePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
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
          {uploading && <p className="mt-1 text-xs text-ink-secondary">Uploading…</p>}
        </div>
        <div>
          <label className="text-sm text-ink-secondary">Languages</label>
          <div className="mt-1 flex gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                className={`rounded-control border px-3 py-1 text-sm ${
                  languages.includes(l) ? "border-primary bg-primary text-white" : "border-neutral-200 text-ink"
                }`}
                onClick={() => toggleLanguage(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button className={buttonClasses("primary")} disabled={saving || !firstName.trim()} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && <p className="text-sm text-ink-secondary">{message}</p>}
      </section>
    </main>
  );
}
