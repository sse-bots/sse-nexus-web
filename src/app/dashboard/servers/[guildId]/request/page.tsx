"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  ExternalLink,
  KeyRound,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import { useServerWorkspace } from "@/components/ServerWorkspaceContext";

export default function ServerRequestActivationPage() {
  const { guildId, data, reload, notify } = useServerWorkspace();
  const router = useRouter();
  const [selectedBundle, setSelectedBundle] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const canRequest =
    data.guild.isOwner && !data.user.isBlacklisted && data.guild.nexusPresent;

  const requestableBots = data.bots.filter(
    (b) =>
      b.activation_required &&
      (b.state === "available" || b.state === "revoked")
  );
  const inProgressBots = data.bots.filter(
    (b) =>
      b.activation_required &&
      (b.state === "pending" || b.state === "approved_key_ready")
  );

  function toggleBundle(aid: string) {
    setSelectedBundle((prev) =>
      prev.includes(aid) ? prev.filter((x) => x !== aid) : [...prev, aid]
    );
  }

  async function submitRequest(
    scope: "single" | "bundle" | "global",
    botIds?: string[]
  ) {
    const key = scope === "single" ? `single-${botIds?.[0]}` : scope;
    setSubmitting(key);
    try {
      const res = await fetch(`/api/servers/${guildId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          bot_activation_ids: botIds,
          note: note.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        notify("err", j.error || "Could not submit activation request.");
        return;
      }
      setSelectedBundle([]);
      setNote("");
      notify(
        "ok",
        "Activation request submitted! Redirecting to Pending Requests..."
      );
      await reload();
      router.push(`/dashboard/servers/${guildId}/pending`);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Global Activation Spotlight Card */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              All-In-One License
            </span>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              Global Activation (All {data.globalActivation.totalActivationBots}{" "}
              SSE Bots)
            </h2>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Unlock every activation-required SSE bot in{" "}
              <strong>{data.guild.name}</strong> with one single Global Key.
              Currently{" "}
              <strong className="text-emerald-400">
                {data.globalActivation.activeCount} /{" "}
                {data.globalActivation.totalActivationBots}
              </strong>{" "}
              bots are active.
            </p>
          </div>

          <div className="shrink-0">
            {data.globalActivation.allActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-300">
                All SSE Bots Already Active
              </span>
            ) : data.globalActivation.hasReadyGlobalKey ? (
              <Link
                href={`/dashboard/servers/${guildId}/keys`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <KeyRound className="h-4 w-4" />
                Global Key Ready — View Key
              </Link>
            ) : data.globalActivation.hasPendingGlobal ? (
              <Link
                href={`/dashboard/servers/${guildId}/pending`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-xs font-bold text-amber-300"
              >
                <Clock className="h-4 w-4" />
                Global Request Pending
              </Link>
            ) : (
              <button
                type="button"
                disabled={!canRequest || submitting !== null}
                onClick={() => submitRequest("global")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {submitting === "global"
                  ? "Submitting..."
                  : "Request Global Key"}
              </button>
            )}
          </div>
        </div>

        {/* Optional Note Input */}
        {canRequest &&
          !data.globalActivation.allActive &&
          !data.globalActivation.hasPendingGlobal && (
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                Optional Note for SSE Staff (applies to Single, Bundle, or
                Global request)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={350}
                placeholder="e.g. Tournament community server with 500+ active players..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
      </section>

      {/* Bundle Request Builder */}
      {requestableBots.length >= 2 && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Layers className="h-4 w-4" />
                Custom Multi-Bot Bundle
              </div>
              <h2 className="text-base font-bold text-white">
                Request Bundle Key (Select 2 or More Bots)
              </h2>
              <p className="text-xs text-slate-400">
                Select multiple bots below to receive one combined Bundle Key.
              </p>
            </div>

            {selectedBundle.length >= 2 && (
              <button
                type="button"
                disabled={!canRequest || submitting !== null}
                onClick={() => submitRequest("bundle", selectedBundle)}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 sm:self-center"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting === "bundle"
                  ? "Submitting..."
                  : `Request Bundle (${selectedBundle.length} Bots)`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requestableBots.map((bot) => {
              const checked = selectedBundle.includes(bot.activation_id);
              return (
                <button
                  key={bot.activation_id}
                  type="button"
                  onClick={() => toggleBundle(bot.activation_id)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                    checked
                      ? "border-indigo-500 bg-indigo-600/15 text-white"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{bot.name}</div>
                    <div className="truncate font-mono text-[10px] text-slate-500">
                      {bot.activation_id}
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      checked
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-700"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Individual Bot Single Activation Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            Single Bot Activation ({requestableBots.length} Available)
          </h2>
          <p className="text-xs text-slate-400">
            Request an activation key for one specific SSE bot.
          </p>
        </div>

        {requestableBots.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
            All activation-required SSE bots are either already active, awaiting
            approval in{" "}
            <Link
              href={`/dashboard/servers/${guildId}/pending`}
              className="text-indigo-400 underline"
            >
              Pending
            </Link>
            , or have a key ready in{" "}
            <Link
              href={`/dashboard/servers/${guildId}/keys`}
              className="text-emerald-400 underline"
            >
              Activation Keys
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {requestableBots.map((bot) => (
              <div
                key={bot.activation_id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {bot.name}
                      </h3>
                      <span className="font-mono text-[11px] text-slate-500">
                        {bot.activation_id}
                      </span>
                    </div>
                    <a
                      href={bot.invite_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
                    >
                      Invite
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {bot.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                  {bot.state === "revoked" ? (
                    <span className="text-[11px] font-medium text-rose-400">
                      Previous license revoked
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Single-use server key
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!canRequest || submitting !== null}
                    onClick={() =>
                      submitRequest("single", [bot.activation_id])
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting === `single-${bot.activation_id}`
                      ? "Requesting..."
                      : "Request Key"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bots already in progress */}
      {inProgressBots.length > 0 && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 text-xs text-slate-400">
          <strong className="text-slate-200">
            {inProgressBots.length} bot(s)
          </strong>{" "}
          already have a pending request or approved key waiting. Check the{" "}
          <Link
            href={`/dashboard/servers/${guildId}/pending`}
            className="text-amber-300 underline"
          >
            Pending
          </Link>{" "}
          or{" "}
          <Link
            href={`/dashboard/servers/${guildId}/keys`}
            className="text-emerald-300 underline"
          >
            Activation Keys
          </Link>{" "}
          tabs.
        </section>
      )}
    </div>
  );
}
