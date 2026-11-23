"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, Shield } from "lucide-react";
import { signIn } from "@/lib/auth-client";

const ACCOUNTS_URL = (
  process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL || "https://sse-account.vercel.app"
).replace(/\/+$/, "");

function SignInInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  useEffect(() => {
    const err = searchParams.get("error");
    const desc = searchParams.get("error_description");
    if (err) {
      setError(desc || `Sign-in failed: ${err.replace(/_/g, " ")}`);
    }

    fetch("/api/me", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d?.user) {
          router.replace(safeNext);
        }
      })
      .finally(() => setChecking(false));
  }, [router, safeNext, searchParams]);

  async function handleSseSignIn() {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await signIn.social({
        provider: "sse",
        callbackURL: `${origin}${safeNext}`,
        errorCallbackURL: `${origin}/sign-in`,
      });
      if (res?.error) {
        setError(res.error.message || "Could not start SSE Accounts sign-in.");
        setLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start SSE Accounts sign-in."
      );
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Checking session...
      </div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/25">
            SSE
          </div>
          <h1 className="text-2xl font-bold text-white">
            Sign in to SSE Nexus
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use your central <strong>SSE Account</strong> to manage Discord
            servers, request bot activation keys, and monitor live bot status.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleSseSignIn}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          Continue with SSE Accounts
        </button>

        <div className="mt-4 text-center">
          <a
            href={`${ACCOUNTS_URL}/sign-up`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
          >
            Need an SSE Account? Create one on SSE Accounts
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-400">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
          <span>
            Authentication is powered centrally by{" "}
            <strong className="text-slate-200">SSE Accounts</strong> (OAuth
            2.1 / OIDC). Make sure your Discord account is linked in SSE
            Accounts Security so your servers appear automatically.
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">Loading...</div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
