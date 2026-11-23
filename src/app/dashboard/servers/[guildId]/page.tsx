"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useServerWorkspace } from "@/components/ServerWorkspaceContext";

export default function ServerActiveBotsPage() {
  const { guildId, data, reload, notify } = useServerWorkspace();
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeBots = data.bots.filter(
    (b) => b.state === "active" || b.state === "inactive"
  );
  const freeBots = data.bots.filter((b) => b.state === "free");

  async function controlBot(
    activationId: string,
    action: "deactivate" | "reactivate" | "remove"
  ) {
    if (
      action === "remove" &&
      !confirm(
        "Permanently remove this bot's activation from this server? You will need a new key to re-activate it."
      )
    ) {
      return;
    }
    setBusyId(activationId);
    try {
      const url = `/api/servers/${guildId}/bots/${encodeURIComponent(activationId)}`;
      const res =
        action === "remove"
          ? await fetch(url, { method: "DELETE" })
          : await fetch(url, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });
      const j = await res.json();
      if (!res.ok) {
        notify("err", j.error || "Action failed.");
        return;
      }
      notify(
        "ok",
        action === "deactivate"
          ? "Bot paused in this server."
          : action === "reactivate"
            ? "Bot reactivated!"
            : "Activation removed permanently."
      );
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function saveAnnouncementChannel(
    activationId: string,
    channelId: string
  ) {
    setBusyId(`ch-${activationId}`);
    try {
      const res = await fetch(
        `/api/servers/${guildId}/bots/${encodeURIComponent(activationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_announcement_channel",
            channel_id: channelId || null,
          }),
        }
      );
      const j = await res.json();
      if (!res.ok) {
        notify("err", j.error || "Could not update announcement channel.");
        return;
      }
      notify("ok", "Announcement channel updated.");
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Quick banner if user has ready keys waiting to redeem */}
      {data.readyKeys.length > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="text-xs text-emerald-100">
              You have{" "}
              <strong>{data.readyKeys.length} approved activation key(s)</strong>{" "}
              ready to redeem in Discord!
            </div>
          </div>
          <Link
            href={`/dashboard/servers/${guildId}/keys`}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 sm:self-center"
          >
            View Keys
          </Link>
        </div>
      )}

      {/* Licensed / Active Bots */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">
              Licensed SSE Bots ({activeBots.length})
            </h2>
            <p className="text-xs text-slate-400">
              Manage active or paused SSE bots and configure announcement
              channels.
            </p>
          </div>
          <Link
            href={`/dashboard/servers/${guildId}/request`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Add / Request More Bots
          </Link>
        </div>

        {activeBots.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center">
            <Bot className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <h3 className="text-base font-bold text-white">
              No licensed bots active in this server yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
              Request a Single, Bundle, or Global activation key to unlock SSE
              bots for {data.guild.name}.
            </p>
            <Link
              href={`/dashboard/servers/${guildId}/request`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              Request Bot Activation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeBots.map((bot) => {
              const isPaused = bot.state === "inactive";
              return (
                <div
                  key={bot.activation_id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                    isPaused
                      ? "border-amber-500/35 bg-slate-900/40"
                      : "border-emerald-500/35 bg-slate-900/70"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            {bot.name}
                          </h3>
                          {isPaused ? (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                              PAUSED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              ACTIVE
                            </span>
                          )}
                          {bot.maintenance_mode && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                              <Wrench className="h-3 w-3" />
                              Maintenance
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {bot.description}
                        </p>
                      </div>

                      <a
                        href={bot.invite_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:border-indigo-500 hover:text-white"
                      >
                        Invite Bot
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Announcement Channel Selector */}
                    <div className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-3">
                      <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                        Service Announcement Channel
                      </label>
                      <select
                        disabled={busyId === `ch-${bot.activation_id}`}
                        value={bot.announcement_channel_id || ""}
                        onChange={(e) =>
                          saveAnnouncementChannel(
                            bot.activation_id,
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">No announcement channel selected</option>
                        {data.channels.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            #{ch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Owner Lifecycle Controls */}
                  {data.guild.isOwner && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
                      {isPaused ? (
                        <button
                          type="button"
                          disabled={busyId === bot.activation_id}
                          onClick={() =>
                            controlBot(bot.activation_id, "reactivate")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === bot.activation_id}
                          onClick={() =>
                            controlBot(bot.activation_id, "deactivate")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Pause Bot
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === bot.activation_id}
                        onClick={() => controlBot(bot.activation_id, "remove")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove License
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Free / No-Key Bots */}
      {freeBots.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-white">
              Free SSE Bots (No Activation Key Required)
            </h2>
            <p className="text-xs text-slate-400">
              These bots work immediately once invited to your server.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {freeBots.map((bot) => (
              <div
                key={bot.activation_id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{bot.name}</span>
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                      FREE
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {bot.description}
                  </p>
                </div>
                <a
                  href={bot.invite_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
                >
                  Invite
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
