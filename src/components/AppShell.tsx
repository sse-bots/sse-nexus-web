"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
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
  Monitor,
  Moon,
  Scale,
  Search,
  Server,
  Settings,
  Shield,
  Sun,
  UserCheck,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import {
  DEFAULT_THEME_STATE,
  PRIMARY_COLORS,
  THEME_PRESETS,
  ThemeState,
  applyThemeToDocument,
  loadSavedTheme,
  saveThemeState,
} from "@/lib/theme-config";

interface MeUser {
  name: string;
  discordId: string;
  image: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  canAccessPortal: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [theme, setTheme] = useState<ThemeState>(DEFAULT_THEME_STATE);

  useEffect(() => {
    const initial = loadSavedTheme();
    setTheme(initial);
    applyThemeToDocument(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemChange() {
      const latest = loadSavedTheme();
      if (latest.mode === "system") {
        applyThemeToDocument(latest);
      }
    }
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  function updateTheme(next: ThemeState) {
    setTheme(next);
    saveThemeState(next);
    applyThemeToDocument(next);
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDockOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setDockOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    { href: "/status", label: "Live Status", icon: Activity },
    ...(user
      ? [
          { href: "/dashboard", label: "My Servers", icon: LayoutDashboard },
          { href: "/account", label: "SSE Profile", icon: UserCheck },
        ]
      : []),
  ];

  const adminLinks = user?.isStaff
    ? [
        { href: "/admin", label: "Overview", icon: Shield },
        { href: "/admin/requests", label: "Requests Queue", icon: Inbox },
        { href: "/admin/servers", label: "Server Licenses", icon: Server },
        ...(user.isAdmin || user.isOwner
          ? [
              { href: "/admin/bots", label: "Bots & Status", icon: Bot },
              {
                href: "/admin/oauth-clients",
                label: "SSO / OAuth Apps",
                icon: Globe,
              },
            ]
          : []),
        ...(user.isOwner
          ? [
              {
                href: "/admin/keys",
                label: "Activation Keys",
                icon: KeyRound,
              },
              {
                href: "/admin/announcements",
                label: "Announcements",
                icon: Megaphone,
              },
              {
                href: "/admin/settings",
                label: "Hub Settings & Logs",
                icon: Settings,
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

  const activePrimaryColor =
    PRIMARY_COLORS.find((c) => c.id === theme.primary) || PRIMARY_COLORS[6];
  const activePresetLabel =
    THEME_PRESETS.find((p) => p.id === theme.preset)?.label || "Custom";

  function renderNavLink(
    href: string,
    label: string,
    Icon: typeof Home,
    exact = false,
    staggerIdx = 0
  ) {
    const active = exact
      ? pathname === href
      : pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    return (
      <Link
        key={href}
        href={href}
        style={{ animationDelay: `${Math.min(staggerIdx * 28, 280)}ms` }}
        className={`animate-menu-item flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
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
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25">
              SSE
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold text-white">
                SSE Nexus
              </div>
              <div className="truncate text-[11px] text-slate-400">
                Activation &amp; SSO
              </div>
            </div>
          </Link>

          {/* Nuxt UI Theme Customizer Trigger on PC Sidebar */}
          <ThemeCustomizer theme={theme} onChange={updateTheme} align="left" />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder="Quick jump (Ctrl+K)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            <nav className="space-y-1">
              {filteredPrimary.map((l, i) =>
                renderNavLink(l.href, l.label, l.icon, l.href === "/", i)
              )}
            </nav>
          </div>

          {filteredAdmin.length > 0 && (
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
                {filteredAdmin.map((l, i) =>
                  renderNavLink(l.href, l.label, l.icon, l.href === "/admin", i)
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
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

      {/* Main Content Area + Clean Top Strip (Brand Name + Nuxt UI Theme Customizer + Dark/Light Mode) */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#0a0d14]/85 px-4 backdrop-blur-md lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-extrabold text-white shadow-md shadow-indigo-500/25">
              SSE
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-white">
                SSE Nexus
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: activePrimaryColor.c500 }}
                />
                <span>{activePresetLabel}</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Nuxt UI Full Theme Customizer Dropdown */}
            <ThemeCustomizer theme={theme} onChange={updateTheme} align="right" />

            {/* Direct Dark / Light Mode Quick Toggle */}
            <button
              type="button"
              onClick={() =>
                updateTheme({
                  ...theme,
                  mode: theme.mode === "light" ? "dark" : "light",
                })
              }
              aria-label="Toggle Dark or Light Mode"
              className="rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-slate-200 transition hover:border-indigo-500 active:scale-95"
            >
              {theme.mode === "light" ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Animated Mobile Vercel-Style Bottom Sheet Menu */}
      {dockOpen && (
        <div className="animate-backdrop-in fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm lg:hidden">
          <div
            className="flex-1"
            onClick={() => setDockOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-sheet-up max-h-[86vh] overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-[#0b0e16] px-4 pb-24 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" />

            {/* Top Bar Inside Menu: Brand + Light/Dark/System Switch */}
            <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-extrabold text-white">
                  SSE
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white">
                    SSE Nexus
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {activePresetLabel} · {activePrimaryColor.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => updateTheme({ ...theme, mode: "light" })}
                  className={`rounded-lg p-1.5 transition ${
                    theme.mode === "light"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400"
                  }`}
                  title="Light"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateTheme({ ...theme, mode: "dark" })}
                  className={`rounded-lg p-1.5 transition ${
                    theme.mode === "dark"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400"
                  }`}
                  title="Dark"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateTheme({ ...theme, mode: "system" })}
                  className={`rounded-lg p-1.5 transition ${
                    theme.mode === "system"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400"
                  }`}
                  title="System"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* User Profile Card */}
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
                    {user ? user.name : "Guest User"}
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
                      : "Sign in with Discord to continue"}
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
              {filteredPrimary.map((l, i) =>
                renderNavLink(l.href, l.label, l.icon, l.href === "/", i)
              )}
            </div>

            {/* Admin Links */}
            {filteredAdmin.length > 0 && (
              <div className="mt-4 border-t border-slate-800/80 pt-4">
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  SSE Hub Admin
                </div>
                <div className="space-y-1">
                  {filteredAdmin.map((l, i) =>
                    renderNavLink(
                      l.href,
                      l.label,
                      l.icon,
                      l.href === "/admin",
                      i + filteredPrimary.length
                    )
                  )}
                </div>
              </div>
            )}

            {/* Legal Links */}
            <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3">
              {legalLinks.map((l, i) =>
                renderNavLink(l.href, l.label, l.icon, true, i)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Vercel-Style Bottom-Center Floating Pill Dock */}
      <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 lg:hidden">
        <div className="flex items-center rounded-2xl border border-slate-700/80 bg-[#111520]/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.65)] backdrop-blur-md transition-all duration-200">
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
            <button
              type="button"
              onClick={() => setDockOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800/80 active:scale-95"
            >
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span>Find</span>
            </button>
          )}

          <div className="mx-1 h-5 w-px bg-slate-700/80" />

          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            aria-label="Toggle Navigation Menu"
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800/80 active:scale-95"
          >
            <span
              className={`inline-flex transition-transform duration-300 ${
                dockOpen ? "rotate-90" : "rotate-0"
              }`}
            >
              {dockOpen ? (
                <X className="h-4 w-4 text-rose-400" />
              ) : (
                <Menu className="h-4 w-4 text-indigo-400" />
              )}
            </span>
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
