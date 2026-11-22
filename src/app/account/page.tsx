"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, ShieldCheck, Trash2, User } from "lucide-react";

interface MeData {
  authenticated: boolean;
  user: {
    userId: string;
    discordId: string;
    name: string;
    email: string;
    image: string | null;
    isOwner: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isBlacklisted: boolean;
  } | null;
}

interface ConsentRow {
  id: string;
  clientId: string;
  clientName: string;
  clientUri: string | null;
  scopes: string[];
  createdAt: string | null;
}

export default function AccountPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [meRes, consentRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/account/consents", { cache: "no-store" }),
      ]);
      const meJson = await meRes.json();
      setMe(meJson);
      if (consentRes.ok) {
        const cJson = await consentRes.json();
        setConsents(cJson.consents || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revokeApp(clientId: string) {
    await fetch(
      `/api/account/consents?clientId=${encodeURIComponent(clientId)}`,
      { method: "DELETE" }
    );
    load();
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">Loading profile...</div>
    );
  }

  if (!me?.authenticated || !me.user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-300">
          Please sign in to view your SSE profile.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in with Discord
        </Link>
      </div>
    );
  }

  const u = me.user;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-4">
          {u.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.image}
              alt={u.name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold">
              <User className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{u.name}</h1>
            <p className="font-mono text-xs text-slate-400">
              Discord ID: {u.discordId || "Not linked"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Unified SSE Profile Active
              </span>
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">
            Connected Websites (Sign in with SSE)
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          External websites you have authorized with your single SSE account.
          Removing an app requires your consent again on next login.
        </p>

        {consents.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
            You haven&apos;t signed in to any other SSE websites yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {consents.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="font-semibold text-white">{c.clientName}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.scopes.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeApp(c.clientId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Access
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
