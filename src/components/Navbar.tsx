"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LayoutDashboard, LogOut, Shield, UserCheck, Menu, X } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface MeUser {
  name: string;
  discordId: string;
  image: string | null;
  isOwner: boolean;
  isStaff: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  async function handleSignOut() {
    await signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/bots", label: "Bot Directory", icon: Bot },
    ...(user
      ? [
          { href: "/dashboard", label: "My Servers", icon: LayoutDashboard },
          { href: "/account", label: "SSE Profile", icon: UserCheck },
        ]
      : []),
    ...(user?.isStaff
      ? [{ href: "/admin", label: "Admin Panel", icon: Shield }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c0f17]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/20">
            SSE
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-white">
              SSE Bots Hub
            </div>
            <div className="text-[11px] text-slate-400">
              Activation &amp; Single Sign-On
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loaded ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-800" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 py-1 pl-1.5 pr-3 text-xs text-slate-200 hover:border-slate-700"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate font-medium">{user.name}</span>
                {user.isOwner && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    OWNER
                  </span>
                )}
                {!user.isOwner && user.isStaff && (
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                    STAFF
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/40 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Sign in with Discord
            </Link>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-800 bg-[#0c0f17] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Sign out ({user.name})
              </button>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Sign in with Discord
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
