import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — SSE Nexus",
  description: "Privacy Policy for SSE Nexus, SSE Bots Hub, and SSE Single Sign-On.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: November 23, 2026 · SSE World / SSE Nexus
          </p>
        </div>
      </div>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          1. Information We Collect
        </h2>
        <p>
          When you sign in to <strong>SSE Nexus</strong> using Discord OAuth2,
          we collect and store only the information required to operate bot
          licensing and Single Sign-On (SSO):
        </p>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>
            Your Discord User ID, username, display name, avatar URL, and
            account email address.
          </li>
          <li>
            The list of Discord servers where you hold Owner or Manage Server
            permissions (to display your servers and verify ownership).
          </li>
          <li>
            Your role membership in the official SSE Support Server (to verify
            portal access, staff permissions, and blacklist restrictions).
          </li>
          <li>
            Activation request logs, server license records, and authorized
            first-party SSE OAuth client consents.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          2. How We Use Your Information
        </h2>
        <p>
          We use your data strictly to authenticate your SSE Profile across
          authorized SSE websites, verify server ownership before issuing bot
          activation keys, deliver announcements to channels you configure, and
          maintain security audit logs. We never sell or rent your data to
          third parties.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          3. Security &amp; Key Handling
        </h2>
        <p>
          Activation keys are stored as irreversible SHA-256 hashes. Temporary
          approved keys shown on your server dashboard are encrypted with
          AES-256-GCM and permanently wiped from storage as soon as they are
          redeemed in Discord.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          4. Your Controls &amp; Data Deletion
        </h2>
        <p>
          You can revoke any connected SSE website at any time from your{" "}
          <Link href="/account" className="text-indigo-400 underline">
            SSE Profile
          </Link>{" "}
          page, remove server licenses from your server dashboard, or contact
          SSE staff in our Discord Support Server to request account deletion.
        </p>
      </section>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        See also our{" "}
        <Link href="/terms" className="text-indigo-400 hover:underline">
          Terms of Service
        </Link>
        .
      </div>
    </div>
  );
}
