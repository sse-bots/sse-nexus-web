"use client";

import Link from "next/link";
import { KeyRound, Sparkles, Terminal } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useServerWorkspace } from "@/components/ServerWorkspaceContext";

export default function ServerActivationKeysPage() {
  const { guildId, data } = useServerWorkspace();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">
            Approved Activation Keys ({data.readyKeys.length})
          </h2>
          <p className="text-xs text-slate-400">
            Copy your approved key and run{" "}
            <code className="text-slate-200">/activation</code> inside{" "}
            <strong>{data.guild.name}</strong>. Keys disappear here
            automatically once redeemed.
          </p>
        </div>

        <Link
          href={`/dashboard/servers/${guildId}/request`}
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 sm:self-center"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Request New Key
        </Link>
      </div>

      {data.readyKeys.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h3 className="text-base font-bold text-white">
            No unredeemed activation keys
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
            Once SSE staff approve your request, your single-use activation key
            will appear right here ready to copy.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href={`/dashboard/servers/${guildId}/request`}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Request Activation
            </Link>
            <Link
              href={`/dashboard/servers/${guildId}/pending`}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              View Pending ({data.pendingRequests.length})
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.readyKeys.map((rk) => {
            const slashCommand = rk.plaintext_key
              ? `/activation key:${rk.plaintext_key}`
              : null;

            return (
              <div
                key={rk.key_id}
                className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold uppercase text-emerald-300">
                      {rk.key_scope} KEY READY
                    </span>
                    <span className="text-sm font-bold text-white">
                      {rk.bot_names.join(", ")}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    Issued {new Date(rk.created_at).toLocaleString()}
                    {rk.expires_at
                      ? ` · Expires ${new Date(rk.expires_at).toLocaleString()}`
                      : " · Never expires"}
                  </span>
                </div>

                {rk.plaintext_key ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col justify-between gap-2 rounded-2xl border border-emerald-500/35 bg-slate-950/90 p-3.5 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Activation Key
                        </div>
                        <code className="block truncate font-mono text-sm font-semibold text-emerald-300">
                          {rk.plaintext_key}
                        </code>
                      </div>
                      <CopyButton value={rk.plaintext_key} label="Copy Key" />
                    </div>

                    {slashCommand && (
                      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-center gap-2">
                          <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
                          <code className="truncate font-mono text-xs text-slate-300">
                            {slashCommand}
                          </code>
                        </div>
                        <CopyButton value={slashCommand} label="Copy Command" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                    {data.guild.isOwner
                      ? "This key was issued directly in Discord DM. Check your Discord direct messages from SSE Nexus to copy it."
                      : "Only the actual Discord Server Owner can view decrypted activation keys."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
