import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { oauthProvider } from "@better-auth/oauth-provider";
import { mongoClient, getDbSync } from "./mongodb";

const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const ownerId = (process.env.HUB_OWNER_ID || "").trim();

export const auth = betterAuth({
  appName: "SSE Nexus",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET || "build-placeholder-secret-change-me",
  disabledPaths: ["/token"],
  database: mongodbAdapter(getDbSync(), {
    client: mongoClient,
  }),
  user: {
    additionalFields: {
      discordId: {
        type: "string",
        required: false,
        input: false,
      },
      discordUsername: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      scope: ["identify", "email", "guilds"],
      mapProfileToUser: (profile) => {
        const avatarUrl = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
          : undefined;
        return {
          name: profile.global_name || profile.username || `User ${profile.id}`,
          email: profile.email || `${profile.id}@discord.sse-world.local`,
          image: avatarUrl,
          discordId: String(profile.id),
          discordUsername: profile.username || String(profile.id),
        };
      },
    },
  },
  account: {
    updateAccountOnSignIn: true,
  },
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
    }),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "sse:servers",
        "sse:activations",
      ],
      allowPublicClientPrelogin: true,
      customUserInfoClaims: async ({ user }) => {
        const u = user as unknown as Record<string, unknown>;
        const discordId = typeof u.discordId === "string" ? u.discordId : null;
        const discordUsername =
          typeof u.discordUsername === "string" ? u.discordUsername : null;
        return {
          discord_id: discordId,
          discord_username: discordUsername,
          sse_role: discordId && discordId === ownerId ? "owner" : "user",
        };
      },
      customIdTokenClaims: async ({ user }) => {
        const u = user as unknown as Record<string, unknown>;
        const discordId = typeof u.discordId === "string" ? u.discordId : null;
        return {
          discord_id: discordId,
          sse_role: discordId && discordId === ownerId ? "owner" : "user",
        };
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
