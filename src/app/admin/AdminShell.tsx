"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Server,
  Settings,
  ShieldAlert,
} from "lucide-react";

type RoleLevel = "staff" | "admin" | "owner";

const ADMIN_LINKS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole: RoleLevel;
}> = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, minRole: "staff" },
  { href: "/admin/requests", label: "Requests Queue", icon: Inbox, minRole: "staff" },
  { href: "/admin/servers", label: "Server Licenses", icon: Server, minRole: "staff" },
  { href: "/admin/bots", label: "Bots & Status", icon: Bot, minRole: "admin" },
  { href: "/admin/oauth-clients", label: "SSO / OAuth Apps", icon: Globe, minRole: "admin" },
  { href: "/admin/keys", label: "Activation Keys", icon: KeyRound, minRole: "owner" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, minRole: "owner" },
  { href: "/admin/settings", label: "Hub Settings & Logs", icon: Settings, minRole: "owner" },
];

function hasRole(minRole: RoleLevel, isAdmin: boolean, isOwner: boolean): boolean {
  if (minRole === "owner") return isOwner;
  if (minRole === "admin") return isAdmin || isOwner;
  return true;
}

export function AdminShell({
  isAdmin,
  isOwner,
  children,
}: {
  isAdmin: boolean;
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleLinks = ADMIN_LINKS.filter((l) =>
    hasRole(l.minRole, isAdmin, isOwner)
  );

  const matchedRoute = ADMIN_LINKS.find((l) =>
    l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href)
  );
  const authorizedForCurrentRoute = matchedRoute
    ? hasRole(matchedRoute.minRole, isAdmin, isOwner)
    : isOwner;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            SSE Hub Admin
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              isOwner
                ? "bg-amber-500/20 text-amber-300"
                : isAdmin
                  ? "bg-violet-500/20 text-violet-300"
                  : "bg-indigo-500/20 text-indigo-300"
            }`}
          >
            {isOwner ? "OWNER" : isAdmin ? "ADMIN" : "MOD"}
          </span>
        </div>
        <nav className="space-y-1">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
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

      <div className="min-w-0">
        {authorizedForCurrentRoute ? (
          children
        ) : (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-400" />
            <h1 className="text-lg font-bold text-white">Restricted Section</h1>
            <p className="mt-2 text-sm text-rose-200/80">
              {matchedRoute?.minRole === "owner"
                ? "Only the SSE Hub Owner can access this section."
                : "Only Support Server Admins and the Hub Owner can access this section."}
            </p>
            <Link
              href="/admin"
              className="mt-5 inline-block rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Back to Admin Overview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
