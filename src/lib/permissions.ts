import { headers } from "next/headers";
import { auth } from "./auth";
import { getCollections, userIdFilter } from "./mongodb";
import { fetchSupportMemberAccess } from "./discord";

export interface SessionContext {
  userId: string;
  discordId: string;
  name: string;
  email: string;
  image: string | null;
  isOwner: boolean;
  isSupportAdmin: boolean;
  isSupportMod: boolean;
  /** Hub Owner OR Support Server Administrator */
  isAdmin: boolean;
  /** Hub Owner OR Support Server Admin OR Support Server Moderator */
  isStaff: boolean;
  isBlacklisted: boolean;
  blacklistedRoleIds: string[];
  supportRoles: string[];
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;

  const { authAccounts, authUsers, guildSettings } = await getCollections();
  const userRecord = session.user as unknown as Record<string, unknown>;
  let discordId = String(userRecord.discordId || "").trim();

  if (!discordId) {
    const acc = await authAccounts.findOne({
      userId: userIdFilter(session.user.id),
      providerId: "discord",
    });
    if (acc?.accountId) {
      discordId = String(acc.accountId);
      await authUsers
        .updateOne(
          { _id: userIdFilter(session.user.id) },
          { $set: { discordId } }
        )
        .catch(() => {});
    }
  }

  const ownerId = (process.env.HUB_OWNER_ID || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  const isOwner = Boolean(ownerId && discordId && discordId === ownerId);

  const [cfg, supportAccess] = await Promise.all([
    supportGuildId ? guildSettings.findOne({ guild_id: supportGuildId }) : null,
    discordId
      ? fetchSupportMemberAccess(discordId)
      : Promise.resolve({ roles: [], isSupportAdmin: false }),
  ]);

  const modRoleIds = new Set<string>(
    ((cfg?.moderator_role_ids as string[]) || []).map(String)
  );
  const blockedRoleIds = new Set<string>(
    ((cfg?.blacklisted_role_ids as string[]) || []).map(String)
  );

  const supportRoles = supportAccess.roles;
  const isSupportAdmin = supportAccess.isSupportAdmin;
  const isSupportMod = supportRoles.some((roleId) => modRoleIds.has(roleId));
  const isAdmin = isOwner || isSupportAdmin;
  const isStaff = isAdmin || isSupportMod;

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
    isSupportAdmin,
    isSupportMod,
    isAdmin,
    isStaff,
    isBlacklisted: !isAdmin && matchedBlocked.length > 0,
    blacklistedRoleIds: matchedBlocked,
    supportRoles,
  };
}
