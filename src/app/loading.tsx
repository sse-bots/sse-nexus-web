export default function GlobalRouteLoading() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-xs font-extrabold text-indigo-400">
          SSE
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Loading SSE Nexus...</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Syncing Discord &amp; Hub data
        </p>
      </div>
    </div>
  );
}
