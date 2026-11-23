"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Globe,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react";

interface MeData {
  authenticated: boolean;
  user: {
    userId: string;
    discordId: string;
    discordUsername: string | null;
    githubUsername: string | null;
    name: string;
    email: string;
    image: string | null;
    isOwner: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    accountsUrl?: string;
  } | null;
}

export default function AccountPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">Loading profile...</div>
    );
  }

  if (!me?.authenticated || !me.user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-300">
          Please sign in with SSE Accounts to view your profile.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in with SSE Accounts
        </Link>
      </div>
    );
  }

  const u = me.user;
  const accountsUrl = (
    u.accountsUrl ||
    process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL ||
    "https://sse-account.vercel.app"
  ).replace(/\/+$/, "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {u.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.image}
              alt={u.name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
              <User className="h-8 w-8" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold text-white">{u.name}</h1>
            <p className="text-xs text-slate-400">{u.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Connected via SSE Accounts
              </span>
              {u.discordId && (
                <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-mono text-indigo-300">
                  Discord:{" "}
                  {u.discordUsername ? `@${u.discordUsername}` : u.discordId}
                </span>
              )}
              {u.isOwner ? (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-semibold text-amber-300">
                  Hub Owner
                </span>
              ) : u.isAdmin ? (
                <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 font-semibold text-violet-300">
                  Support Server Admin
                </span>
              ) : u.isStaff ? (
                <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-semibold text-indigo-300">
                  Support Server Moderator
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Central Account Management Shortcuts */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">
            Manage Your Central SSE Account
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Your email, password, linked Discord &amp; GitHub accounts, active
          devices, and connected SSE websites are managed centrally on{" "}
          <strong>SSE Accounts</strong>.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href={`${accountsUrl}/account`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs font-semibold text-white transition hover:border-indigo-500"
          >
            <span className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              Edit Profile &amp; Email
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <a
            href={`${accountsUrl}/account/security`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs font-semibold text-white transition hover:border-indigo-500"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              Discord / GitHub &amp; Password
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <a
            href={`${accountsUrl}/account/apps`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs font-semibold text-white transition hover:border-indigo-500"
          >
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-400" />
              Connected Apps
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
