"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";

interface TemplateRow {
  _id: string;
  bot_activation_id: string;
  name: string;
  title: string;
  message: string;
  link?: string;
}

interface HistoryRow {
  _id: string;
  bot_activation_id: string;
  event_type: string;
  title?: string;
  embed_title?: string;
  scheduled_at?: string;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const [bots, setBots] = useState<Array<{ activation_id: string; name: string }>>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [botId, setBotId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sendAt, setSendAt] = useState("");

  const load = useCallback(async () => {
    const [bRes, aRes] = await Promise.all([
      fetch("/api/admin/bots", { cache: "no-store" }),
      fetch("/api/admin/announcements", { cache: "no-store" }),
    ]);
    if (bRes.ok) {
      const bj = await bRes.json();
      const active = (bj.bots || []).filter((b: { status: string }) => b.status === "active");
      setBots(active);
      if (!botId && active[0]) setBotId(active[0].activation_id);
    }
    if (aRes.ok) {
      const aj = await aRes.json();
      setTemplates(aj.templates || []);
      setHistory(aj.history || []);
    }
  }, [botId]);

  useEffect(() => {
    load();
  }, [load]);

  async function scheduleOrSend(e: React.FormEvent) {
    e.preventDefault();
    // Scheduling for now + 5s triggers hub_bot.py's existing _monitor_bots_loop within ~30s!
    const scheduledIso = sendAt
      ? new Date(sendAt).toISOString()
      : new Date(Date.now() + 5000).toISOString();

    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "schedule_announcement",
        bot_activation_id: botId,
        title,
        message,
        link,
        scheduled_at: scheduledIso,
      }),
    });
    setTitle("");
    setMessage("");
    setLink("");
    setSendAt("");
    await load();
  }

  async function cancelSchedule(scheduleId: string) {
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "cancel_schedule", schedule_id: scheduleId }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Announcements &amp; Schedules</h1>

      <form
        onSubmit={scheduleOrSend}
        className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="text-sm font-semibold text-white">
          Broadcast or Schedule Announcement (Delivered automatically by Hub Bot)
        </div>
        <select
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
        >
          {bots.map((b) => (
            <option key={b.activation_id} value={b.activation_id}>
              {b.name} ({b.activation_id})
            </option>
          ))}
        </select>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement Title"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
        />
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Announcement body..."
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Optional https:// link"
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
          />
          <input
            type="datetime-local"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
            title="Leave empty to dispatch on next Hub loop (~30s)"
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Send className="h-3.5 w-3.5" />
          {sendAt ? "Schedule Announcement" : "Queue Broadcast Now"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-semibold text-white">
            Saved Templates ({templates.length})
          </h2>
          {templates.map((t) => (
            <div
              key={t._id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
            >
              <div>
                <div className="font-semibold text-white">
                  {t.name} — {t.title}
                </div>
                <div className="text-slate-400">{t.bot_activation_id}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBotId(t.bot_activation_id);
                  setTitle(t.title);
                  setMessage(t.message);
                  setLink(t.link || "");
                }}
                className="text-indigo-400 hover:underline"
              >
                Load
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-semibold text-white">
            Recent &amp; Scheduled ({history.length})
          </h2>
          {history.map((h) => (
            <div
              key={h._id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
            >
              <div>
                <div className="font-semibold text-white">
                  {h.title || h.embed_title || "Untitled"}
                </div>
                <div className="text-slate-400">
                  {h.event_type} · {h.bot_activation_id}
                </div>
              </div>
              {h.event_type === "scheduled_pending" && (
                <button
                  type="button"
                  onClick={() => cancelSchedule(h._id)}
                  className="text-rose-400 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
