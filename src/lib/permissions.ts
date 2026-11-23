import { headers } from "next/headers";
import type { Document, Filter } from "mongodb";
import { auth } from "./auth";
import { getCollections, getMongoClient, userDocMatch } from "./mongodb";
import {
  buildSupportServerInviteUrl,
  fetchSupportMemberAccess,
} from "./discord";
import { fetchSseUserInfo, getPublicSseAccountsUrl } from "./sse-sso";

export type PortalBlockReason =
  | "discord_not_linked"
  | "not_in_server"
  | "missing_member_role"
  | null;

export interface SessionContext {
  userId: string;
  discordId: string;
  discordUsername: string | null;
  githubId: string | null;
  githubUsername: string | null;
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
  /** Support Server membership & required Member Role verification */
  inSupportGuild: boolean;
  hasRequiredMemberRole: boolean;
  canAccessPortal: boolean;
  portalBlockReason: PortalBlockReason;
  supportInviteUrl: string;
  accountsUrl: string;
  isBlacklisted: boolean;
  blacklistedRoleIds: string[];
  supportRoles: string[];
}

export async function getSessionContext(): Promise<SessionContext | null> {
  await getMongoClient();

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;

  const { authUsers, guildSettings } = await getCollections();
  const userDoc = await authUsers.findOne(
    userDocMatch(session.user.id) as unknown as Filter<Document>
  );
  const userRecord = session.user as unknown as Record<string, unknown>;

  let discordId = String(
    userDoc?.discordId || userRecord.discordId || ""
  ).trim();
  let discordUsername =
    typeof userDoc?.discordUsername === "string"
      ? userDoc.discordUsername
      : typeof userRecord.discordUsername === "string"
        ? userRecord.discordUsername
        : null;
  let githubId =
    typeof userDoc?.githubId === "string"
      ? userDoc.githubId
      : typeof userRecord.githubId === "string"
        ? userRecord.githubId
        : null;
  let githubUsername =
    typeof userDoc?.githubUsername === "string"
      ? userDoc.githubUsername
      : typeof userRecord.githubUsername === "string"
        ? userRecord.githubUsername
        : null;

  // If Discord isn't linked yet on local Nexus record, fetch fresh claims from SSE Accounts /userinfo
  // (picks up newly linked Discord accounts immediately without needing logout!)
  if (!discordId) {
    const freshInfo = await fetchSseUserInfo(session.user.id);
    if (freshInfo) {
      const updates: Record<string, unknown> = {};
      if (freshInfo.discord_id) {
        discordId = String(freshInfo.discord_id);
        updates.discordId = discordId;
      }
      if (freshInfo.discord_username) {
        discordUsername = String(freshInfo.discord_username);
        updates.discordUsername = discordUsername;
      }
      if (freshInfo.github_id) {
        githubId = String(freshInfo.github_id);
        updates.githubId = githubId;
      }
      if (freshInfo.github_username) {
        githubUsername = String(freshInfo.github_username);
        updates.githubUsername = githubUsername;
      }
      if (freshInfo.name && freshInfo.name !== userDoc?.name) {
        updates.name = freshInfo.name;
      }
      if (freshInfo.picture && freshInfo.picture !== userDoc?.image) {
        updates.image = freshInfo.picture;
      }
      if (Object.keys(updates).length > 0) {
        await authUsers
          .updateOne(
            userDocMatch(session.user.id) as unknown as Filter<Document>,
            { $set: { ...updates, updatedAt: new Date() } }
          )
          .catch(() => {});
      }
    }
  }

  const ownerId = (process.env.HUB_OWNER_ID || "").trim();
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  const isOwner = Boolean(ownerId && discordId && discordId === ownerId);

  const [cfg, supportAccess] = await Promise.all([
    supportGuildId ? guildSettings.findOne({ guild_id: supportGuildId }) : null,
    discordId
      ? fetchSupportMemberAccess(discordId)
      : Promise.resolve({
          inSupportGuild: false,
          roles: [],
          isSupportAdmin: false,
        }),
  ]);

  const modRoleIds = new Set<string>(
    ((cfg?.moderator_role_ids as string[]) || []).map(String)
  );
  const blockedRoleIds = new Set<string>(
    ((cfg?.blacklisted_role_ids as string[]) || []).map(String)
  );
  const requiredMemberRoleIds = new Set<string>(
    ((cfg?.member_role_ids as string[]) || []).map(String)
  );

  const supportRoles = supportAccess.roles;
  const inSupportGuild = supportAccess.inSupportGuild;
  const isSupportAdmin = supportAccess.isSupportAdmin;
  const isSupportMod = supportRoles.some((roleId) => modRoleIds.has(roleId));
  const isAdmin = isOwner || isSupportAdmin;
  const isStaff = isAdmin || isSupportMod;

  const hasRequiredMemberRole =
    requiredMemberRoleIds.size === 0 ||
    supportRoles.some((roleId) => requiredMemberRoleIds.has(roleId));

  let portalBlockReason: PortalBlockReason = null;
  if (!discordId) {
    portalBlockReason = "discord_not_linked";
  } else if (supportGuildId && !isStaff) {
    if (!inSupportGuild) {
      portalBlockReason = "not_in_server";
    } else if (!hasRequiredMemberRole) {
      portalBlockReason = "missing_member_role";
    }
  }

  const canAccessPortal = portalBlockReason === null;
  const matchedBlocked = supportRoles.filter((roleId) =>
    blockedRoleIds.has(roleId)
  );

  return {
    userId: session.user.id,
    discordId,
    discordUsername,
    githubId,
    githubUsername,
    name: String(userDoc?.name || session.user.name || "SSE User"),
    email: String(userDoc?.email || session.user.email || ""),
    image: (userDoc?.image as string | null) ?? session.user.image ?? null,
    isOwner,
    isSupportAdmin,
    isSupportMod,
    isAdmin,
    isStaff,
    inSupportGuild,
    hasRequiredMemberRole,
    canAccessPortal,
    portalBlockReason,
    supportInviteUrl: buildSupportServerInviteUrl(),
    accountsUrl: getPublicSseAccountsUrl(),
    isBlacklisted: !isAdmin && matchedBlocked.length > 0,
    blacklistedRoleIds: matchedBlocked,
    supportRoles,
  };
}
