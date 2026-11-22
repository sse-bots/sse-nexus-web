"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, Plus, Trash2, Wrench } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface AdminBot {
  activation_id: string;
  name: string;
  discord_bot_id: string;
  description: string;
  invite_url: string;
  activation_required: boolean;
  maintenance_mode: boolean;
  heartbeat_status: string;
  status: string;
  reported_servers: number;
  active_licenses: number;
}

export default function AdminBotsPage() {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretBanner, setSecretBanner] = useState<{ id: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New bot form
  const [name, setName] = useState("");
  const [discordBotId, setDiscordBotId] = useState("");
  const [description, setDescription] = useState("");
  const [activationRequired, setActivationRequired] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bots", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load bots.");
      setBots(j.bots || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addBot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSecretBanner(null);
    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        discord_bot_id: discordBotId,
        description,
        activation_required: activationRequired,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Could not add bot.");
      return;
    }
    setSecretBanner({ id: j.activation_id, secret: j.heartbeat_secret });
    setName("");
    setDiscordBotId("");
    setDescription("");
    await load();
  }

  async function patchBot(activationId: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/bots/${activationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Update failed.");
      return;
    }
    if (j.heartbeat_secret) {
      setSecretBanner({ id: activationId, secret: j.heartbeat_secret });
    }
    await load();
  }

  async function disableBot(activationId: string) {
    if (
      !confirm(
        `Disable ${activationId}? All unused keys and active server licenses for this bot will be revoked.`
      )
    )
      return;
    await fetch(`/api/admin/bots/${activationId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Registered SSE Bots</h1>

      {secretBanner && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <div className="font-semibold">
            Heartbeat Secret for <code>{secretBanner.id}</code> (shown once — set as{" "}
            <code>HUB_HEARTBEAT_SECRET</code>):
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-slate-950 px-3 py-1.5 text-emerald-300">
              {secretBanner.secret}
            </code>
            <CopyButton value={secretBanner.secret} />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={addBot}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 text-sm font-semibold text-white">
          Register New SSE Bot
        </div>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bot Display Name (e.g. SSE Tournament)"
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          required
          value={discordBotId}
          onChange={(e) => setDiscordBotId(e.target.value)}
          placeholder="Discord Bot Application ID (17-20 digits)"
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description..."
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={activationRequired}
            onChange={(e) => setActivationRequired(e.target.checked)}
            className="h-4 w-4 accent-indigo-500"
          />
          Requires Activation Key
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Register Bot
          </button>
        </div>
      </form>

      {loading ? (
        <div className="py-10 text-center text-slate-400">Loading bots...</div>
      ) : (
        <div className="space-y-3">
          {bots.map((b) => (
            <div
              key={b.activation_id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{b.name}</span>
                  <span className="font-mono text-xs text-slate-400">
                    {b.activation_id}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      b.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {b.status}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                    HB: {b.heartbeat_status || "unknown"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Discord ID: <code>{b.discord_bot_id}</code> · Reported Servers:{" "}
                  {b.reported_servers} · Active Licenses: {b.active_licenses}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchBot(b.activation_id, {
                      activation_required: !b.activation_required,
                    })
                  }
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  {b.activation_required ? "Key: Required" : "Key: Free"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchBot(b.activation_id, {
                      maintenance_mode: !b.maintenance_mode,
                    })
                  }
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${
                    b.maintenance_mode
                      ? "border-orange-500/50 bg-orange-500/20 text-orange-200"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {b.maintenance_mode ? "Maint ON" : "Maint OFF"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchBot(b.activation_id, { rotate_heartbeat_secret: true })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  <Key className="h-3.5 w-3.5" />
                  Rotate HB
                </button>
                {b.status === "active" && (
                  <button
                    type="button"
                    onClick={() => disableBot(b.activation_id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
