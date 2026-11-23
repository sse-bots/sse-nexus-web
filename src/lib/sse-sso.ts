import { getCollections, userIdFilter } from "./mongodb";

export function getSseIssuerUrl(): string {
  const raw =
    process.env.SSE_ISSUER_URL ||
    process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL ||
    "https://sse-account.vercel.app";
  return raw.trim().replace(/\/+$/, "");
}

export function getPublicSseAccountsUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SSE_ACCOUNTS_URL ||
    process.env.SSE_ISSUER_URL ||
    "https://sse-account.vercel.app";
  return raw.trim().replace(/\/+$/, "");
}

export interface SseUserInfoResponse {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  username?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  github_id?: string | null;
  github_username?: string | null;
  sse_role?: string;
}

export interface SseDiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

/**
 * Reads the user's SSE OAuth access token from MongoDB (`account` collection, providerId: "sse")
 * and refreshes it automatically using the stored refresh_token if expired.
 */
export async function getValidSseAccessToken(
  userId: string
): Promise<string | null> {
  const { authAccounts } = await getCollections();
  const account = await authAccounts.findOne({
    userId: userIdFilter(userId),
    providerId: "sse",
  });
  if (!account) return null;

  const accessToken = account.accessToken as string | undefined;
  const refreshToken = account.refreshToken as string | undefined;
  const expiresAt = account.accessTokenExpiresAt
    ? new Date(account.accessTokenExpiresAt as string | Date).getTime()
    : 0;

  if (accessToken && (!expiresAt || expiresAt > Date.now() + 60_000)) {
    return accessToken;
  }

  const clientId = (process.env.SSE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.SSE_CLIENT_SECRET || "").trim();
  if (!refreshToken || !clientId || !clientSecret) {
    return accessToken || null;
  }

  try {
    const issuer = getSseIssuerUrl();
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch(`${issuer}/api/auth/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
      cache: "no-store",
    });

    if (!res.ok) return accessToken || null;

    const tokenData = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) return accessToken || null;

    await authAccounts.updateOne(
      { _id: account._id },
      {
        $set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          accessTokenExpiresAt: new Date(
            Date.now() + (tokenData.expires_in || 3600) * 1000
          ),
          updatedAt: new Date(),
        },
      }
    );

    return tokenData.access_token;
  } catch {
    return accessToken || null;
  }
}

export async function fetchSseUserInfo(
  userId: string
): Promise<SseUserInfoResponse | null> {
  const token = await getValidSseAccessToken(userId);
  if (!token) return null;

  try {
    const issuer = getSseIssuerUrl();
    const res = await fetch(`${issuer}/api/auth/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SseUserInfoResponse;
  } catch {
    return null;
  }
}

export async function fetchDiscordGuildsViaSseAccounts(userId: string): Promise<{
  ok: boolean;
  discordId: string | null;
  guilds: SseDiscordGuild[];
}> {
  const token = await getValidSseAccessToken(userId);
  if (!token) {
    return { ok: false, discordId: null, guilds: [] };
  }

  try {
    const issuer = getSseIssuerUrl();
    const res = await fetch(`${issuer}/api/sso/discord/guilds`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, discordId: null, guilds: [] };
    }
    const data = (await res.json()) as {
      discord_id?: string | null;
      guilds?: SseDiscordGuild[];
    };
    return {
      ok: true,
      discordId: data.discord_id ? String(data.discord_id) : null,
      guilds: Array.isArray(data.guilds) ? data.guilds : [],
    };
  } catch {
    return { ok: false, discordId: null, guilds: [] };
  }
}
