"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Server,
} from "lucide-react";
import type { DiscordGuildSummary } from "@/lib/types";

function iconUrl(id: string, icon: string | null) {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=128`;
}

export default function DashboardPage() {
  const [serversWithNexus, setServersWithNexus] = useState<DiscordGuildSummary[]>([]);
  const [otherServers, setOtherServers] = useState<DiscordGuildSummary[]>([]);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadServers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/servers", { cache: "no-store" });
      if (res.status === 401) {
        setUnauth(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load your servers.");
        return;
      }
      setServersWithNexus(data.serversWithNexus || []);
      setOtherServers(data.otherManagedServers || []);
      setIsBlacklisted(Boolean(data.user?.isBlacklisted));
    } catch {
      setError("Network error while loading Discord servers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServers();
  }, []);

  if (unauth) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <Server className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Sign in to view your servers</h1>
        <p className="mt-2 text-sm text-slate-400">
          Connect your Discord account to manage all servers where SSE Nexus is
          present.
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Your Servers with SSE Nexus
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select a server below to request bot activations, view approved
            keys, and manage active SSE bots.
          </p>
        </div>
        <button
          type="button"
          onClick={loadServers}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Servers
        </button>
      </div>

      {isBlacklisted && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <strong>Activation Requests Restricted:</strong> Your account holds
            a blacklisted role in the SSE Support Server. You can still view
            existing active bots, but new activation requests are blocked.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-900" />
          ))}
        </div>
      ) : serversWithNexus.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <Bot className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h2 className="text-lg font-semibold text-white">
            No servers with SSE Nexus found yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Invite SSE Nexus to a server you own, wait a few seconds, and click
            Refresh Servers.
          </p>
          {process.env.NEXT_PUBLIC_NEXUS_INVITE_URL && (
            <a
              href={process.env.NEXT_PUBLIC_NEXUS_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Invite SSE Nexus
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {serversWithNexus.map((srv) => {
            const img = iconUrl(srv.id, srv.icon);
            return (
              <Link
                key={srv.id}
                href={`/dashboard/servers/${srv.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/60 hover:bg-slate-900"
              >
                <div>
                  <div className="flex items-center gap-3.5">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={srv.name}
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-base font-bold text-indigo-300">
                        {srv.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold text-white group-hover:text-indigo-300">
                        {srv.name}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {srv.owner ? (
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                            Server Owner
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                            Manager
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-500">
                          {srv.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-950/70 p-2.5">
                      <div className="text-lg font-bold text-emerald-400">
                        {srv.activeBotCount}
                      </div>
                      <div className="text-[11px] text-slate-400">Active</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 p-2.5">
                      <div className="text-lg font-bold text-amber-400">
                        {srv.pendingRequestCount}
                      </div>
                      <div className="text-[11px] text-slate-400">Pending</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 p-2.5">
                      <div className="text-lg font-bold text-indigo-400">
                        {srv.readyKeyCount}
                      </div>
                      <div className="text-[11px] text-slate-400">Keys Ready</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-medium text-indigo-300">
                  <span className="inline-flex items-center gap-1.5">
                    {srv.readyKeyCount > 0 ? (
                      <>
                        <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Key ready to redeem!</span>
                      </>
                    ) : srv.pendingRequestCount > 0 ? (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-amber-300">Awaiting approval</span>
                      </>
                    ) : (
                      "Manage bots & activations"
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {otherServers.length > 0 && (
        <section className="space-y-4 pt-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">
              Other Servers You Manage (SSE Nexus Not Added)
            </h2>
            <p className="text-xs text-slate-400">
              Invite SSE Nexus to these servers to unlock bot activation
              management.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherServers.map((srv) => (
              <div
                key={srv.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-200">
                    {srv.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {srv.owner ? "Owner" : "Manager"} · {srv.id}
                  </div>
                </div>
                {process.env.NEXT_PUBLIC_NEXUS_INVITE_URL && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_NEXUS_INVITE_URL}&guild_id=${srv.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:text-white"
                  >
                    Invite Nexus
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
