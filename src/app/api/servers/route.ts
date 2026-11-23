import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import {
  buildNexusInviteUrl,
  fetchUserDiscordGuilds,
  getNexusPresentGuildIds,
  hasManageGuild,
} from "@/lib/discord";
import { getCollections } from "@/lib/mongodb";

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.canAccessPortal) {
    return NextResponse.json(
      {
        error:
          ctx.portalBlockReason === "discord_not_linked"
            ? "Link your Discord account on SSE Accounts before using SSE Nexus."
            : ctx.portalBlockReason === "missing_member_role"
              ? "You must hold the required Member role in the SSE Support Server to use this portal."
              : "You must join the SSE Support Server before using this portal.",
        portalBlockReason: ctx.portalBlockReason,
        supportInviteUrl: ctx.supportInviteUrl,
        accountsUrl: ctx.accountsUrl,
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  try {
    const [userGuilds, nexusGuildIds] = await Promise.all([
      fetchUserDiscordGuilds(ctx.userId),
      getNexusPresentGuildIds(forceRefresh),
    ]);

    const manageable = userGuilds.filter((g) =>
      hasManageGuild(g.permissions, g.owner)
    );
    const guildIds = manageable.map((g) => g.id);

    const { servers, requests, keys } = await getCollections();

    const [activeRows, pendingRows, readyKeyRows] = await Promise.all([
      servers
        .find({ guild_id: { $in: guildIds }, status: "active" })
        .project({ guild_id: 1 })
        .toArray(),
      requests
        .find({ guild_id: { $in: guildIds }, status: "pending" })
        .project({ guild_id: 1 })
        .toArray(),
      keys
        .find({
          guild_id: { $in: guildIds },
          status: "unused",
          encrypted_key: { $exists: true, $ne: null },
        })
        .project({ guild_id: 1 })
        .toArray(),
    ]);

    const activeCount = new Map<string, number>();
    for (const r of activeRows) {
      const gid = String(r.guild_id);
      activeCount.set(gid, (activeCount.get(gid) || 0) + 1);
    }

    const pendingCount = new Map<string, number>();
    for (const r of pendingRows) {
      const gid = String(r.guild_id);
      pendingCount.set(gid, (pendingCount.get(gid) || 0) + 1);
    }

    const readyKeyCount = new Map<string, number>();
    for (const r of readyKeyRows) {
      const gid = String(r.guild_id);
      readyKeyCount.set(gid, (readyKeyCount.get(gid) || 0) + 1);
    }

    const allServers = manageable
      .map((g) => {
        const nexusPresent = nexusGuildIds.has(g.id);
        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          owner: Boolean(g.owner),
          permissions: g.permissions,
          canManage: true,
          nexusPresent,
          inviteUrl: buildNexusInviteUrl(g.id),
          activeBotCount: activeCount.get(g.id) || 0,
          pendingRequestCount: pendingCount.get(g.id) || 0,
          readyKeyCount: readyKeyCount.get(g.id) || 0,
        };
      })
      .sort(
        (a, b) =>
          Number(b.nexusPresent) - Number(a.nexusPresent) ||
          Number(b.owner) - Number(a.owner) ||
          a.name.localeCompare(b.name)
      );

    return NextResponse.json({
      servers: allServers,
      serversWithNexus: allServers.filter((s) => s.nexusPresent),
      otherManagedServers: allServers.filter((s) => !s.nexusPresent),
      nexusInviteUrl: buildNexusInviteUrl(),
      user: {
        discordId: ctx.discordId,
        isBlacklisted: ctx.isBlacklisted,
      },
    });
  } catch (err) {
    console.error("GET /api/servers failed:", err);
    return NextResponse.json(
      { error: "Failed to load your Discord servers." },
      { status: 500 }
    );
  }
}
