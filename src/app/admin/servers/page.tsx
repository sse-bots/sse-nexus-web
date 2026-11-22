"use client";

import { useCallback, useEffect, useState } from "react";

interface ServerLic {
  _id: string;
  bot_activation_id: string;
  bot_name?: string;
  guild_id: string;
  status: string;
  activated_by?: string;
  activated_at?: string;
}

export default function AdminServersPage() {
  const [rows, setRows] = useState<ServerLic[]>([]);
  const [guildFilter, setGuildFilter] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/servers?guild=${encodeURIComponent(guildFilter)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const j = await res.json();
      setRows(j.servers || []);
    }
  }, [guildFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(
    bot_activation_id: string,
    guild_id: string,
    action: "revoke" | "deactivate" | "reactivate"
  ) {
    await fetch("/api/admin/servers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_activation_id, guild_id, action }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Activated Server Licenses</h1>
        <input
          value={guildFilter}
          onChange={(e) => setGuildFilter(e.target.value)}
          placeholder="Filter by Server ID..."
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Bot</th>
              <th className="px-4 py-3">Server ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="px-4 py-3 text-white">
                  {r.bot_name || r.bot_activation_id}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">{r.guild_id}</td>
                <td className="px-4 py-3 uppercase text-slate-300">{r.status}</td>
                <td className="px-4 py-3 space-x-2">
                  {r.status !== "active" && (
                    <button
                      type="button"
                      onClick={() => act(r.bot_activation_id, r.guild_id, "reactivate")}
                      className="text-emerald-400 hover:underline"
                    >
                      Activate
                    </button>
                  )}
                  {r.status === "active" && (
                    <button
                      type="button"
                      onClick={() => act(r.bot_activation_id, r.guild_id, "deactivate")}
                      className="text-amber-400 hover:underline"
                    >
                      Pause
                    </button>
                  )}
                  {r.status !== "revoked" && (
                    <button
                      type="button"
                      onClick={() => act(r.bot_activation_id, r.guild_id, "revoke")}
                      className="text-rose-400 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
