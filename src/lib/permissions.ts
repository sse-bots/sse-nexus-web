import { headers } from "next/headers";
import { auth } from "./auth";
import { getCollections } from "./mongodb";
import { fetchSupportMemberRoles } from "./discord";

export interface SessionContext {
  userId: string;
  discordId: string;
  name: string;
  email: string;
  image: string | null;
  isOwner: boolean;
  isStaff: boolean;
  isBlacklisted: boolean;
  blacklistedRoleIds: string[];
  supportRoles: string[];
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;

  const { authAccounts, guildSettings } = await getCollections();
  let discordId = String(
    (session.user as Record<string, unknown>).discordId || ""
  ).trim();

  if (!discordId) {
    const acc = await authAccounts.findOne({
      userId: session.user.id,
      providerId: "discord",
    });
    if (acc?.accountId) {
      discordId = String(acc.accountId);
    }
  }

  const ownerId = (process.env.HUB_OWNER_ID || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  const isOwner = Boolean(ownerId && discordId && discordId === ownerId);

  const cfg = supportGuildId
    ? await guildSettings.findOne({ guild_id: supportGuildId })
    : null;
  const modRoleIds = new Set<string>(
    ((cfg?.moderator_role_ids as string[]) || []).map(String)
  );
  const blockedRoleIds = new Set<string>(
    ((cfg?.blacklisted_role_ids as string[]) || []).map(String)
  );

  const supportRoles = discordId
    ? await fetchSupportMemberRoles(discordId)
    : [];

  const isStaff =
    isOwner || supportRoles.some((roleId) => modRoleIds.has(roleId));
  const matchedBlocked = supportRoles.filter((roleId) =>
    blockedRoleIds.has(roleId)
  );

  return {
    userId: session.user.id,
    discordId,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    isOwner,
    isStaff,
    isBlacklisted: !isOwner && matchedBlocked.length > 0,
    blacklistedRoleIds: matchedBlocked,
    supportRoles,
  };
}
