import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — SSE Nexus",
  description: "Terms of Service for SSE Nexus, SSE Bots Hub, and SSE Discord bots.",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400">
            Last updated: November 23, 2026 · SSE World / SSE Nexus
          </p>
        </div>
      </div>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing <strong>SSE Nexus</strong>, inviting SSE Discord bots,
          or signing in with SSE Single Sign-On, you agree to comply with these
          Terms of Service and Discord&apos;s Terms of Service and Community
          Guidelines.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          2. Eligibility &amp; Support Server Membership
        </h2>
        <p>
          Access to the SSE Nexus portal and bot activation requests requires
          active membership in the official SSE Support Server (and any
          verified member role configured by SSE administrators). Leaving the
          Support Server or losing the required role may restrict portal
          access.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          3. Activation Keys &amp; Server Licenses
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>
            Activation keys (Single, Bundle, and Global) are single-use and
            intended solely for the Discord server owned by the approved
            applicant.
          </li>
          <li>
            Reselling, sharing, leaking, or abusing activation keys or rate
            limits is strictly prohibited and may result in license revocation
            and blacklisting.
          </li>
          <li>
            SSE World reserves the right to revoke licenses, place bots in
            maintenance mode, or update features at any time.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-slate-300">
        <h2 className="text-base font-semibold text-white">
          4. Disclaimer of Warranties
        </h2>
        <p>
          SSE Nexus and all connected SSE bots are provided &ldquo;as is&rdquo;
          without warranties of uninterrupted availability. We are not
          responsible for downtime caused by Discord API outages, third-party
          hosting providers, or server misconfiguration.
        </p>
      </section>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        See also our{" "}
        <Link href="/privacy" className="text-indigo-400 hover:underline">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
