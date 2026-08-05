"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  country: { name: string; code: string } | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings ?? []));
  }

  useEffect(load, []);

  async function save(setting: Setting) {
    setSaving(setting.id);
    const raw = edits[setting.id] ?? JSON.stringify(setting.value);
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    await fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ settingId: setting.id, value }) });
    setSaving(null);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Platform settings</h1>
      <p className="mb-4 text-xs text-ink-secondary">
        Values are stored as JSON — numbers, booleans, or strings depending on the setting. Only Super Admins can edit these.
      </p>
      <div className="flex flex-col gap-2">
        {settings.map((s) => (
          <div key={s.id} className="rounded-card bg-white p-4 shadow-card">
            <p className="text-sm font-semibold text-ink">{s.key}</p>
            <p className="text-xs text-ink-secondary">{s.country ? s.country.name : "Global default"}</p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
                defaultValue={JSON.stringify(s.value)}
                onChange={(e) => setEdits((prev) => ({ ...prev, [s.id]: e.target.value }))}
              />
              <button className={buttonClasses("secondary", "px-3 py-2 text-sm")} disabled={saving === s.id} onClick={() => save(s)}>
                Save
              </button>
            </div>
          </div>
        ))}
        {settings.length === 0 && <EmptyState message="No settings found." />}
      </div>
    </div>
  );
}
