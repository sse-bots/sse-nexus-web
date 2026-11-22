# SSE Bots Hub — Next.js Dashboard & OAuth 2.1 SSO Provider

Complete Next.js (App Router + TypeScript + Tailwind CSS) web dashboard for **SSE Bots Hub**, powered by **Better Auth** (Discord Login + OAuth 2.1 / OIDC Provider) and connected directly to your existing `sse_bots_user` MongoDB database.

## Features
- **Discord Login + Single SSE Profile (OAuth 2.1 / OIDC Provider)**:
  - Users log in with Discord (`identify`, `email`, `guilds`).
  - Other SSE websites can authenticate users via Better Auth `@better-auth/oauth-provider` so users keep one unified profile across all SSE websites.
  - Includes `/oauth/consent`, `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server`, `/account` (connected apps), and `/admin/oauth-clients`.
- **Server Owner Dashboard (`/dashboard` & `/dashboard/servers/[guildId]`)**:
  - Automatically displays all servers where **SSE Nexus / Hub** is present.
  - Clicking a server opens the full bot manager:
    - **Single Bot Activation**
    - **Bundle Activation** (select 2+ bots -> request 1 key for selected bots)
    - **Global Activation** (1 single key covering all activation-required SSE bots)
    - Live **Pending Approval** state -> once approved by staff, displays the **plaintext key directly on the page** (AES-256-GCM encrypted in MongoDB, decrypted only for the verified owner while unused) with Copy Key & Copy `/activation` Command buttons.
    - Once redeemed, bots appear under **Active Bots** with **Deactivate**, **Reactivate**, **Remove License**, and **Per-Bot Announcement Channel** selector.
- **Staff & Owner Admin Panel (`/admin`)**:
  - Request review queue (approve/reject Single, Bundle, Global requests).
  - Registered bots manager (add, toggle activation required, maintenance mode, rotate heartbeat secret, disable).
  - Manual key generator (Single / Bundle / Global + optional server binding & expiry).
  - Server license manager, announcement templates/scheduler, support server settings, audit logs, and OAuth Client Apps manager.

## Quick Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your credentials:
   - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
   - `KEY_ENCRYPTION_SECRET` (`openssl rand -hex 32`)
   - `MONGODB_URI` (same MongoDB URI as `hub_bot.py`)
   - `DISCORD_CLIENT_ID` & `DISCORD_CLIENT_SECRET` (add redirect URI `<APP_URL>/api/auth/callback/discord` in Discord Developer Portal)
   - `HUB_DISCORD_TOKEN`, optional `NEXUS_DISCORD_TOKEN` / `NEXUS_ACTIVATION_ID`
   - `HUB_OWNER_ID` & `HUB_SUPPORT_GUILD_ID`
3. Start development server:
   ```bash
   npm run dev
   ```

## Connecting Other SSE Websites ("Sign in with SSE")
1. Go to `/admin/oauth-clients` and register your other website to get `client_id` and `client_secret`.
2. In your other Next.js website using Better Auth `genericOAuth` plugin:
   ```ts
   genericOAuth({
     config: [
       {
         providerId: "sse",
         clientId: process.env.SSE_CLIENT_ID!,
         clientSecret: process.env.SSE_CLIENT_SECRET!,
         discoveryUrl: "https://your-hub-domain.com/.well-known/openid-configuration",
         scopes: ["openid", "profile", "email"],
       },
     ],
   });
   ```
