import { getCollections, userIdFilter } from "./mongodb";

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

export function hasAdminPermission(permissions: string): boolean {
  try {
    const bits = BigInt(permissions || "0");
    return (bits & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT;
  } catch {
    return false;
  }
}

export function buildNexusInviteUrl(guildId?: string): string {
  const configured = (process.env.NEXT_PUBLIC_NEXUS_INVITE_URL || "").trim();
  const clientId = (process.env.DISCORD_CLIENT_ID || "").trim();
  const base =
    configured ||
    (clientId
      ? `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8`
      : "https://discord.com/oauth2/authorize");

  if (!guildId) return base;
  try {
    const url = new URL(base);
    url.searchParams.set("guild_id", guildId);
    url.searchParams.set("disable_guild_select", "true");
    return url.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}guild_id=${guildId}&disable_guild_select=true`;
  }
}

let botGuildsCache: { ids: Set<string>; expiresAt: number } | null = null;
let supportGuildMetaCache: {
  ownerId: string | null;
  adminRoleIds: Set<string>;
  expiresAt: number;
} | null = null;

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

export async function getNexusPresentGuildIds(
  forceRefresh = false
): Promise<Set<string>> {
  if (!forceRefresh && botGuildsCache && Date.now() < botGuildsCache.expiresAt) {
    return new Set(botGuildsCache.ids);
  }

  const ids = new Set<string>();
  const { botInstallations, bots } = await getCollections();

  // 1. Check MongoDB bot_installations
  const nexusActivationId = (process.env.NEXUS_ACTIVATION_ID || "").trim();
  const activationIdsToCheck: string[] = [];

  if (nexusActivationId) {
    activationIdsToCheck.push(nexusActivationId);
  } else {
    const nexusBots = await bots
      .find(
        { status: "active", name: { $regex: /nexus/i } },
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
        { bot_activation_id: { $in: activationIdsToCheck }, status: "active" },
        { projection: { guild_id: 1 } }
      )
      .toArray();
    for (const row of installs) {
      if (row.guild_id) ids.add(String(row.guild_id));
    }
  }

  // 2. Check live Discord Bot API guild list (prefer NEXUS_DISCORD_TOKEN, fallback HUB_DISCORD_TOKEN)
  const tokenToUse =
    (process.env.NEXUS_DISCORD_TOKEN || "").trim() ||
    (process.env.HUB_DISCORD_TOKEN || "").trim();

  if (tokenToUse) {
    try {
      const apiIds = await fetchBotGuildIdsFromDiscord(tokenToUse);
      for (const id of apiIds) ids.add(id);
    } catch {
      // Keep MongoDB results if Discord API temporarily fails
    }
  }

  botGuildsCache = { ids, expiresAt: Date.now() + 30_000 };
  return new Set(ids);
}

async function getValidUserDiscordAccessToken(
  userId: string
): Promise<string | null> {
  const { authAccounts } = await getCollections();
  const account = await authAccounts.findOne({
    userId: userIdFilter(userId),
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

  if (
    !refreshToken ||
    !process.env.DISCORD_CLIENT_ID ||
    !process.env.DISCORD_CLIENT_SECRET
  ) {
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
          accessTokenExpiresAt: new Date(
            Date.now() + tokenData.expires_in * 1000
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

export async function fetchUserDiscordGuilds(
  userId: string
): Promise<RawDiscordGuild[]> {
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

async function getSupportGuildMeta(): Promise<{
  ownerId: string | null;
  adminRoleIds: Set<string>;
}> {
  if (supportGuildMetaCache && Date.now() < supportGuildMetaCache.expiresAt) {
    return supportGuildMetaCache;
  }

  const token = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  const empty = { ownerId: null, adminRoleIds: new Set<string>() };
  if (!token || !supportGuildId) return empty;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${supportGuildId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const guild = (await res.json()) as {
      owner_id?: string;
      roles?: Array<{ id: string; permissions: string }>;
    };
    const adminRoleIds = new Set<string>();
    for (const role of guild.roles || []) {
      if (hasAdminPermission(role.permissions)) {
        adminRoleIds.add(String(role.id));
      }
    }
    const meta = {
      ownerId: guild.owner_id ? String(guild.owner_id) : null,
      adminRoleIds,
      expiresAt: Date.now() + 60_000,
    };
    supportGuildMetaCache = meta;
    return meta;
  } catch {
    return empty;
  }
}

export async function fetchSupportMemberAccess(discordUserId: string): Promise<{
  roles: string[];
  isSupportAdmin: boolean;
}> {
  const token = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  if (!token || !supportGuildId || !discordUserId) {
    return { roles: [], isSupportAdmin: false };
  }

  try {
    const [memberRes, guildMeta] = await Promise.all([
      fetch(
        `${DISCORD_API}/guilds/${supportGuildId}/members/${discordUserId}`,
        {
          headers: { Authorization: `Bot ${token}` },
          cache: "no-store",
        }
      ),
      getSupportGuildMeta(),
    ]);

    if (!memberRes.ok) {
      return {
        roles: [],
        isSupportAdmin: guildMeta.ownerId === discordUserId,
      };
    }

    const member = (await memberRes.json()) as { roles?: string[] };
    const roles = Array.isArray(member.roles) ? member.roles.map(String) : [];
    const isSupportAdmin =
      guildMeta.ownerId === discordUserId ||
      roles.some((rid) => guildMeta.adminRoleIds.has(rid));

    return { roles, isSupportAdmin };
  } catch {
    return { roles: [], isSupportAdmin: false };
  }
}

export async function fetchGuildTextChannels(
  guildId: string
): Promise<DiscordTextChannel[]> {
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
