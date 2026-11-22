"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Globe,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Server,
  Settings,
  Inbox,
} from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/requests", label: "Requests Queue", icon: Inbox },
  { href: "/admin/bots", label: "Bots & Status", icon: Bot },
  { href: "/admin/keys", label: "Activation Keys", icon: KeyRound },
  { href: "/admin/servers", label: "Server Licenses", icon: Server },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/oauth-clients", label: "SSO / OAuth Apps", icon: Globe },
  { href: "/admin/settings", label: "Hub Settings & Logs", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 lg:sticky lg:top-24 lg:self-start">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          SSE Hub Admin
        </div>
        <nav className="space-y-1">
          {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
