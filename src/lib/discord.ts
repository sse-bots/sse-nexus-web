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

export interface DiscordRoleOption {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export interface DiscordChannelOption {
  id: string;
  name: string;
  type: number;
  position: number;
  categoryName: string | null;
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
let supportResourcesCache: {
  guildName: string | null;
  roles: DiscordRoleOption[];
  channels: DiscordChannelOption[];
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

export async function fetchUserDiscordGuilds(
  userId: string
): Promise<RawDiscordGuild[]> {
  const { fetchDiscordGuildsViaSseAccounts } = await import("./sse-sso");
  const result = await fetchDiscordGuildsViaSseAccounts(userId);
  return result.guilds;
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

export function buildSupportServerInviteUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_SERVER_INVITE || "").trim();
}

export interface SupportMemberAccessResult {
  inSupportGuild: boolean;
  roles: string[];
  isSupportAdmin: boolean;
}

export async function fetchSupportMemberAccess(
  discordUserId: string
): Promise<SupportMemberAccessResult> {
  const token = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  if (!token || !supportGuildId || !discordUserId) {
    return { inSupportGuild: false, roles: [], isSupportAdmin: false };
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
      const isGuildOwner = guildMeta.ownerId === discordUserId;
      return {
        inSupportGuild: isGuildOwner,
        roles: [],
        isSupportAdmin: isGuildOwner,
      };
    }

    const member = (await memberRes.json()) as { roles?: string[] };
    const roles = Array.isArray(member.roles) ? member.roles.map(String) : [];
    const isSupportAdmin =
      guildMeta.ownerId === discordUserId ||
      roles.some((rid) => guildMeta.adminRoleIds.has(rid));

    return { inSupportGuild: true, roles, isSupportAdmin };
  } catch {
    return { inSupportGuild: false, roles: [], isSupportAdmin: false };
  }
}

export async function fetchSupportGuildResources(forceRefresh = false): Promise<{
  guildName: string | null;
  roles: DiscordRoleOption[];
  channels: DiscordChannelOption[];
}> {
  if (
    !forceRefresh &&
    supportResourcesCache &&
    Date.now() < supportResourcesCache.expiresAt
  ) {
    return {
      guildName: supportResourcesCache.guildName,
      roles: supportResourcesCache.roles,
      channels: supportResourcesCache.channels,
    };
  }

  const token = (process.env.HUB_DISCORD_TOKEN || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  if (!token || !supportGuildId) {
    return { guildName: null, roles: [], channels: [] };
  }

  try {
    const [guildRes, rolesRes, channelsRes] = await Promise.all([
      fetch(`${DISCORD_API}/guilds/${supportGuildId}`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }),
      fetch(`${DISCORD_API}/guilds/${supportGuildId}/roles`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }),
      fetch(`${DISCORD_API}/guilds/${supportGuildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }),
    ]);

    const guildData = guildRes.ok
      ? ((await guildRes.json()) as { name?: string })
      : null;

    const rawRoles = rolesRes.ok
      ? ((await rolesRes.json()) as Array<{
          id: string;
          name: string;
          color: number;
          position: number;
          managed?: boolean;
        }>)
      : [];

    const roles: DiscordRoleOption[] = Array.isArray(rawRoles)
      ? rawRoles
          .filter((r) => String(r.id) !== supportGuildId)
          .map((r) => ({
            id: String(r.id),
            name: r.name,
            color: Number(r.color || 0),
            position: Number(r.position || 0),
            managed: Boolean(r.managed),
          }))
          .sort((a, b) => b.position - a.position)
      : [];

    const rawChannels = channelsRes.ok
      ? ((await channelsRes.json()) as Array<{
          id: string;
          name: string;
          type: number;
          position?: number;
          parent_id?: string | null;
        }>)
      : [];

    const categoryMap = new Map<string, { name: string; position: number }>();
    if (Array.isArray(rawChannels)) {
      for (const ch of rawChannels) {
        if (ch.type === 4) {
          categoryMap.set(String(ch.id), {
            name: ch.name,
            position: Number(ch.position || 0),
          });
        }
      }
    }

    const channels: DiscordChannelOption[] = Array.isArray(rawChannels)
      ? rawChannels
          .filter((ch) => ch.type === 0 || ch.type === 5)
          .map((ch) => {
            const cat = ch.parent_id
              ? categoryMap.get(String(ch.parent_id))
              : undefined;
            return {
              id: String(ch.id),
              name: ch.name,
              type: ch.type,
              position: Number(ch.position || 0),
              categoryName: cat?.name || null,
            };
          })
          .sort((a, b) => {
            const catCmp = (a.categoryName || "").localeCompare(
              b.categoryName || ""
            );
            return catCmp !== 0 ? catCmp : a.position - b.position;
          })
      : [];

    supportResourcesCache = {
      guildName: guildData?.name || null,
      roles,
      channels,
      expiresAt: Date.now() + 60_000,
    };

    return {
      guildName: supportResourcesCache.guildName,
      roles,
      channels,
    };
  } catch {
    return { guildName: null, roles: [], channels: [] };
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
