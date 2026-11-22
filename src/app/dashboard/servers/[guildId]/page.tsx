"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface ReadyKey {
  key_id: string;
  request_id: string | null;
  key_scope: "single" | "bundle" | "global";
  bot_activation_ids: string[];
  bot_names: string[];
  plaintext_key: string | null;
  created_at: string;
  expires_at: string | null;
}

interface BotItem {
  activation_id: string;
  name: string;
  discord_bot_id: string;
  description: string;
  invite_url: string;
  activation_required: boolean;
  maintenance_mode: boolean;
  heartbeat_status: string;
  state:
    | "active"
    | "inactive"
    | "revoked"
    | "approved_key_ready"
    | "pending"
    | "free"
    | "available";
  activated_at: string | null;
  announcement_channel_id: string | null;
  ready_key: ReadyKey | null;
}

interface ServerPayload {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    isOwner: boolean;
    nexusPresent: boolean;
  };
  user: {
    discordId: string;
    isBlacklisted: boolean;
    isStaff: boolean;
  };
  globalActivation: {
    totalActivationBots: number;
    activeCount: number;
    allActive: boolean;
    hasPendingGlobal: boolean;
    hasReadyGlobalKey: boolean;
  };
  readyKeys: ReadyKey[];
  bots: BotItem[];
  pendingRequests: Array<{
    _id: string;
    key_scope?: string;
    bot_name: string;
    bot_names?: string[];
    created_at: string;
  }>;
  recentRequests: Array<{
    _id: string;
    key_scope?: string;
    bot_name: string;
    status: string;
    rejection_reason?: string;
    created_at: string;
  }>;
  channels: Array<{ id: string; name: string }>;
}

