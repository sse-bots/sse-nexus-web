"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Globe, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your SSE identity",
  profile: "Read your display name, avatar, and Discord ID",
  email: "Read your email address",
  offline_access: "Keep you signed in across sessions (refresh tokens)",
  "sse:servers": "View your Discord servers connected to SSE Hub",
  "sse:activations": "View your SSE bot activation status",
};

function ConsentInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id") || "";
  const rawScope = searchParams.get("scope") || "openid profile email";
  const scopes = rawScope.split(/\s+/).filter(Boolean);

  const [clientName, setClientName] = useState<string>(clientId || "External Application");
  const [submitting, setSubmitting] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    // Attempt to fetch public client metadata from Better Auth oauth2 endpoint
    fetch(`/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.name) setClientName(data.name);
      })
      .catch(() => {});
  }, [clientId]);

  async function handleDecision(accept: boolean) {
    setSubmitting(accept ? "accept" : "deny");
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oauth2 = (authClient as any).oauth2;
      if (!oauth2?.consent) {
        throw new Error("OAuth Provider client plugin is not initialized.");
      }
      const res = await oauth2.consent({ accept });
      if (res?.error) {
        setError(res.error.message || "Could not process authorization.");
        setSubmitting(null);
        return;
      }
      if (res?.data?.redirect && res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed.");
      setSubmitting(null);
    }
  }

  if (!clientId) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-bold text-white">Invalid OAuth Request</h1>
        <p className="mt-2 text-sm text-slate-400">
          This consent page can only be opened through an application&apos;s
          &ldquo;Sign in with SSE&rdquo; login link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-lg">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              SSE Single Sign-On
            </p>
            <h1 className="text-xl font-bold text-white">
              Authorize {clientName}
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300">
          <strong className="text-white">{clientName}</strong> wants to sign you
          in using your single SSE profile and requests the following
          permissions:
        </p>

        <ul className="mt-5 space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          {scopes.map((scope) => (
            <li key={scope} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <span className="font-mono text-xs text-indigo-300">{scope}</span>
                <p className="text-xs text-slate-400">
                  {SCOPE_LABELS[scope] || "Access requested scope"}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleDecision(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting === "deny" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            Deny
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleDecision(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
      <ConsentInner />
    </Suspense>
  );
}
