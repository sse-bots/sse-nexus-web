"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Ban } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface KeyRow {
  _id: string;
  key_scope?: string;
  bot_activation_id: string;
  bot_activation_ids?: string[];
  status: string;
  guild_id?: string | null;
  expires_at?: string | null;
  created_at: string;
}

interface BotOpt {
  activation_id: string;
  name: string;
  activation_required: boolean;
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [bots, setBots] = useState<BotOpt[]>([]);
  const [scope, setScope] = useState<"single" | "bundle" | "global">("single");
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [guildId, setGuildId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [kRes, bRes] = await Promise.all([
      fetch("/api/admin/keys", { cache: "no-store" }),
      fetch("/api/admin/bots", { cache: "no-store" }),
    ]);
    if (kRes.ok) {
      const kj = await kRes.json();
      setKeys(kj.keys || []);
    }
    if (bRes.ok) {
      const bj = await bRes.json();
      setBots((bj.bots || []).filter((b: { status: string }) => b.status === "active"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleBot(id: string) {
    if (scope === "single") {
      setSelectedBots([id]);
    } else {
      setSelectedBots((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  }

  async function generateKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGeneratedKey(null);
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key_scope: scope,
        bot_activation_ids: scope === "global" ? [] : selectedBots,
        guild_id: guildId.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : "",
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Could not generate key.");
      return;
    }
    setGeneratedKey(j.plaintext_key);
    await load();
  }

  async function revokeKey(keyId: string) {
    await fetch(`/api/admin/keys/${keyId}`, { method: "PATCH" });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Activation Keys Manager</h1>

      {generatedKey && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="text-xs font-semibold text-emerald-300">
            Generated Key (copy now):
          </div>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-slate-950 px-3 py-1.5 font-mono text-sm text-emerald-200">
              {generatedKey}
            </code>
            <CopyButton value={generatedKey} />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={generateKey}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="text-sm font-semibold text-white">
          Generate Single, Bundle, or Global Activation Key
        </div>

        <div className="flex flex-wrap gap-2">
          {(["single", "bundle", "global"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScope(s);
                setSelectedBots([]);
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase ${
                scope === s
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-700 bg-slate-950 text-slate-300"
              }`}
            >
              {s === "global"
                ? "Global (All Bots)"
                : s === "bundle"
                  ? "Bundle (Selected Bots)"
                  : "Single Bot"}
            </button>
          ))}
        </div>

        {scope !== "global" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {bots.map((b) => {
              const checked = selectedBots.includes(b.activation_id);
              return (
                <label
                  key={b.activation_id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs ${
                    checked
                      ? "border-indigo-500 bg-indigo-500/15 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-300"
                  }`}
                >
                  <input
                    type={scope === "single" ? "radio" : "checkbox"}
                    checked={checked}
                    onChange={() => toggleBot(b.activation_id)}
                  />
                  <span className="truncate">{b.name}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="Optional Server ID binding (if set, key shows on that server's web page)"
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
          />
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <KeyRound className="h-4 w-4" />
          Generate Key
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Key ID</th>
              <th className="px-4 py-3">Scope &amp; Bots</th>
              <th className="px-4 py-3">Server Binding</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {keys.map((k) => (
              <tr key={k._id}>
                <td className="px-4 py-3 font-mono text-slate-300">{k._id}</td>
                <td className="px-4 py-3">
                  <span className="mr-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                    {k.key_scope || "single"}
                  </span>
                  <span className="text-slate-200">
                    {k.bot_activation_ids?.length
                      ? k.bot_activation_ids.join(", ")
                      : k.bot_activation_id}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">
                  {k.guild_id || "Any Server"}
                </td>
                <td className="px-4 py-3 uppercase">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      k.status === "unused"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : k.status === "used"
                          ? "bg-indigo-500/15 text-indigo-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {k.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {k.status === "unused" && (
                    <button
                      type="button"
                      onClick={() => revokeKey(k._id)}
                      className="inline-flex items-center gap-1 text-rose-400 hover:underline"
                    >
                      <Ban className="h-3.5 w-3.5" />
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
