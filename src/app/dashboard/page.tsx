"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  Plus,
  RefreshCw,
  Server,
} from "lucide-react";

interface ServerCard {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  nexusPresent: boolean;
  inviteUrl: string;
  activeBotCount: number;
  pendingRequestCount: number;
  readyKeyCount: number;
}

function iconUrl(id: string, icon: string | null) {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=128`;
}

export default function DashboardPage() {
  const [servers, setServers] = useState<ServerCard[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "missing">("all");
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadServers(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const url = forceRefresh ? "/api/servers?refresh=1" : "/api/servers";
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401) {
        setUnauth(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load your servers.");
        return;
      }
      setServers(data.servers || []);
      setIsBlacklisted(Boolean(data.user?.isBlacklisted));
    } catch {
      setError("Network error while loading Discord servers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServers(false);
  }, []);

  if (unauth) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <Server className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">
          Sign in to view your servers
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Connect your Discord account to manage SSE Nexus and request bot
          activations.
        </p>
        <Link
          href="/sign-in?next=/dashboard"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in with Discord
        </Link>
      </div>
    );
  }

  const greenCount = servers.filter((s) => s.nexusPresent).length;
  const redCount = servers.length - greenCount;

  const visibleServers = servers.filter((s) => {
    if (filter === "active") return s.nexusPresent;
    if (filter === "missing") return !s.nexusPresent;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            My Discord Servers
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            <span className="font-medium text-emerald-400">Green circle</span>{" "}
            means SSE Nexus is added (click to manage bots).{" "}
            <span className="font-medium text-rose-400">Red circle</span> means
            SSE Nexus is not added yet (click to add Nexus).
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadServers(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Servers
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "all"
              ? "bg-indigo-600 text-white"
              : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          All Servers ({servers.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "active"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Nexus Added ({greenCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("missing")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "missing"
              ? "bg-rose-600 text-white"
              : "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Add Nexus ({redCount})
        </button>
      </div>

      {isBlacklisted && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <strong>Activation Requests Restricted:</strong> Your account holds
            a blacklisted role in the SSE Support Server.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="flex h-48 animate-pulse flex-col items-center justify-center rounded-2xl bg-slate-900"
            />
          ))}
        </div>
      ) : visibleServers.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <Server className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h2 className="text-lg font-semibold text-white">No servers found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Make sure you signed in with Discord granting the{" "}
            <code className="text-slate-200">guilds</code> permission, and that
            you own or have Manage Server permission on at least one Discord
            server.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleServers.map((srv) => {
            const img = iconUrl(srv.id, srv.icon);

            const cardBody = (
              <>
                <div className="relative">
                  <div
                    className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 p-1 transition duration-200 group-hover:scale-105 ${
                      srv.nexusPresent
                        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                        : "border-rose-500 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.4)]"
                    }`}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={srv.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-slate-200">
                        {srv.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <span
                    className={`absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0c0f17] ${
                      srv.nexusPresent ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    title={
                      srv.nexusPresent
                        ? "SSE Nexus Active"
                        : "Click to add SSE Nexus"
                    }
                  >
                    {!srv.nexusPresent && (
                      <Plus className="h-3.5 w-3.5 text-white" />
                    )}
                  </span>
                </div>

                <div className="mt-4 w-full text-center">
                  <h2 className="truncate text-sm font-semibold text-white">
                    {srv.name}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium">
                    {srv.nexusPresent ? (
                      <span className="text-emerald-400">
                        Manage Bots · {srv.activeBotCount} Active
                      </span>
                    ) : (
                      <span className="text-rose-400">
                        Click to Add SSE Nexus
                      </span>
                    )}
                  </p>
                </div>

                {srv.nexusPresent &&
                  (srv.readyKeyCount > 0 || srv.pendingRequestCount > 0) && (
                    <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                      {srv.readyKeyCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          <KeyRound className="h-3 w-3" />
                          {srv.readyKeyCount} Key Ready
                        </span>
                      )}
                      {srv.pendingRequestCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          <Clock className="h-3 w-3" />
                          {srv.pendingRequestCount} Pending
                        </span>
                      )}
                    </div>
                  )}
              </>
            );

            if (srv.nexusPresent) {
              return (
                <Link
                  key={srv.id}
                  href={`/dashboard/servers/${srv.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 transition hover:border-emerald-500/60 hover:bg-slate-900"
                >
                  {cardBody}
                </Link>
              );
            }

            return (
              <a
                key={srv.id}
                href={srv.inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-slate-800/90 bg-slate-900/40 p-5 transition hover:border-rose-500/60 hover:bg-slate-900/80"
              >
                {cardBody}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
