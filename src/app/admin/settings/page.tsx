"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setSettings(j.settings || {});
        setLogs(j.logs || []);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) setSaved(true);
  }

  function csvToArray(val: string) {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const singleFields = [
    ["licensed_owner_role_id", "Licensed Owner Role ID"],
    ["logs_channel_id", "Audit Logs Channel ID"],
    ["pending_channel_id", "Pending Applications Channel ID"],
    ["approved_channel_id", "Approved Applications Channel ID"],
    ["rejected_channel_id", "Rejected Applications Channel ID"],
    ["list_channel_id", "Public Bot Directory Channel ID"],
    ["status_board_channel_id", "Status Board Channel ID"],
  ];

  const arrayFields = [
    ["moderator_role_ids", "Moderator Role IDs (comma-separated)"],
    ["blacklisted_role_ids", "Blacklisted Role IDs (comma-separated)"],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Hub Settings &amp; Audit Logs</h1>

      <form
        onSubmit={save}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2"
      >
        {arrayFields.map(([key, label]) => (
          <div key={key} className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">{label}</label>
            <input
              value={
                Array.isArray(settings[key])
                  ? (settings[key] as string[]).join(", ")
                  : ""
              }
              onChange={(e) =>
                setSettings((s) => ({ ...s, [key]: csvToArray(e.target.value) }))
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </div>
        ))}
        {singleFields.map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-slate-400">{label}</label>
            <input
              value={String(settings[key] || "")}
              onChange={(e) =>
                setSettings((s) => ({ ...s, [key]: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </div>
        ))}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Save Support Server Settings
          </button>
          {saved && (
            <span className="text-xs text-emerald-400">Saved to MongoDB.</span>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">Recent Activation Logs</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Bot / Scope</th>
                <th className="px-4 py-2.5">Server</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {logs.map((l, idx) => (
                <tr key={String(l._id || idx)}>
                  <td className="px-4 py-2.5 font-mono text-indigo-300">
                    {String(l.event || "-")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {String(l.bot_activation_id || "-")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    {String(l.guild_id || "-")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    {String(l.user_id || l.performed_by || "-")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {l.created_at
                      ? new Date(String(l.created_at)).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
