"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Save, Shield } from "lucide-react";
import { DiscordCombobox, ComboboxOption } from "@/components/DiscordCombobox";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  categoryName: string | null;
}

function intToHexColor(color: number): string | null {
  if (!color) return null;
  return `#${color.toString(16).padStart(6, "0")}`;
}

const MULTI_ROLE_FIELDS = [
  {
    key: "member_role_ids",
    label: "Portal Access Roles (Members)",
    desc: "Users MUST be in the Support Server AND hold at least one of these roles to access SSE Nexus. Leave empty to allow any Support Server member.",
  },
  {
    key: "moderator_role_ids",
    label: "Moderators",
    desc: "Can review activation requests and manage server licenses in Hub & Web Admin.",
  },
  {
    key: "manager_role_ids",
    label: "Managers",
    desc: "Stored as the manager role group for SSE Hub integrations.",
  },
  {
    key: "approval_role_ids",
    label: "Approvers",
    desc: "Stored as the approval group for Hub integrations.",
  },
  {
    key: "notification_role_ids",
    label: "Notifications",
    desc: "Roles available for SSE notification mentions.",
  },
  {
    key: "blacklisted_role_ids",
    label: "Blacklisted Roles",
    desc: "Members holding any of these roles are blocked from submitting activation requests.",
  },
];

const CHANNEL_FIELDS = [
  {
    key: "logs_channel_id",
    label: "Audit Logs Channel",
    desc: "Receives security, setup, activation, and administrative audit events.",
  },
  {
    key: "pending_channel_id",
    label: "Pending Applications Channel",
    desc: "Displays new activation requests awaiting staff review.",
  },
  {
    key: "approved_channel_id",
    label: "Approved Applications Channel",
    desc: "Displays activation applications that have been approved.",
  },
  {
    key: "rejected_channel_id",
    label: "Rejected Applications Channel",
    desc: "Displays activation applications that have been rejected.",
  },
  {
    key: "list_channel_id",
    label: "Public Bot Directory Channel",
    desc: "Shows the public interactive SSE bot directory.",
  },
  {
    key: "announcement_log_channel_id",
    label: "Announcement Logs Channel",
    desc: "Records announcements broadcast through SSE Nexus.",
  },
  {
    key: "status_board_channel_id",
    label: "Live Status Board Channel",
    desc: "Displays auto-refreshing SSE bot status.",
  },
];

export default function AdminSettingsPage() {
  const [guildName, setGuildName] = useState<string | null>(null);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = forceRefresh
        ? "/api/admin/settings?refresh=1"
        : "/api/admin/settings";
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not load Hub settings.");
        return;
      }
      setGuildName(j.supportGuildName || null);
      setRoles(j.roles || []);
      setChannels(j.channels || []);
      setSettings(j.settings || {});
      setLogs(j.logs || []);
    } catch {
      setError("Network error while loading support server roles & channels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const roleOptions: ComboboxOption[] = useMemo(
    () =>
      roles.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.managed ? "Managed / Bot Role" : null,
        colorHex: intToHexColor(r.color),
      })),
    [roles]
  );

  const channelOptions: ComboboxOption[] = useMemo(
    () =>
      channels.map((ch) => ({
        id: ch.id,
        label: ch.name,
        sublabel: ch.categoryName
          ? `Category: ${ch.categoryName}`
          : "No Category",
      })),
    [channels]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed to save settings.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  }

  if (loading && roles.length === 0 && !error) {
    return (
      <div className="py-12 text-center text-slate-400">
        Fetching roles &amp; channels from Support Server...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Shield className="h-3.5 w-3.5" />
            Owner Only
          </div>
          <h1 className="text-2xl font-bold text-white">
            Hub Settings &amp; Audit Logs
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Synced live from{" "}
            <strong className="text-slate-200">
              {guildName || "SSE Support Server"}
            </strong>{" "}
            ({roles.length} roles · {channels.length} text channels).
          </p>
        </div>

        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Roles &amp; Channels
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div>
            <h2 className="text-sm font-bold text-white">
              Support Server Roles
            </h2>
            <p className="text-xs text-slate-400">
              Pick one or multiple roles directly from Discord without copying
              role IDs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MULTI_ROLE_FIELDS.map((field) => (
              <DiscordCombobox
                key={field.key}
                multiple
                kind="role"
                label={field.label}
                description={field.desc}
                options={roleOptions}
                value={
                  Array.isArray(settings[field.key])
                    ? (settings[field.key] as string[])
                    : []
                }
                onChange={(next) =>
                  setSettings((prev) => ({ ...prev, [field.key]: next }))
                }
              />
            ))}

            <DiscordCombobox
              multiple={false}
              kind="role"
              label="Licensed Owner Role"
              description="Automatically assigned to applicants when their activation request is approved."
              options={roleOptions}
              value={
                typeof settings.licensed_owner_role_id === "string"
                  ? settings.licensed_owner_role_id
                  : null
              }
              onChange={(next) =>
                setSettings((prev) => ({
                  ...prev,
                  licensed_owner_role_id: next,
                }))
              }
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div>
            <h2 className="text-sm font-bold text-white">
              Support Server Channels
            </h2>
            <p className="text-xs text-slate-400">
              Select text channels for audit logs, request review cards,
              directory, and live status board.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {CHANNEL_FIELDS.map((field) => (
              <DiscordCombobox
                key={field.key}
                multiple={false}
                kind="channel"
                label={field.label}
                description={field.desc}
                options={channelOptions}
                value={
                  typeof settings[field.key] === "string"
                    ? (settings[field.key] as string)
                    : null
                }
                onChange={(next) =>
                  setSettings((prev) => ({ ...prev, [field.key]: next }))
                }
              />
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Support Server Settings"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved to MongoDB.
            </span>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">Recent Activation Logs</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Bot / Scope</th>
                <th className="px-4 py-2.5">Server</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {logs.map((l, idx) => (
                <tr key={String(l._id || idx)}>
                  <td className="px-4 py-2.5 font-mono text-indigo-300">
                    {String(l.event || "-")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {String(l.bot_activation_id || "-")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    {String(l.guild_id || "-")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    {String(l.user_id || l.performed_by || "-")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {l.created_at
                      ? new Date(String(l.created_at)).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
