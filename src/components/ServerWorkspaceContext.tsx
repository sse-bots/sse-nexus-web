"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bot,
  Clock,
  Crown,
  ExternalLink,
  KeyRound,
  Layers,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { SupportGateCard } from "@/components/SupportGateCard";

export interface ReadyKey {
  key_id: string;
  request_id: string | null;
  key_scope: "single" | "bundle" | "global";
  bot_activation_ids: string[];
  bot_names: string[];
  plaintext_key: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface BotItem {
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
  deactivated_at: string | null;
  expires_at: string | null;
  key_scope: string | null;
  announcement_channel_id: string | null;
  ready_key: ReadyKey | null;
}

export interface ServerPayload {
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
    requester_note?: string;
    created_at: string;
  }>;
  recentRequests: Array<{
    _id: string;
    key_scope?: string;
    bot_name: string;
    status: string;
    rejection_reason?: string;
    approval_reason?: string;
    created_at: string;
  }>;
  recentLogs: Array<{
    _id: string;
    event: string;
    bot_activation_id?: string;
    user_id?: string;
    created_at: string;
  }>;
  channels: Array<{ id: string; name: string }>;
}

interface WorkspaceContextValue {
  guildId: string;
  data: ServerPayload;
  refreshing: boolean;
  reload: () => Promise<void>;
  notify: (type: "ok" | "err", text: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useServerWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useServerWorkspace must be used inside ServerWorkspaceProvider");
  }
  return ctx;
}

function guildIcon(id: string, icon: string | null) {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=128`;
}

export function ServerWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ guildId: string }>();
  const pathname = usePathname();
  const guildId = params.guildId;

  const [data, setData] = useState<ServerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateReason, setGateReason] = useState<
    "discord_not_linked" | "not_in_server" | "missing_member_role" | null
  >(null);
  const [supportInvite, setSupportInvite] = useState("");
  const [accountsUrl, setAccountsUrl] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const notify = useCallback((type: "ok" | "err", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/servers/${guildId}`, {
          cache: "no-store",
        });
        const j = await res.json();
        if (res.status === 403 && j.portalBlockReason) {
          setGateReason(j.portalBlockReason);
          setSupportInvite(j.supportInviteUrl || "");
          setAccountsUrl(j.accountsUrl || "");
          return;
        }
        setGateReason(null);
        if (!res.ok) {
          setError(j.error || "Failed to load server details.");
          return;
        }
        setData(j);
      } catch {
        setError("Network error while loading server details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guildId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  if (gateReason) {
    return (
      <SupportGateCard
        reason={gateReason}
        inviteUrl={supportInvite}
        accountsUrl={accountsUrl}
        onRetry={() => load(false)}
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-900/80" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-900/60" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-52 animate-pulse rounded-2xl bg-slate-900/60" />
          <div className="h-52 animate-pulse rounded-2xl bg-slate-900/60" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-rose-500/35 bg-rose-500/10 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-400" />
        <h1 className="text-lg font-bold text-white">
          Could Not Open Server Workspace
        </h1>
        <p className="mt-2 text-sm text-rose-200">
          {error || "Server not found or access denied."}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Servers
        </Link>
      </div>
    );
  }

  const base = `/dashboard/servers/${guildId}`;
  const activeCount = data.bots.filter(
    (b) => b.state === "active" || b.state === "inactive" || b.state === "free"
  ).length;
  const readyKeysCount = data.readyKeys.length;
  const pendingCount = data.pendingRequests.length;
  const historyCount = data.recentRequests.length + data.recentLogs.length;

  const tabs = [
    {
      href: base,
      label: "Active Bots",
      icon: Bot,
      badge: activeCount,
      badgeTone: "emerald",
      exact: true,
    },
    {
      href: `${base}/request`,
      label: "Request Activation",
      icon: Sparkles,
      badge: null,
      badgeTone: "indigo",
      exact: false,
    },
    {
      href: `${base}/keys`,
      label: "Activation Keys",
      icon: KeyRound,
      badge: readyKeysCount,
      badgeTone: "emerald",
      exact: false,
    },
    {
      href: `${base}/pending`,
      label: "Pending",
      icon: Clock,
      badge: pendingCount,
      badgeTone: "amber",
      exact: false,
    },
    {
      href: `${base}/history`,
      label: "Activity & Logs",
      icon: Activity,
      badge: historyCount > 0 ? historyCount : null,
      badgeTone: "slate",
      exact: false,
    },
  ];

  const img = guildIcon(data.guild.id, data.guild.icon);

  return (
    <WorkspaceContext.Provider
      value={{
        guildId,
        data,
        refreshing,
        reload: () => load(true),
        notify,
      }}
    >
      <div className="space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Discord Servers
          </Link>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Sync Status
          </button>
        </div>

        {/* Premium Server Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-[#0d1220] to-indigo-950/35 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 p-0.5 sm:h-20 sm:w-20 ${
                  data.guild.nexusPresent
                    ? "border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.3)]"
                    : "border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.3)]"
                }`}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={data.guild.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-lg font-extrabold text-white">
                    {data.guild.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-extrabold text-white sm:text-2xl">
                    {data.guild.name}
                  </h1>
                  {data.guild.isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                      <Crown className="h-3 w-3" />
                      Server Owner
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                      Server Manager
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      data.guild.nexusPresent
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        data.guild.nexusPresent ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    {data.guild.nexusPresent ? "Nexus Connected" : "Nexus Missing"}
                  </span>
                </div>

                <p className="mt-1 font-mono text-xs text-slate-400">
                  Server ID: {data.guild.id} · Licensed Bots:{" "}
                  <strong className="text-slate-200">
                    {data.globalActivation.activeCount}/
                    {data.globalActivation.totalActivationBots}
                  </strong>
                </p>
              </div>
            </div>

            {!data.guild.nexusPresent && process.env.NEXT_PUBLIC_NEXUS_INVITE_URL && (
              <a
                href={`${process.env.NEXT_PUBLIC_NEXUS_INVITE_URL}&guild_id=${data.guild.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 sm:self-center"
              >
                Add SSE Nexus First
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Alerts */}
          {data.user.isBlacklisted && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>
                <strong>Activation Requests Restricted:</strong> Your account
                holds a blacklisted role in the SSE Support Server.
              </span>
            </div>
          )}

          {!data.guild.isOwner && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              You have <strong>Manage Server</strong> permission, so you can
              view bot statuses and set announcement channels. Only the{" "}
              <strong>actual Discord Server Owner</strong> can submit activation
              requests, view decrypted keys, or pause/remove bots.
            </div>
          )}
        </div>

        {/* Dedicated Sub-Page Navigation Bar */}
        <nav
          aria-label="Server Workspace Tabs"
          className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-900/70 p-1.5 backdrop-blur-md"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            const badgeClasses =
              tab.badgeTone === "emerald"
                ? "bg-emerald-500/20 text-emerald-300"
                : tab.badgeTone === "amber"
                  ? "bg-amber-500/20 text-amber-300"
                  : tab.badgeTone === "indigo"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-slate-800 text-slate-300";

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : badgeClasses
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Global Floating Toast */}
        {toast && (
          <div
            className={`rounded-2xl border p-4 text-xs font-medium shadow-lg ${
              toast.type === "ok"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/15 text-rose-200"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Active Sub-Page Content */}
        <div>{children}</div>
      </div>
    </WorkspaceContext.Provider>
  );
}
