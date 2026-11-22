import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSessionContext } from "@/lib/permissions";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();

  if (!ctx) {
    redirect("/sign-in?next=/admin");
  }

  if (!ctx.isStaff) {
    return (
      <div className="mx-auto mt-14 max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-rose-400" />
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="mt-2 text-sm text-rose-200/80">
          Only SSE Hub Owners, Support Server Admins, and Support Server
          Moderators can access the Admin Panel.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Go to My Servers
        </Link>
      </div>
    );
  }

  return (
    <AdminShell isAdmin={ctx.isAdmin} isOwner={ctx.isOwner}>
      {children}
    </AdminShell>
  );
}
