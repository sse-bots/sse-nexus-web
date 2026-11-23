import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { GlobalNetworkMonitor } from "@/components/GlobalNetworkMonitor";

export const metadata: Metadata = {
  title: "SSE Nexus — Unified Bot Activation & SSO Platform",
  description:
    "Manage SSE Discord bots, request single, bundle, or global server activations, and sign in across SSE websites with a single profile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-primary="green" data-neutral="slate">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased">
        <GlobalNetworkMonitor />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