export default function ServerManagePage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const [data, setData] = useState<ServerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/servers/${guildId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not load server.");
        return;
      }
      setData(json);
    } catch {
      setError("Network error while loading server details.");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    load();
  }, [load]);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  }

  async function submitRequest(
    scope: "single" | "bundle" | "global",
    botIds?: string[]
  ) {
    setBusyId(scope === "single" ? botIds?.[0] || "single" : scope);
    try {
      const res = await fetch(`/api/servers/${guildId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, bot_activation_ids: botIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error || "Failed to submit activation request.");
        return;
      }
      setSelectedBundle([]);
      notify("ok", "Activation request submitted! Status is now Pending Approval.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancelRequest(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch(
        `/api/servers/${guildId}/requests?requestId=${encodeURIComponent(requestId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error || "Could not cancel request.");
        return;
      }
      notify("ok", "Pending request cancelled.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function botAction(
    activationId: string,
    action: "deactivate" | "reactivate" | "remove" | "set_announcement_channel",
    channelId?: string | null
  ) {
    setBusyId(activationId);
    try {
      const res =
        action === "remove"
          ? await fetch(`/api/servers/${guildId}/bots/${activationId}`, {
              method: "DELETE",
            })
          : await fetch(`/api/servers/${guildId}/bots/${activationId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, channel_id: channelId ?? null }),
            });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error || "Action failed.");
        return;
      }
      notify("ok", "Server bot settings updated.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function toggleBundleSelect(activationId: string) {
    setSelectedBundle((prev) =>
      prev.includes(activationId)
        ? prev.filter((id) => id !== activationId)
        : [...prev, activationId]
    );
  }

  if (loading && !data) {
    return <div className="py-20 text-center text-slate-400">Loading server dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <p className="text-rose-200">{error || "Server not found."}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Servers
        </Link>
      </div>
    );
  }

  const activeBots = data.bots.filter((b) => b.state === "active");
  const inactiveBots = data.bots.filter((b) => b.state === "inactive");
  const pendingOrReadyBots = data.bots.filter(
    (b) => b.state === "pending" || b.state === "approved_key_ready"
  );
  const availableActivationBots = data.bots.filter(
    (b) => b.state === "available" || b.state === "revoked"
  );
  const freeBots = data.bots.filter((b) => b.state === "free");

  const canRequest = data.guild.isOwner && !data.user.isBlacklisted && data.guild.nexusPresent;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Servers
          </Link>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {data.guild.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono">ID: {data.guild.id}</span>
            <span>·</span>
            <span className={data.guild.isOwner ? "text-emerald-400" : "text-amber-300"}>
              {data.guild.isOwner
                ? "Verified Server Owner"
                : "Server Manager (Owner required to request keys)"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync Status
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Approved Keys Ready to Redeem */}
      {data.readyKeys.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-slate-900 p-6">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              Approved Activation Keys Ready to Use
            </h2>
          </div>
          <p className="mt-1 text-sm text-emerald-200/80">
            Your request has been approved! Copy your key below and run{" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 text-emerald-300">
              /activation
            </code>{" "}
            inside <strong>{data.guild.name}</strong>. Once redeemed, the bot(s)
            automatically move into Active Bots.
          </p>

          <div className="mt-4 space-y-3">
            {data.readyKeys.map((rk) => (
              <div
                key={rk.key_id}
                className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-300">
                      {rk.key_scope} key
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {rk.bot_names.join(", ")}
                    </span>
                  </div>
                  {rk.expires_at && (
                    <span className="text-xs text-slate-400">
                      Expires {new Date(rk.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {rk.plaintext_key ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <code className="block overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-300">
                      {rk.plaintext_key}
                    </code>
                    <div className="flex shrink-0 gap-2">
                      <CopyButton value={rk.plaintext_key} label="Copy Key" />
                      <CopyButton
                        value={`/activation key:${rk.plaintext_key}`}
                        label="Copy Command"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-300">
                    {data.guild.isOwner
                      ? "This key was issued directly in Discord DM (not stored on web). Check your Discord DMs from SSE Bots Hub."
                      : "Only the actual Discord server owner can view the plaintext key."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Global Activation Banner */}
      {data.globalActivation.totalActivationBots > 0 && (
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-violet-950/40 p-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Global Activation (1 Key for All Bots)
            </div>
            <h2 className="text-lg font-bold text-white">
              Unlock all {data.globalActivation.totalActivationBots} SSE bots with
              a single Global Key
            </h2>
            <p className="text-sm text-slate-300">
              Currently active in this server:{" "}
              <strong>
                {data.globalActivation.activeCount} /{" "}
                {data.globalActivation.totalActivationBots}
              </strong>
              . A Global Key activates every activation-required SSE bot in{" "}
              {data.guild.name} in one go.
            </p>
          </div>
          <div className="shrink-0">
            {data.globalActivation.allActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                All Bots Active
              </span>
            ) : data.globalActivation.hasReadyGlobalKey ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                <KeyRound className="h-4 w-4" />
                Global Key Ready Above
              </span>
            ) : data.globalActivation.hasPendingGlobal ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-300">
                <Clock className="h-4 w-4" />
                Pending Global Approval
              </span>
            ) : (
              <button
                type="button"
                disabled={!canRequest || busyId === "global"}
                onClick={() => submitRequest("global")}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === "global"
                  ? "Submitting..."
                  : "Request Global Key"}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Active Bots Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Active Bots ({activeBots.length})
          </h2>
        </div>

        {activeBots.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
            No bots are activated in this server yet. Request activation for a
            bot below or redeem an approved key.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeBots.map((bot) => (
              <div
                key={bot.activation_id}
                className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{bot.name}</h3>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        ACTIVE
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{bot.description}</p>
                  </div>
                  <a
                    href={bot.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Invite <ExternalLink className="inline h-3 w-3" />
                  </a>
                </div>

                {/* Per-bot announcement channel selector */}
                {data.channels.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <label className="text-xs text-slate-400">
                      Announcement Channel:
                    </label>
                    <select
                      value={bot.announcement_channel_id || ""}
                      onChange={(e) =>
                        botAction(
                          bot.activation_id,
                          "set_announcement_channel",
                          e.target.value || null
                        )
                      }
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <option value="">Not configured</option>
                      {data.channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {data.guild.isOwner && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === bot.activation_id}
                      onClick={() => botAction(bot.activation_id, "deactivate")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
                    >
                      <PauseCircle className="h-3.5 w-3.5" />
                      Deactivate Temporarily
                    </button>
                    <button
                      type="button"
                      disabled={busyId === bot.activation_id}
                      onClick={() => {
                        if (
                          confirm(
                            `Permanently remove ${bot.name} activation from this server? You will need a new key to reactivate.`
                          )
                        ) {
                          botAction(bot.activation_id, "remove");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove License
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Inactive (Temporarily Deactivated) Bots */}
      {inactiveBots.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200">
            Paused / Inactive Bots ({inactiveBots.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inactiveBots.map((bot) => (
              <div
                key={bot.activation_id}
                className="flex items-center justify-between rounded-2xl border border-amber-500/25 bg-slate-900/50 p-4"
              >
                <div>
                  <div className="font-semibold text-white">{bot.name}</div>
                  <div className="text-xs text-amber-300">
                    Temporarily deactivated
                  </div>
                </div>
                {data.guild.isOwner && (
                  <button
                    type="button"
                    disabled={busyId === bot.activation_id}
                    onClick={() => botAction(bot.activation_id, "reactivate")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Reactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      {data.pendingRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-amber-300">
            Pending Approval ({data.pendingRequests.length})
          </h2>
          <div className="space-y-2.5">
            {data.pendingRequests.map((req) => (
              <div
                key={req._id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-white">
                      {req.bot_name}
                    </span>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                      {req.key_scope || "single"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    Request ID: {req._id} · Submitted{" "}
                    {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === req._id}
                  onClick={() => cancelRequest(req._id)}
                  className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-rose-500/40 hover:text-rose-300"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Bots (Single or Selected Bundle Request) */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              Available Bots for Activation ({availableActivationBots.length + pendingOrReadyBots.length})
            </h2>
            <p className="text-xs text-slate-400">
              Request a single bot key, or select 2+ bots to request one Bundle
              Key covering all selected bots.
            </p>
          </div>
          {selectedBundle.length >= 2 && canRequest && (
            <button
              type="button"
              disabled={busyId === "bundle"}
              onClick={() => submitRequest("bundle", selectedBundle)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-500"
            >
              <Layers className="h-4 w-4" />
              {busyId === "bundle"
                ? "Submitting..."
                : `Request Single Bundle Key (${selectedBundle.length} Bots)`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...pendingOrReadyBots, ...availableActivationBots].map((bot) => {
            const isChecked = selectedBundle.includes(bot.activation_id);
            const selectable = bot.state === "available" || bot.state === "revoked";
            return (
              <div
                key={bot.activation_id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  isChecked
                    ? "border-violet-500 bg-violet-950/20"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {selectable && canRequest && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBundleSelect(bot.activation_id)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-500"
                          title="Select for Bundle Key"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{bot.name}</h3>
                        <span className="font-mono text-[11px] text-slate-500">
                          {bot.activation_id}
                        </span>
                      </div>
                    </div>
                    <Bot className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{bot.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
                  <a
                    href={bot.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Invite Bot
                  </a>

                  {bot.state === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
                      <Clock className="h-3.5 w-3.5" />
                      Pending Approval
                    </span>
                  ) : bot.state === "approved_key_ready" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      <KeyRound className="h-3.5 w-3.5" />
                      Key Ready Above
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canRequest || busyId === bot.activation_id}
                      onClick={() => submitRequest("single", [bot.activation_id])}
                      className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === bot.activation_id
                        ? "Requesting..."
                        : "Request Activation"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Free Bots (No Activation Required) */}
      {freeBots.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200">
            Free SSE Bots (No Activation Needed)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {freeBots.map((bot) => (
              <div
                key={bot.activation_id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <div className="font-medium text-white">{bot.name}</div>
                  <div className="text-xs text-emerald-400">Ready to invite</div>
                </div>
                <a
                  href={bot.invite_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Invite
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Request History */}
      {data.recentRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200">Request History</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Bot / Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Note / Reason</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {data.recentRequests.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 font-medium text-white">
                      {r.bot_name}
                    </td>
                    <td className="px-4 py-3 uppercase">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          r.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : r.status === "rejected"
                              ? "bg-rose-500/15 text-rose-300"
                              : r.status === "pending"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {r.rejection_reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!data.guild.isOwner && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You are viewing this server as a Manager. Only the actual Discord
          server owner can submit activation requests or view approved keys.
        </div>
      )}
    </div>
  );
}
