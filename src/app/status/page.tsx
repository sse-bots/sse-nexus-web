"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Server,
  Wrench,
  XCircle,
} from "lucide-react";

interface BotStatusItem {
  activation_id: string;
  name: string;
  description: string;
  invite_url: string;
  activation_required: boolean;
  maintenance_mode: boolean;
  heartbeat_status: "online" | "offline" | "unknown";
  heartbeat_last_seen: string | null;
  reported_servers: number;
  active_licenses: number;
}

export default function LiveStatusPage() {
  const [bots, setBots] = useState<BotStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/public/bots", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setBots(d.bots || []);
        setLastRefreshed(new Date());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 45_000);
    return () => window.clearInterval(timer);
  }, []);

  const onlineCount = bots.filter((b) => b.heartbeat_status === "online").length;
  const maintCount = bots.filter((b) => b.maintenance_mode).length;
  const offlineCount = bots.filter(
    (b) => b.heartbeat_status === "offline" && !b.maintenance_mode
  ).length;

  const allHealthy = bots.length > 0 && offlineCount === 0 && maintCount === 0;

  return (
    <div className="space-y-8">
      {/* Header & Overall Health Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            SSE Ecosystem Live Status
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time heartbeat telemetry across all SSE Discord bots · Auto-refreshes every 45s
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh ({lastRefreshed.toLocaleTimeString()})
        </button>
      </div>

      <div
        className={`flex items-center justify-between gap-4 rounded-3xl border p-5 sm:p-6 ${
          allHealthy
            ? "border-emerald-500/40 bg-emerald-500/10"
            : offlineCount > 0
              ? "border-rose-500/40 bg-rose-500/10"
              : "border-amber-500/40 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center gap-3.5">
          {allHealthy ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-400" />
          ) : offlineCount > 0 ? (
            <XCircle className="h-8 w-8 shrink-0 text-rose-400" />
          ) : (
            <Wrench className="h-8 w-8 shrink-0 text-amber-400" />
          )}
          <div>
            <div className="text-base font-extrabold text-white sm:text-lg">
              {allHealthy
                ? "All SSE Systems Operational"
                : offlineCount > 0
                  ? `${offlineCount} Bot(s) Experiencing Downtime`
                  : `${maintCount} Bot(s) Under Scheduled Maintenance`}
            </div>
            <p className="text-xs text-slate-300">
              {onlineCount} of {bots.length} registered SSE bots reporting
              healthy heartbeats.
            </p>
          </div>
        </div>
      </div>

      {/* Bot Status Cards with Uptime Bars */}
      <div className="space-y-4">
        {bots.map((bot) => {
          const isOnline = bot.heartbeat_status === "online";
          const isOffline = bot.heartbeat_status === "offline";

          return (
            <div
              key={bot.activation_id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        bot.maintenance_mode
                          ? "bg-amber-400"
                          : isOnline
                            ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                            : isOffline
                              ? "bg-rose-400"
                              : "bg-slate-500"
                      }`}
                    />
                    <h2 className="text-base font-bold text-white">
                      {bot.name}
                    </h2>
                    <span className="font-mono text-[11px] text-slate-500">
                      {bot.activation_id}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {bot.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 px-2.5 py-1 text-slate-300">
                    <Server className="h-3.5 w-3.5 text-indigo-400" />
                    {bot.reported_servers} servers
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                      bot.maintenance_mode
                        ? "bg-amber-500/15 text-amber-300"
                        : isOnline
                          ? "bg-emerald-500/15 text-emerald-300"
                          : isOffline
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {bot.maintenance_mode
                      ? "Maintenance"
                      : bot.heartbeat_status}
                  </span>
                  <a
                    href={bot.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                    title="Invite Bot"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* 30-Segment Visual Telemetry Strip */}
              <div className="mt-4">
                <div className="flex gap-1">
                  {Array.from({ length: 36 }).map((_, idx) => {
                    const isLatest = idx === 35;
                    const barColor =
                      isLatest && isOffline
                        ? "bg-rose-500"
                        : isLatest && bot.maintenance_mode
                          ? "bg-amber-400"
                          : isOnline
                            ? "bg-emerald-500/85"
                            : "bg-slate-800";
                    return (
                      <div
                        key={idx}
                        className={`h-5 flex-1 rounded-sm transition ${barColor}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Heartbeat Telemetry</span>
                  <span>
                    {bot.heartbeat_last_seen
                      ? `Last ping: ${new Date(bot.heartbeat_last_seen).toLocaleTimeString()}`
                      : "Awaiting first heartbeat"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
