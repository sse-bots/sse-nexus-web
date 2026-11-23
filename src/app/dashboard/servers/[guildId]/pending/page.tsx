"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Sparkles, XCircle } from "lucide-react";
import { useServerWorkspace } from "@/components/ServerWorkspaceContext";

export default function ServerPendingRequestsPage() {
  const { guildId, data, reload, notify } = useServerWorkspace();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function cancelRequest(requestId: string) {
    if (!confirm("Cancel this pending activation request?")) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(
        `/api/servers/${guildId}/requests?requestId=${encodeURIComponent(requestId)}`,
        { method: "DELETE" }
      );
      const j = await res.json();
      if (!res.ok) {
        notify("err", j.error || "Could not cancel request.");
        return;
      }
      notify("ok", "Pending activation request cancelled.");
      await reload();
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">
            Pending Activation Requests ({data.pendingRequests.length})
          </h2>
          <p className="text-xs text-slate-400">
            Requests currently waiting for SSE Support Server staff review.
          </p>
        </div>

        <Link
          href={`/dashboard/servers/${guildId}/request`}
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 sm:self-center"
        >
          <Sparkles className="h-3.5 w-3.5" />
          New Request
        </Link>
      </div>

      {data.pendingRequests.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <h3 className="text-base font-bold text-white">
            No pending activation requests
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
            You don&apos;t have any requests waiting for approval for{" "}
            {data.guild.name}.
          </p>
          <Link
            href={`/dashboard/servers/${guildId}/request`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Request Activation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.pendingRequests.map((req) => (
            <div
              key={req._id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/35 bg-slate-900/70 p-5 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    {(req.key_scope || "single").toUpperCase()} · PENDING
                  </span>
                  <span className="text-sm font-bold text-white">
                    {req.bot_name}
                  </span>
                </div>

                {req.requester_note && (
                  <p className="text-xs text-slate-300">
                    Note: {req.requester_note}
                  </p>
                )}

                <div className="font-mono text-[11px] text-slate-500">
                  ID: {req._id} · Submitted{" "}
                  {new Date(req.created_at).toLocaleString()}
                </div>
              </div>

              {data.guild.isOwner && (
                <button
                  type="button"
                  disabled={cancellingId === req._id}
                  onClick={() => cancelRequest(req._id)}
                  className="inline-flex items-center gap-1.5 self-start rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 sm:self-center"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {cancellingId === req._id
                    ? "Cancelling..."
                    : "Cancel Request"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
