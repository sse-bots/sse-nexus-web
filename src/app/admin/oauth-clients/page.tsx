"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Plus, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface OAuthClientRow {
  clientId: string;
  name?: string;
  redirectUris?: string[];
  scopes?: string[];
  skipConsent?: boolean;
  createdAt?: string;
}

export default function AdminOAuthClientsPage() {
  const [clients, setClients] = useState<OAuthClientRow[]>([]);
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("http://localhost:3001/api/auth/oauth2/callback/sse");
  const [skipConsent, setSkipConsent] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    client_id: string;
    client_secret?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/oauth-clients", { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      setClients(j.clients || []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedCreds(null);
    const uris = redirectUris
      .split(/\s*,\s*|
+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/admin/oauth-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        redirect_uris: uris,
        scopes: [
          "openid",
          "profile",
          "email",
          "offline_access",
          "sse:servers",
          "sse:activations",
        ],
        skip_consent: skipConsent,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Could not register client.");
      return;
    }
    setCreatedCreds({
      client_id: j.client?.client_id || j.client?.clientId || "",
      client_secret: j.client?.client_secret || j.client?.clientSecret,
    });
    setName("");
    await load();
  }

  async function deleteClient(clientId: string) {
    if (!confirm("Delete this OAuth client app? External logins using it will stop working.")) {
      return;
    }
    await fetch(`/api/admin/oauth-clients?clientId=${encodeURIComponent(clientId)}`, {
      method: "DELETE",
    });
    await load();
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://hub.sse-world.com";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          SSO / OAuth 2.1 Provider Client Apps
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Register your other SSE websites (e.g. SSE Store, Tournament Portal)
          so users can sign in everywhere with their single SSE Profile.
        </p>
      </div>

      {createdCreds && (
        <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs">
          <div className="font-semibold text-emerald-300">
            OAuth Client Registered (save the client_secret now — it will not be
            shown again):
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Client ID:</span>
            <code className="rounded bg-slate-950 px-2 py-1 text-emerald-200">
              {createdCreds.client_id}
            </code>
            <CopyButton value={createdCreds.client_id} />
          </div>
          {createdCreds.client_secret && (
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Client Secret:</span>
              <code className="rounded bg-slate-950 px-2 py-1 text-amber-200">
                {createdCreds.client_secret}
              </code>
              <CopyButton value={createdCreds.client_secret} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={createClient}
        className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="text-sm font-semibold text-white">
          Register External Website (OAuth 2.1 / OIDC Client)
        </div>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="App Name (e.g. SSE Official Store)"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
        />
        <textarea
          required
          rows={2}
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          placeholder="Allowed Redirect URIs (comma or newline separated)"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
        />
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={skipConsent}
            onChange={(e) => setSkipConsent(e.target.checked)}
            className="h-4 w-4 accent-indigo-500"
          />
          Trusted First-Party SSE Website (skip consent screen)
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Register OAuth Client
        </button>
      </form>

      <div className="space-y-3">
        {clients.map((c) => (
          <div
            key={c.clientId}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-400" />
                <span className="font-semibold text-white">
                  {c.name || c.clientId}
                </span>
                {c.skipConsent && (
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    Trusted 1st-Party
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-400">
                client_id: {c.clientId}
              </div>
              {c.redirectUris && (
                <div className="mt-1 text-xs text-slate-500">
                  Redirects: {c.redirectUris.join(", ")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteClient(c.clientId)}
              className="inline-flex items-center gap-1 self-start rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Discovery Endpoints & Integration Reference */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-xs text-slate-300">
        <div className="font-semibold text-white">
          OIDC / OAuth 2.1 Discovery Endpoints (for other SSE websites)
        </div>
        <div className="mt-2 space-y-1 font-mono text-[11px] text-indigo-300">
          <div>OpenID Config: {origin}/.well-known/openid-configuration</div>
          <div>OAuth Metadata: {origin}/.well-known/oauth-authorization-server</div>
          <div>Authorize URL: {origin}/api/auth/oauth2/authorize</div>
          <div>Token URL: {origin}/api/auth/oauth2/token</div>
          <div>UserInfo URL: {origin}/api/auth/oauth2/userinfo</div>
        </div>
      </div>
    </div>
  );
}
