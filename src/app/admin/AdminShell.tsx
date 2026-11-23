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
  { href: "/admin/requests", label: "Requests", icon: Inbox, minRole: "staff" },
  { href: "/admin/servers", label: "Licenses", icon: Server, minRole: "staff" },
  { href: "/admin/bots", label: "Bots & Status", icon: Bot, minRole: "admin" },
  { href: "/admin/oauth-clients", label: "SSO / OAuth", icon: Globe, minRole: "admin" },
  { href: "/admin/keys", label: "Keys", icon: KeyRound, minRole: "owner" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, minRole: "owner" },
  { href: "/admin/settings", label: "Hub Settings", icon: Settings, minRole: "owner" },
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
    <div className="space-y-6">
      {/* Compact horizontal quick-tabs for admin subpages */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : "border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>

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
