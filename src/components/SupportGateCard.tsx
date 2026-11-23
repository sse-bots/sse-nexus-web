"use client";

import { ExternalLink, Link2, RefreshCw, ShieldAlert, Users } from "lucide-react";

export function SupportGateCard({
  reason,
  inviteUrl,
  accountsUrl,
  onRetry,
}: {
  reason: "discord_not_linked" | "not_in_server" | "missing_member_role" | null;
  inviteUrl?: string;
  accountsUrl?: string;
  onRetry?: () => void;
}) {
  const notLinked = reason === "discord_not_linked";
  const missingRole = reason === "missing_member_role";
  const linkDiscordHref = `${(
    accountsUrl ||
    process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL ||
    "https://sse-account.vercel.app"
  ).replace(/\/+$/, "")}/account/security`;

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-amber-500/35 bg-slate-900/80 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
        {notLinked ? (
          <Link2 className="h-7 w-7" />
        ) : missingRole ? (
          <ShieldAlert className="h-7 w-7" />
        ) : (
          <Users className="h-7 w-7" />
        )}
      </div>

      <h1 className="text-xl font-bold text-white">
        {notLinked
          ? "Link Your Discord Account First"
          : missingRole
            ? "Support Server Member Role Required"
            : "Join the SSE Support Server First"}
      </h1>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
        {notLinked
          ? "Your SSE Account does not have a linked Discord profile yet. Link Discord on SSE Accounts so SSE Nexus can detect your Discord servers and bot activations."
          : missingRole
            ? "You are in the SSE Support Server, but your account does not have the required verified Member role yet. Complete verification in the Support Server and try again."
            : "To protect SSE servers from spam and reduce API load, only members of our official Discord Support Server can add SSE Nexus and request bot activations."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {notLinked ? (
          <a
            href={linkDiscordHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4]"
          >
            Link Discord on SSE Accounts
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          inviteUrl && (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              {missingRole ? "Open Support Server" : "Join Support Server"}
              <ExternalLink className="h-4 w-4" />
            </a>
          )
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            {notLinked ? "I've Linked — Re-check" : "I've Joined — Re-check"}
          </button>
        )}
      </div>
    </div>
  );
}
