"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Globe,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  ShieldOff,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

const AVAILABLE_SCOPES = [
  { id: "openid", label: "openid" },
  { id: "profile", label: "profile" },
  { id: "email", label: "email" },
  { id: "offline_access", label: "offline_access" },
  { id: "sse:servers", label: "sse:servers" },
  { id: "sse:activations", label: "sse:activations" },
];

interface OAuthClientRow {
  clientId: string;
  name?: string;
  uri?: string | null;
  icon?: string | null;
  redirectUris?: string[];
  scopes?: string[];
  skipConsent?: boolean;
  public?: boolean;
  authorizedUserCount?: number;
  createdAt?: string;
}

export default function AdminOAuthClientsPage() {
  const [clients, setClients] = useState<OAuthClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [icon, setIcon] = useState("");
  const [redirectUris, setRedirectUris] = useState(
    "https://your-app.vercel.app/api/auth/oauth2/callback/sse"
  );
  const [scopes, setScopes] = useState<string[]>([
    "openid",
    "profile",
    "email",
    "offline_access",
    "sse:servers",
    "sse:activations",
  ]);
  const [skipConsent, setSkipConsent] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUri, setEditUri] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editRedirects, setEditRedirects] = useState("");
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editSkipConsent, setEditSkipConsent] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Secret banner & status
  const [secretBanner, setSecretBanner] = useState<{
    title: string;
    client_id: string;
    client_secret?: string;
  } | null>(null);
  const [busyClient, setBusyClient] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/oauth-clients", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setClients(j.clients || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleScope(list: string[], setList: (next: string[]) => void, id: string) {
    if (list.includes(id)) {
      if (list.length === 1) return;
      setList(list.filter((s) => s !== id));
    } else {
      setList([...list, id]);
    }
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSecretBanner(null);
    const uris = redirectUris
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/admin/oauth-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        uri,
        icon,
        redirect_uris: uris,
        scopes,
        skip_consent: skipConsent,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Could not register client.");
      return;
    }
    setSecretBanner({
      title: `Registered "${name}"`,
      client_id: j.client?.client_id || j.client?.clientId || "",
      client_secret: j.client?.client_secret || j.client?.clientSecret,
    });
    setName("");
    setUri("");
    setIcon("");
    setShowCreate(false);
    await load();
  }

  function startEdit(c: OAuthClientRow) {
    setEditingId(c.clientId);
    setEditName(c.name || "");
    setEditUri(c.uri || "");
    setEditIcon(c.icon || "");
    setEditRedirects((c.redirectUris || []).join("\n"));
    setEditScopes(
      c.scopes && c.scopes.length > 0
        ? c.scopes
        : ["openid", "profile", "email"]
    );
    setEditSkipConsent(Boolean(c.skipConsent));
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSavingEdit(true);
    setError(null);
    try {
      const uris = editRedirects
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/oauth-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editingId,
          name: editName,
          uri: editUri,
          icon: editIcon,
          redirect_uris: uris,
          scopes: editScopes,
          skip_consent: editSkipConsent,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed to update OAuth client.");
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function rotateSecret(c: OAuthClientRow) {
    if (
      !confirm(
        `Generate a new Client Secret for "${c.name || c.clientId}"?\n\nThe old secret will stop working immediately.`
      )
    ) {
      return;
    }
    setBusyClient(c.clientId);
    setError(null);
    try {
      const res = await fetch("/api/admin/oauth-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: c.clientId,
          rotate_secret: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not rotate secret.");
        return;
      }
      setSecretBanner({
        title: `New Secret Generated for "${c.name || c.clientId}"`,
        client_id: j.client_id,
        client_secret: j.client_secret,
      });
    } finally {
      setBusyClient(null);
    }
  }

  async function revokeConsents(c: OAuthClientRow) {
    if (
      !confirm(
        `Revoke all user sessions/consents for "${c.name || c.clientId}"? Users will have to authorize it again on next sign-in.`
      )
    ) {
      return;
    }
    setBusyClient(c.clientId);
    try {
      await fetch("/api/admin/oauth-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: c.clientId,
          revoke_all_consents: true,
        }),
      });
      await load();
    } finally {
      setBusyClient(null);
    }
  }

  async function deleteClient(c: OAuthClientRow) {
    if (
      !confirm(
        `Permanently delete "${c.name || c.clientId}"? External logins using it will stop working immediately.`
      )
    ) {
      return;
    }
    await fetch(
      `/api/admin/oauth-clients?clientId=${encodeURIComponent(c.clientId)}`,
      { method: "DELETE" }
    );
    if (editingId === c.clientId) setEditingId(null);
    await load();
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://sse-nexus.vercel.app";

  const envSnippet = secretBanner
    ? `SSE_CLIENT_ID=${secretBanner.client_id}\n${
        secretBanner.client_secret
          ? `SSE_CLIENT_SECRET=${secretBanner.client_secret}\n`
          : ""
      }SSE_ISSUER_URL=${origin}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            SSO / OAuth 2.1 Provider Apps
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage external SSE websites (e.g. SSE Tournament Web, SSE Store)
            using SSE Nexus as their identity provider.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Close Form" : "Register New OAuth App"}
        </button>
      </div>

      {/* One-time Secret & .env Copy Modal Banner */}
      {secretBanner && (
        <div className="space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-emerald-300">
                {secretBanner.title}
              </div>
              <p className="mt-0.5 text-emerald-200/80">
                Copy these credentials now—for security, the Client Secret is
                only hashed in MongoDB and cannot be viewed again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSecretBanner(null)}
              className="rounded-lg p-1 text-emerald-300 hover:bg-emerald-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-slate-950/80 px-3 py-2">
              <span className="truncate font-mono text-emerald-200">
                ID: {secretBanner.client_id}
              </span>
              <CopyButton value={secretBanner.client_id} />
            </div>
            {secretBanner.client_secret && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-slate-950/80 px-3 py-2">
                <span className="truncate font-mono text-amber-200">
                  Secret: {secretBanner.client_secret}
                </span>
                <CopyButton value={secretBanner.client_secret} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3">
            <pre className="overflow-x-auto font-mono text-[11px] text-slate-300">
              {envSnippet}
            </pre>
            <CopyButton value={envSnippet} label="Copy .env" />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Register New OAuth App Form */}
      {showCreate && (
        <form
          onSubmit={createClient}
          className="space-y-4 rounded-2xl border border-indigo-500/40 bg-slate-900/80 p-5"
        >
          <div className="text-sm font-bold text-white">
            Register External SSE Website
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Application Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SSE Tournament Portal"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Homepage URL (optional)
              </label>
              <input
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="https://sse-tournament.vercel.app"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Allowed Callback / Redirect URIs (one per line or comma-separated) *
            </label>
            <textarea
              required
              rows={2}
              value={redirectUris}
              onChange={(e) => setRedirectUris(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Allowed OAuth Scopes
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((s) => {
                const active = scopes.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleScope(scopes, setScopes, s.id)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs transition ${
                      active
                        ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={skipConsent}
              onChange={(e) => setSkipConsent(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Trusted First-Party SSE Website (skip user consent screen)
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create OAuth Client
          </button>
        </form>
      )}

      {/* Registered Apps List */}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading OAuth client apps...
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
          No external OAuth applications registered yet. Click{" "}
          <strong className="text-white">Register New OAuth App</strong> above
          to connect another SSE website.
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((c) => {
            const isEditing = editingId === c.clientId;
            return (
              <div
                key={c.clientId}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                {isEditing ? (
                  <form onSubmit={saveEdit} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        Editing {c.name || c.clientId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-300">
                          App Name
                        </label>
                        <input
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-300">
                          Homepage URL
                        </label>
                        <input
                          value={editUri}
                          onChange={(e) => setEditUri(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Redirect URIs (one per line)
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={editRedirects}
                        onChange={(e) => setEditRedirects(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">
                        Allowed Scopes
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_SCOPES.map((s) => {
                          const active = editScopes.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                toggleScope(editScopes, setEditScopes, s.id)
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs transition ${
                                active
                                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                                  : "border-slate-800 bg-slate-950 text-slate-400"
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editSkipConsent}
                        onChange={(e) => setEditSkipConsent(e.target.checked)}
                        className="h-4 w-4 accent-indigo-500"
                      />
                      Trusted First-Party SSE Website (skip consent screen)
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-400" />
                          <span className="text-base font-bold text-white">
                            {c.name || c.clientId}
                          </span>
                          {c.skipConsent && (
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Trusted 1st-Party
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                            <Users className="h-3 w-3 text-indigo-400" />
                            {c.authorizedUserCount ?? 0} linked users
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <code className="rounded bg-slate-950 px-2 py-0.5 font-mono text-xs text-slate-300">
                            {c.clientId}
                          </code>
                          <CopyButton value={c.clientId} />
                          {c.uri && (
                            <a
                              href={c.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-400 hover:underline"
                            >
                              {c.uri}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:text-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit Details
                        </button>
                        {!c.public && (
                          <button
                            type="button"
                            disabled={busyClient === c.clientId}
                            onClick={() => rotateSecret(c)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            New Secret
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyClient === c.clientId}
                          onClick={() => revokeConsents(c)}
                          title="Force all users to re-authorize this app"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-500/40 hover:text-amber-200 disabled:opacity-50"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Reset Consents
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClient(c)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-3 text-xs sm:grid-cols-2">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-slate-400">
                          Redirect URIs
                        </div>
                        <div className="space-y-1 font-mono text-[11px] text-slate-300">
                          {(c.redirectUris || []).map((u) => (
                            <div key={u} className="truncate">
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-slate-400">
                          Allowed Scopes
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(c.scopes || []).map((s) => (
                            <span
                              key={s}
                              className="rounded bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-indigo-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OIDC / OAuth 2.1 Discovery Endpoints */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-xs text-slate-300">
        <div className="mb-2 flex items-center gap-2 font-semibold text-white">
          <KeyRound className="h-4 w-4 text-indigo-400" />
          OIDC / OAuth 2.1 Discovery Endpoints (for other SSE websites)
        </div>
        <div className="space-y-1.5 font-mono text-[11px] text-indigo-300">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              OpenID Config: {origin}/.well-known/openid-configuration
            </span>
            <CopyButton value={`${origin}/.well-known/openid-configuration`} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              OAuth Metadata: {origin}/.well-known/oauth-authorization-server
            </span>
            <CopyButton
              value={`${origin}/.well-known/oauth-authorization-server`}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              Authorize URL: {origin}/api/auth/oauth2/authorize
            </span>
            <CopyButton value={`${origin}/api/auth/oauth2/authorize`} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              Token URL: {origin}/api/auth/oauth2/token
            </span>
            <CopyButton value={`${origin}/api/auth/oauth2/token`} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              UserInfo URL: {origin}/api/auth/oauth2/userinfo
            </span>
            <CopyButton value={`${origin}/api/auth/oauth2/userinfo`} />
          </div>
        </div>
      </div>
    </div>
  );
}
