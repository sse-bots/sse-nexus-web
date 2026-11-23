import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";

export default function ServiceUnavailablePage() {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-rose-500/35 bg-slate-900/80 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <div className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-0.5 font-mono text-xs font-semibold text-rose-300">
        HTTP 503 • SERVICE UNAVAILABLE
      </div>
      <h1 className="mt-3 text-2xl font-bold text-white">
        Server Took Too Long to Respond
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
        SSE Nexus timed out while waiting for Discord or the database to
        respond. This usually happens during brief API rate limits or cold
        starts.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          Back Home
        </Link>
      </div>
    </div>
  );
}
