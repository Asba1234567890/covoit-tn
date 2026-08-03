"use client";

import { useEffect, useState } from "react";

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
      <h1 className="mb-4 text-lg font-semibold">Platform settings</h1>
      <p className="mb-4 text-xs text-neutral-500">
        Values are stored as JSON — numbers, booleans, or strings depending on the setting. Only Super Admins can edit these.
      </p>
      <div className="flex flex-col gap-2">
        {settings.map((s) => (
          <div key={s.id} className="rounded-xl border bg-white p-4">
            <p className="text-sm font-medium">{s.key}</p>
            <p className="text-xs text-neutral-500">{s.country ? s.country.name : "Global default"}</p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                defaultValue={JSON.stringify(s.value)}
                onChange={(e) => setEdits((prev) => ({ ...prev, [s.id]: e.target.value }))}
              />
              <button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={saving === s.id} onClick={() => save(s)}>
                Save
              </button>
            </div>
          </div>
        ))}
        {settings.length === 0 && <p className="text-sm text-neutral-500">No settings found.</p>}
      </div>
    </div>
  );
}
