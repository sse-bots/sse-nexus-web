import { ExternalLink, Globe } from "lucide-react";
import { getPublicSseAccountsUrl } from "@/lib/sse-sso";

export default function OAuthConsentMovedPage() {
  const accountsUrl = getPublicSseAccountsUrl();
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
      <Globe className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
      <h1 className="text-lg font-bold text-white">
        SSO Handled by SSE Accounts
      </h1>
      <p className="mt-2 text-xs text-slate-400">
        Single Sign-On authorization now lives centrally on{" "}
        <strong>SSE Accounts</strong>.
      </p>
      <a
        href={accountsUrl}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
      >
        Open SSE Accounts
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
