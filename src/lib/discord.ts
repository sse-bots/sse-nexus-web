import { getCollections } from "./mongodb";

const DISCORD_API = "https://discord.com/api/v10";

export interface RawDiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordTextChannel {
  id: string;
  name: string;
  type: number;
  position?: number;
}

const MANAGE_GUILD_BIT = BigInt(0x20);
const ADMINISTRATOR_BIT = BigInt(0x8);

export function hasManageGuild(permissions: string, isOwner: boolean): boolean {
  if (isOwner) return true;
  try {
    const bits = BigInt(permissions || "0");
    return (
      (bits & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT ||
      (bits & MANAGE_GUILD_BIT) === MANAGE_GUILD_BIT
    );
  } catch {
    return false;
  }
}

export function guildIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=128`;
}

// Simple in-memory cache (60s) to avoid Discord rate limits on bot guild lookups
let botGuildsCache: { ids: Set<string>; expiresAt: number } | null = null;

async function fetchBotGuildIdsFromDiscord(token: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const url = new URL(`${DISCORD_API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (!res.ok) break;
    const rows = (await res.json()) as Array<{ id: string }>;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) ids.add(String(row.id));
    if (rows.length < 200) break;
    after = rows[rows.length - 1].id;
  }
  return ids;
}

/**
 * Returns the set of Discord guild IDs where SSE Nexus (or Hub bot) is present.
 * Combines:
 * 1. MongoDB `bot_installations` for NEXUS_ACTIVATION_ID (or bots named Nexus / Hub)
 * 2. Live Discord Bot API guild list from NEXUS_DISCORD_TOKEN or HUB_DISCORD_TOKEN
 */
export async function getNexusPresentGuildIds(): Promise<Set<string>> {
  if (botGuildsCache && Date.now() < botGuildsCache.expiresAt) {
    return new Set(botGuildsCache.ids);
  }

  const ids = new Set<string>();
  const { botInstallations, bots } = await getCollections();

  // 1. MongoDB bot_installations lookup for Nexus
  const nexusActivationId = (process.env.NEXUS_ACTIVATION_ID || "").trim();
  const activationIdsToCheck: string[] = [];

  if (nexusActivationId) {
    activationIdsToCheck.push(nexusActivationId);
  } else {
    const nexusBots = await bots
      .find(
        {
          status: "active",
          name: { $regex: /nexus/i },
        },
        { projection: { activation_id: 1 } }
      )
      .toArray();
    for (const b of nexusBots) {
      if (b.activation_id) activationIdsToCheck.push(String(b.activation_id));
    }
  }

  if (activationIdsToCheck.length > 0) {
    const installs = await botInstallations
      .find(
        {
          bot_activation_id: { $in: activationIdsToCheck },
          status: "active",
        },
        { projection: { guild_id: 1 } }
      )
      .toArray();
    for (const row of installs) {
      if (row.guild_id) ids.add(String(row.guild_id));
    }
  }

  // 2. Discord Bot API check (prefer NEXUS_DISCORD_TOKEN, fallback to HUB_DISCORD_TOKEN)
  const nexusToken = (process.env.NEXUS_DISCORD_TOKEN || "").trim();
  const hubToken = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const tokenToUse = nexusToken || hubToken;

  if (tokenToUse) {
    try {
      const apiIds = await fetchBotGuildIdsFromDiscord(tokenToUse);
      for (const id of apiIds) ids.add(id);
    } catch {
      // Keep MongoDB results if Discord API temporarily fails
    }
  }

  botGuildsCache = { ids, expiresAt: Date.now() + 60_000 };
  return new Set(ids);
}

/**
 * Refresh the user's Discord OAuth access token if expired, then fetch their Discord guilds.
 */
async function getValidUserDiscordAccessToken(userId: string): Promise<string | null> {
  const { authAccounts } = await getCollections();
  const account = await authAccounts.findOne({
    userId,
    providerId: "discord",
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

  if (!refreshToken || !process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return accessToken || null;
  }

  try {
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) return accessToken || null;
    const tokenData = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    await authAccounts.updateOne(
      { _id: account._id },
      {
        $set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          accessTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          updatedAt: new Date(),
        },
      }
    );
    return tokenData.access_token;
  } catch {
    return accessToken || null;
  }
}

export async function fetchUserDiscordGuilds(userId: string): Promise<RawDiscordGuild[]> {
  const token = await getValidUserDiscordAccessToken(userId);
  if (!token) return [];
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as RawDiscordGuild[]) : [];
}

export async function fetchSupportMemberRoles(discordUserId: string): Promise<string[]> {
  const token = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  if (!token || !supportGuildId || !discordUserId) return [];
  try {
    const res = await fetch(
      `${DISCORD_API}/guilds/${supportGuildId}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { roles?: string[] };
    return Array.isArray(data.roles) ? data.roles.map(String) : [];
  } catch {
    return [];
  }
}

export async function fetchGuildTextChannels(guildId: string): Promise<DiscordTextChannel[]> {
  const token =
    (process.env.HUB_DISCORD_TOKEN || "").trim() ||
    (process.env.NEXUS_DISCORD_TOKEN || "").trim();
  if (!token) return [];
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as DiscordTextChannel[];
    if (!Array.isArray(data)) return [];
    // Type 0 = GUILD_TEXT, Type 5 = GUILD_ANNOUNCEMENT
    return data
      .filter((ch) => ch.type === 0 || ch.type === 5)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  } catch {
    return [];
  }
}

export async function verifyGuildOwnerViaBot(guildId: string): Promise<{
  present: boolean;
  ownerId: string | null;
  name: string | null;
}> {
  const tokens = [
    (process.env.NEXUS_DISCORD_TOKEN || "").trim(),
    (process.env.HUB_DISCORD_TOKEN || "").trim(),
  ].filter(Boolean);

  for (const token of tokens) {
    try {
      const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { owner_id?: string; name?: string };
        return {
          present: true,
          ownerId: data.owner_id ? String(data.owner_id) : null,
          name: data.name || null,
        };
      }
    } catch {
      // try next token
    }
  }
  return { present: false, ownerId: null, name: null };
}
