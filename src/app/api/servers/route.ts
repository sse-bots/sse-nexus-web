import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import {
  fetchUserDiscordGuilds,
  getNexusPresentGuildIds,
  hasManageGuild,
} from "@/lib/discord";
import { getCollections } from "@/lib/mongodb";
import type { DiscordGuildSummary } from "@/lib/types";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [userGuilds, nexusGuildIds] = await Promise.all([
      fetchUserDiscordGuilds(ctx.userId),
      getNexusPresentGuildIds(),
    ]);

    const manageable = userGuilds.filter((g) => hasManageGuild(g.permissions, g.owner));
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

    const summaries: DiscordGuildSummary[] = manageable.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: Boolean(g.owner),
      permissions: g.permissions,
      canManage: true,
      nexusPresent: nexusGuildIds.has(g.id),
      activeBotCount: activeCount.get(g.id) || 0,
      pendingRequestCount: pendingCount.get(g.id) || 0,
      readyKeyCount: readyKeyCount.get(g.id) || 0,
    }));

    const withNexus = summaries
      .filter((s) => s.nexusPresent)
      .sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name));
    const withoutNexus = summaries
      .filter((s) => !s.nexusPresent)
      .sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name));

    return NextResponse.json({
      serversWithNexus: withNexus,
      otherManagedServers: withoutNexus,
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
