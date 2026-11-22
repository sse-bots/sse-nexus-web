"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface AdminReq {
  _id: string;
  key_scope?: string;
  bot_name: string;
  bot_activation_id: string;
  bot_activation_ids?: string[];
  guild_id: string;
  guild_name: string;
  requester_id: string;
  requester_name?: string;
  status: string;
  source?: string;
  created_at: string;
  approval_reason?: string;
  rejection_reason?: string;
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<AdminReq[]>([]);
  const [status, setStatus] = useState("pending");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/requests?status=${status}&scope=${scope}`,
        { cache: "no-store" }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load requests.");
      setRows(j.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [status, scope]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(requestId: string, decision: "approve" | "reject") {
    setBusyId(requestId);
    setError(null);
    setIssuedKey(null);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: reasonMap[requestId] || "",
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Action failed.");
        return;
      }
      if (j.plaintext_key) {
        setIssuedKey(j.plaintext_key);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Activation Requests</h1>
          <p className="text-sm text-slate-400">
            Approve or deny single, bundle, and global activation requests.
            Approved keys appear automatically on the user&apos;s server page.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Statuses</option>
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Scopes</option>
            <option value="single">Single Bot</option>
            <option value="bundle">Bundle</option>
            <option value="global">Global</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {issuedKey && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="text-sm font-semibold text-emerald-300">
            Request approved! Key is now visible on the user&apos;s server page:
          </div>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-slate-950 px-3 py-1.5 font-mono text-xs text-emerald-200">
              {issuedKey}
            </code>
            <CopyButton value={issuedKey} />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading requests...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
          No requests matching this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div
              key={r._id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold uppercase text-indigo-300">
                      {r.key_scope || "single"}
                    </span>
                    <h2 className="font-semibold text-white">{r.bot_name}</h2>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                      {r.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
                    <div>
                      Server: <strong className="text-slate-200">{r.guild_name}</strong>{" "}
                      (<code>{r.guild_id}</code>)
                    </div>
                    <div>
                      Applicant:{" "}
                      <strong className="text-slate-200">
                        {r.requester_name || r.requester_id}
                      </strong>{" "}
                      (<code>{r.requester_id}</code>)
                    </div>
                    <div>
                      Submitted: {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {r.status === "pending" && (
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row">
                  <input
                    value={reasonMap[r._id] || ""}
                    onChange={(e) =>
                      setReasonMap((m) => ({ ...m, [r._id]: e.target.value }))
                    }
                    placeholder="Optional staff note / rejection reason..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => decide(r._id, "approve")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve &amp; Issue Key
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => decide(r._id, "reject")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600/90 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
