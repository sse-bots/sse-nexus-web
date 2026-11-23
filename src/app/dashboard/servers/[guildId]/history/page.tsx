"use client";

import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useServerWorkspace } from "@/components/ServerWorkspaceContext";

export default function ServerActivityHistoryPage() {
  const { data } = useServerWorkspace();

  return (
    <div className="space-y-8">
      {/* Past & Current Requests */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            Activation Request History ({data.recentRequests.length})
          </h2>
          <p className="text-xs text-slate-400">
            Complete history of approved, rejected, cancelled, and pending
            requests for {data.guild.name}.
          </p>
        </div>

        {data.recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
            No activation requests recorded for this server yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.recentRequests.map((r) => {
              const status = r.status.toLowerCase();
              return (
                <div
                  key={r._id}
                  className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {status === "approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </span>
                      ) : status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      ) : status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                          {status}
                        </span>
                      )}

                      <span className="text-sm font-semibold text-white">
                        {r.bot_name}
                      </span>
                    </div>

                    {r.rejection_reason && (
                      <p className="text-xs text-rose-300">
                        Reason: {r.rejection_reason}
                      </p>
                    )}
                    {r.approval_reason && (
                      <p className="text-xs text-emerald-300">
                        Staff note: {r.approval_reason}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Server Audit Logs */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">
            Server Activation Audit Trail
          </h2>
        </div>

        {data.recentLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
            No audit events recorded for this server yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Event</th>
                  <th className="px-4 py-2.5">Bot / Scope</th>
                  <th className="px-4 py-2.5">Performed By</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/50">
                {data.recentLogs.map((l, idx) => (
                  <tr key={l._id || idx}>
                    <td className="px-4 py-2.5 font-mono text-indigo-300">
                      {l.event}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {l.bot_activation_id || "-"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">
                      {l.user_id || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
