"use client";

import { ExternalLink, Globe } from "lucide-react";

const ACCOUNTS_URL = (
  process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL || "https://sse-account.vercel.app"
).replace(/\/+$/, "");

export default function AdminOAuthMovedPage() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
        <Globe className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-white">
        SSO / OAuth Apps Moved to SSE Accounts
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
        OAuth 2.1 / OIDC client applications (including SSE Nexus, SSE
        Tournament Web, and future portals) are now managed centrally inside{" "}
        <strong>SSE Accounts</strong>.
      </p>
      <a
        href={`${ACCOUNTS_URL}/admin/oauth-clients`}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Open SSE Accounts OAuth Manager
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
