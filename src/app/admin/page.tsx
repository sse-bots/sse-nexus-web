"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Globe, Inbox, KeyRound, Megaphone, Server } from "lucide-react";

interface Overview {
  activeBots: number;
  onlineBots: number;
  pendingRequests: number;
  unusedKeys: number;
  activeServers: number;
  oauthClientCount: number;
  scheduledAnnouncements: number;
  isAdmin: boolean;
  isOwner: boolean;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Access denied.");
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-rose-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-slate-400">
        Loading Hub overview...
      </div>
    );
  }

  const cards = [
    {
      label: "Pending Requests",
      value: data.pendingRequests,
      href: "/admin/requests",
      icon: Inbox,
      accent: "text-amber-400",
      allowed: true,
    },
    {
      label: "Active Server Licenses",
      value: data.activeServers,
      href: "/admin/servers",
      icon: Server,
      accent: "text-indigo-400",
      allowed: true,
    },
    {
      label: "Active / Online Bots",
      value: `${data.onlineBots} / ${data.activeBots}`,
      href: "/admin/bots",
      icon: Bot,
      accent: "text-emerald-400",
      allowed: data.isAdmin || data.isOwner,
    },
    {
      label: "SSO OAuth Client Apps",
      value: data.oauthClientCount,
      href: "/admin/oauth-clients",
      icon: Globe,
      accent: "text-sky-400",
      allowed: data.isAdmin || data.isOwner,
    },
    {
      label: "Unused Activation Keys",
      value: data.unusedKeys,
      href: "/admin/keys",
      icon: KeyRound,
      accent: "text-violet-400",
      allowed: data.isOwner,
    },
    {
      label: "Scheduled Announcements",
      value: data.scheduledAnnouncements,
      href: "/admin/announcements",
      icon: Megaphone,
      accent: "text-orange-400",
      allowed: data.isOwner,
    },
  ].filter((c) => c.allowed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hub Admin Overview</h1>
        <p className="text-sm text-slate-400">
          Live snapshot of SSE Nexus database (<code>sse_bots_user</code>).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {c.label}
              </span>
              <c.icon className={`h-5 w-5 ${c.accent}`} />
            </div>
            <div className={`mt-3 text-3xl font-bold ${c.accent}`}>
              {c.value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
