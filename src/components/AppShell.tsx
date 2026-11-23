"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Check,
  FileText,
  Globe,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  Palette,
  Scale,
  Search,
  Server,
  Settings,
  Shield,
  UserCheck,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface MeUser {
  name: string;
  discordId: string;
  image: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  canAccessPortal: boolean;
}

const THEMES = [
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "sky", label: "Cyan", swatch: "#0ea5e9" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "vercel", label: "Monochrome", swatch: "#ffffff" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [accent, setAccent] = useState<string>("indigo");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("sse-nexus-accent")
        : null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setAccent(saved);
      document.documentElement.setAttribute("data-accent", saved);
    }
  }, []);

  function applyTheme(id: string) {
    setAccent(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sse-nexus-accent", id);
      document.documentElement.setAttribute("data-accent", id);
    }
  }

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) setUser(d.user);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  useEffect(() => {
    setDockOpen(false);
    setQuickFilter("");
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setDockOpen(false);
    router.push("/");
    router.refresh();
  }

  const primaryLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/bots", label: "Bot Directory", icon: Bot },
    ...(user
      ? [
          { href: "/dashboard", label: "My Servers", icon: LayoutDashboard },
          { href: "/account", label: "SSE Profile", icon: UserCheck },
        ]
      : []),
  ];

  const adminLinks = user?.isStaff
    ? [
        { href: "/admin", label: "Overview", icon: Shield, min: "staff" },
        {
          href: "/admin/requests",
          label: "Requests Queue",
          icon: Inbox,
          min: "staff",
        },
        {
          href: "/admin/servers",
          label: "Server Licenses",
          icon: Server,
          min: "staff",
        },
        ...(user.isAdmin || user.isOwner
          ? [
              {
                href: "/admin/bots",
                label: "Bots & Status",
                icon: Bot,
                min: "admin",
              },
              {
                href: "/admin/oauth-clients",
                label: "SSO / OAuth Apps",
                icon: Globe,
                min: "admin",
              },
            ]
          : []),
        ...(user.isOwner
          ? [
              {
                href: "/admin/keys",
                label: "Activation Keys",
                icon: KeyRound,
                min: "owner",
              },
              {
                href: "/admin/announcements",
                label: "Announcements",
                icon: Megaphone,
                min: "owner",
              },
              {
                href: "/admin/settings",
                label: "Hub Settings & Logs",
                icon: Settings,
                min: "owner",
              },
            ]
          : []),
      ]
    : [];

  const legalLinks = [
    { href: "/privacy", label: "Privacy Policy", icon: Scale },
    { href: "/terms", label: "Terms of Service", icon: FileText },
  ];

  const q = quickFilter.trim().toLowerCase();
  const filteredPrimary = q
    ? primaryLinks.filter((l) => l.label.toLowerCase().includes(q))
    : primaryLinks;
  const filteredAdmin = q
    ? adminLinks.filter((l) => l.label.toLowerCase().includes(q))
    : adminLinks;

  function renderNavLink(
    href: string,
    label: string,
    Icon: typeof Home,
    exact = false
  ) {
    const active = exact
      ? pathname === href
      : pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-indigo-600/20 text-indigo-300"
            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 lg:flex">
      {/* Desktop (PC) Fixed Left Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-800/80 lg:bg-[#0a0d14]">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25">
            SSE
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold text-white">
              SSE Nexus
            </div>
            <div className="truncate text-[11px] text-slate-400">
              Activation &amp; SSO Portal
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            <nav className="space-y-1">
              {primaryLinks.map((l) =>
                renderNavLink(l.href, l.label, l.icon, l.href === "/")
              )}
            </nav>
          </div>

          {adminLinks.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Admin Control
                </span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                  {user?.isOwner ? "OWNER" : user?.isAdmin ? "ADMIN" : "MOD"}
                </span>
              </div>
              <nav className="space-y-1">
                {adminLinks.map((l) =>
                  renderNavLink(l.href, l.label, l.icon, l.href === "/admin")
                )}
              </nav>
            </div>
          )}

          {/* Theme Color Picker */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Palette className="h-3.5 w-3.5 text-indigo-400" />
              Theme Accent
            </div>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => {
                const selected = accent === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTheme(t.id)}
                    title={t.label}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                      selected
                        ? "scale-110 border-white ring-2 ring-white/30"
                        : "border-slate-700 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: t.swatch }}
                  >
                    {selected && (
                      <Check
                        className={`h-3.5 w-3.5 ${
                          t.id === "vercel" || t.id === "amber"
                            ? "text-slate-950"
                            : "text-white"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Legal + User Profile */}
        <div className="space-y-3 border-t border-slate-800/80 p-3">
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-slate-300">
              Terms
            </Link>
          </div>

          {!loaded ? (
            <div className="h-11 animate-pulse rounded-xl bg-slate-800/70" />
          ) : user ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-2">
              <Link
                href="/account"
                className="flex min-w-0 items-center gap-2.5"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white">
                    {user.name}
                  </div>
                  <div className="truncate font-mono text-[10px] text-slate-400">
                    {user.discordId || "SSE Profile"}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                title="Logout"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Discord
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area (No cluttered top bar on mobile!) */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile Vercel-Style Overlay Menu Sheet */}
      {dockOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm lg:hidden">
          <div
            className="flex-1"
            onClick={() => setDockOpen(false)}
            aria-hidden="true"
          />
          <div className="max-h-[84vh] overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-[#0b0e16] px-4 pb-24 pt-5 shadow-2xl">
            {/* Top Profile / Brand Strip inside Vercel Sheet */}
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white">
                    SSE
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">
                    {user ? user.name : "SSE Nexus"}
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {user
                      ? user.isOwner
                        ? "Hub Owner"
                        : user.isAdmin
                          ? "Support Server Admin"
                          : user.isStaff
                            ? "Support Server Moderator"
                            : "Verified Member"
                      : "Sign in to manage servers"}
                  </div>
                </div>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Primary Navigation */}
            <div className="space-y-1">
              {filteredPrimary.map((l) =>
                renderNavLink(l.href, l.label, l.icon, l.href === "/")
              )}
            </div>

            {/* Admin Links if Staff */}
            {filteredAdmin.length > 0 && (
              <div className="mt-4 border-t border-slate-800/80 pt-4">
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  SSE Hub Admin
                </div>
                <div className="space-y-1">
                  {filteredAdmin.map((l) =>
                    renderNavLink(l.href, l.label, l.icon, l.href === "/admin")
                  )}
                </div>
              </div>
            )}

            {/* Theme Color Picker */}
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <div className="mb-2.5 flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-300">
                <Palette className="h-4 w-4 text-indigo-400" />
                Website Color Theme
              </div>
              <div className="flex flex-wrap gap-2.5 px-2">
                {THEMES.map((t) => {
                  const selected = accent === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTheme(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? "border-white bg-slate-800 text-white"
                          : "border-slate-800 bg-slate-900/70 text-slate-400"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.swatch }}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legal Links */}
            <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3">
              {legalLinks.map((l) =>
                renderNavLink(l.href, l.label, l.icon, true)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Vercel-Style Bottom-Center Floating Pill Dock */}
      <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 lg:hidden">
        <div className="flex items-center rounded-2xl border border-slate-700/80 bg-[#111520]/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.75)] backdrop-blur-md">
          {dockOpen ? (
            <div className="flex items-center gap-2 px-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                placeholder="Find page..."
                className="w-36 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          ) : (
            <Link
              href="/bots"
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/80"
            >
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span>Find</span>
            </Link>
          )}

          <div className="mx-1 h-5 w-px bg-slate-700/80" />

          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            aria-label="Toggle Navigation Menu"
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800/80"
          >
            {dockOpen ? (
              <X className="h-4 w-4 text-rose-400" />
            ) : (
              <Menu className="h-4 w-4 text-indigo-400" />
            )}
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
