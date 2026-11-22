"use client";

import { useEffect, useState } from "react";
import { Bot, ExternalLink, Search, Wrench, Activity, Lock, Unlock } from "lucide-react";

interface PublicBot {
  activation_id: string;
  name: string;
  discord_bot_id: string;
  description: string;
  invite_url: string;
  activation_required: boolean;
  maintenance_mode: boolean;
  heartbeat_status: "online" | "offline" | "unknown";
  heartbeat_last_seen: string | null;
  reported_servers: number;
  active_licenses: number;
}

export default function PublicBotsPage() {
  const [bots, setBots] = useState<PublicBot[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "activation" | "free">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/bots", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBots(d.bots || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bots.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.description.toLowerCase().includes(query.toLowerCase()) ||
      b.activation_id.toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "activation") return b.activation_required;
    if (filter === "free") return !b.activation_required;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            SSE Bot Directory &amp; Live Status
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse all active official SSE bots, check live heartbeat health,
            and invite them to your Discord server.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bots..."
              className="rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "activation" | "free")}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="all">All bots</option>
            <option value="activation">Activation required</option>
            <option value="free">No activation needed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-900" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-400">
          No active SSE bots match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bot) => {
            const statusColor =
              bot.heartbeat_status === "online"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : bot.heartbeat_status === "offline"
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700";

            return (
              <div
                key={bot.activation_id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-white">{bot.name}</h2>
                        <div className="font-mono text-[11px] text-slate-500">
                          {bot.activation_id}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${statusColor}`}
                    >
                      <Activity className="h-3 w-3" />
                      {bot.heartbeat_status}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm text-slate-400">
                    {bot.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {bot.activation_required ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-300">
                        <Lock className="h-3 w-3" />
                        Activation Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                        <Unlock className="h-3 w-3" />
                        Free to Use
                      </span>
                    )}
                    {bot.maintenance_mode && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 px-2.5 py-1 text-orange-300">
                        <Wrench className="h-3 w-3" />
                        Maintenance
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
                  <span>{bot.reported_servers} servers</span>
                  <a
                    href={bot.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-500"
                  >
                    Invite Bot
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
