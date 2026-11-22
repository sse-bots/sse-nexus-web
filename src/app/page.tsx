import Link from "next/link";
import { ArrowRight, Bot, KeyRound, ShieldCheck, Globe, Sparkles } from "lucide-react";
import { getCollections } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

async function getHomeStats() {
  try {
    const { bots, servers } = await getCollections();
    const [activeBots, onlineBots, activeLicenses] = await Promise.all([
      bots.countDocuments({ status: "active" }),
      bots.countDocuments({ status: "active", heartbeat_status: "online" }),
      servers.countDocuments({ status: "active" }),
    ]);
    return { activeBots, onlineBots, activeLicenses };
  } catch {
    return { activeBots: 0, onlineBots: 0, activeLicenses: 0 };
  }
}

export default async function HomePage() {
  const stats = await getHomeStats();

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#101525] to-indigo-950/60 p-8 sm:p-12">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            SSE Ecosystem Control Plane &amp; Single Sign-On
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Manage every SSE Discord bot from one dashboard.
          </h1>
          <p className="text-base text-slate-300 sm:text-lg">
            Sign in with Discord to view your servers running SSE Nexus, request
            single, bundle, or global activation keys, grab approved keys
            directly from the page, and use one SSE account across all SSE
            websites.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              Open My Servers
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/bots"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Browse Bot Directory
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Registered Active Bots
            </div>
            <div className="mt-2 text-3xl font-bold text-white">
              {stats.activeBots}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Online Now (Heartbeat)
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-400">
              {stats.onlineBots}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Active Server Licenses
            </div>
            <div className="mt-2 text-3xl font-bold text-indigo-400">
              {stats.activeLicenses}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Single, Bundle &amp; Global Keys
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Request activation for a single bot, pick a custom bundle of
            selected bots, or unlock every SSE bot in your server with one
            Global Key.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Bot className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Live Activation Lifecycle
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Track requests from pending approval to instant on-page key
            delivery. Once redeemed, manage active, paused, and announcement
            channel settings seamlessly.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <Globe className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Single SSE Profile (OAuth 2.1 Provider)
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Built with Better Auth OAuth 2.1 / OIDC Provider. Other SSE
            websites can authenticate users with one unified SSE profile and
            manage permissions cleanly.
          </p>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-white">
              Need SSE Nexus in your Discord server first?
            </h3>
            <p className="text-sm text-slate-400">
              Servers appear automatically in your dashboard as soon as SSE
              Nexus is added.
            </p>
          </div>
        </div>
        {process.env.NEXT_PUBLIC_NEXUS_INVITE_URL && (
          <a
            href={process.env.NEXT_PUBLIC_NEXUS_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Invite SSE Nexus
          </a>
        )}
      </section>
    </div>
  );
}
