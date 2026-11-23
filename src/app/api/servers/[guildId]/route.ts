import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionContext } from "@/lib/permissions";
import {
  fetchGuildTextChannels,
  fetchUserDiscordGuilds,
  getNexusPresentGuildIds,
  hasManageGuild,
} from "@/lib/discord";
import { getCollections, serializeDoc } from "@/lib/mongodb";
import { decryptKeyForWeb } from "@/lib/crypto";

export async function GET(
  _req: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.canAccessPortal) {
    return NextResponse.json(
      {
        error:
          ctx.portalBlockReason === "missing_member_role"
            ? "You must hold the required Member role in the SSE Support Server to use this portal."
            : "You must join the SSE Support Server before using this portal.",
        portalBlockReason: ctx.portalBlockReason,
        supportInviteUrl: ctx.supportInviteUrl,
      },
      { status: 403 }
    );
  }

  const { guildId } = await context.params;
  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
  }

  const [userGuilds, nexusGuildIds] = await Promise.all([
    fetchUserDiscordGuilds(ctx.userId),
    getNexusPresentGuildIds(),
  ]);

  const guild = userGuilds.find((g) => g.id === guildId);
  const canManage = guild ? hasManageGuild(guild.permissions, guild.owner) : false;

  if (!ctx.isStaff && !canManage) {
    return NextResponse.json(
      { error: "You do not have permission to manage this server." },
      { status: 403 }
    );
  }

  const isActualOwner = Boolean(guild?.owner) || ctx.isOwner;
  const nexusPresent = nexusGuildIds.has(guildId);

  const { bots, servers, requests, keys, logs, guildSettings } =
    await getCollections();

  const [
    activeBots,
    serverRecords,
    guildRequests,
    guildKeys,
    recentLogs,
    guildCfg,
    channels,
  ] = await Promise.all([
    bots.find({ status: "active" }).sort({ name: 1 }).toArray(),
    servers.find({ guild_id: guildId }).toArray(),
    requests
      .find({ guild_id: guildId })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray(),
    keys
      .find({ guild_id: guildId })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray(),
    logs
      .find({ guild_id: guildId })
      .sort({ created_at: -1 })
      .limit(25)
      .toArray(),
    guildSettings.findOne({ guild_id: guildId }),
    fetchGuildTextChannels(guildId),
  ]);

  const serverStatusMap = new Map(
    serverRecords.map((r) => [String(r.bot_activation_id), r])
  );
  const keyById = new Map(guildKeys.map((k) => [String(k._id), k]));
  const announcementChannels =
    (guildCfg?.announcement_channels as Record<string, string>) || {};

  // Build ready-to-use keys (approved & unused) — decrypt ONLY for actual owner
  const readyKeys: Array<Record<string, unknown>> = [];
  const seenKeyIds = new Set<string>();

  for (const keyDoc of guildKeys) {
    if (keyDoc.status !== "unused") continue;
    const keyIdStr = String(keyDoc._id);
    seenKeyIds.add(keyIdStr);
    const decrypted = isActualOwner
      ? decryptKeyForWeb(keyDoc.encrypted_key as string | undefined)
      : null;

    const scope = (keyDoc.key_scope as string) || "single";
    const botIds: string[] = Array.isArray(keyDoc.bot_activation_ids)
      ? keyDoc.bot_activation_ids.map(String)
      : keyDoc.bot_activation_id && keyDoc.bot_activation_id !== "__GLOBAL__"
        ? [String(keyDoc.bot_activation_id)]
        : [];

    const botNames =
      scope === "global"
        ? ["All Activation-Required SSE Bots"]
        : botIds.map(
            (id) =>
              activeBots.find((b) => b.activation_id === id)?.name || id
          );

    readyKeys.push({
      key_id: keyIdStr,
      request_id: keyDoc.request_id || null,
      key_scope: scope,
      bot_activation_ids: botIds,
      bot_names: botNames,
      plaintext_key: decrypted,
      created_at: keyDoc.created_at,
      expires_at: keyDoc.expires_at || null,
      redeemed_bots: Array.isArray(keyDoc.redeemed_bot_ids)
        ? keyDoc.redeemed_bot_ids
        : [],
    });
  }

  // Also check approved requests whose key was generated via Discord (no encrypted_key)
  for (const reqDoc of guildRequests) {
    if (reqDoc.status !== "approved") continue;
    const linkedKey = reqDoc.key_id ? keyById.get(String(reqDoc.key_id)) : null;
    if (linkedKey && linkedKey.status !== "unused") continue;
    if (linkedKey && seenKeyIds.has(String(linkedKey._id))) continue;
    if (reqDoc.encrypted_key && (!linkedKey || linkedKey.status === "unused")) {
      const decrypted = isActualOwner
        ? decryptKeyForWeb(reqDoc.encrypted_key as string)
        : null;
      readyKeys.push({
        key_id: reqDoc.key_id || String(reqDoc._id),
        request_id: String(reqDoc._id),
        key_scope: reqDoc.key_scope || "single",
        bot_activation_ids: reqDoc.bot_activation_ids || [reqDoc.bot_activation_id],
        bot_names: reqDoc.bot_names || [reqDoc.bot_name],
        plaintext_key: decrypted,
        created_at: reqDoc.approved_at || reqDoc.created_at,
        expires_at: null,
        redeemed_bots: [],
      });
    }
  }

  // Track pending requests per bot and global
  const pendingRequests = guildRequests.filter((r) => r.status === "pending");
  const pendingBotIds = new Set<string>();
  let hasPendingGlobal = false;

  for (const p of pendingRequests) {
    const scope = p.key_scope || "single";
    if (scope === "global" || p.bot_activation_id === "__GLOBAL__") {
      hasPendingGlobal = true;
    } else if (Array.isArray(p.bot_activation_ids)) {
      for (const bid of p.bot_activation_ids) pendingBotIds.add(String(bid));
    } else if (p.bot_activation_id) {
      pendingBotIds.add(String(p.bot_activation_id));
    }
  }

  // Track ready (approved unused) key coverage per bot
  const readyBotKeyMap = new Map<string, Record<string, unknown>>();
  let hasReadyGlobalKey = false;
  for (const rk of readyKeys) {
    if (rk.key_scope === "global") {
      hasReadyGlobalKey = true;
    } else {
      for (const bid of (rk.bot_activation_ids as string[]) || []) {
        readyBotKeyMap.set(bid, rk);
      }
    }
  }

  const botViews = activeBots.map((bot) => {
    const aid = String(bot.activation_id);
    const srv = serverStatusMap.get(aid);
    const serverStatus = srv ? String(srv.status) : "none";
    const isPending = pendingBotIds.has(aid);
    const readyKey = readyBotKeyMap.get(aid) || null;

    let state:
      | "active"
      | "inactive"
      | "revoked"
      | "approved_key_ready"
      | "pending"
      | "free"
      | "available";

    if (!bot.activation_required) {
      state = "free";
    } else if (serverStatus === "active") {
      state = "active";
    } else if (serverStatus === "inactive") {
      state = "inactive";
    } else if (readyKey) {
      state = "approved_key_ready";
    } else if (isPending) {
      state = "pending";
    } else if (serverStatus === "revoked") {
      state = "revoked";
    } else {
      state = "available";
    }

    return {
      activation_id: aid,
      name: bot.name,
      discord_bot_id: bot.discord_bot_id,
      description: bot.description || "Official SSE bot.",
      invite_url:
        bot.invite_url ||
        `https://discord.com/oauth2/authorize?client_id=${bot.discord_bot_id}&scope=bot%20applications.commands&permissions=0`,
      activation_required: Boolean(bot.activation_required),
      maintenance_mode: Boolean(bot.maintenance_mode),
      heartbeat_status: bot.heartbeat_status || "unknown",
      state,
      activated_at: srv?.activated_at || null,
      deactivated_at: srv?.deactivated_at || null,
      expires_at: srv?.expires_at || null,
      key_scope: srv?.key_scope || null,
      announcement_channel_id: announcementChannels[aid] || null,
      ready_key: readyKey,
    };
  });

  const activationRequiredBots = botViews.filter((b) => b.activation_required);
  const allBotsActive =
    activationRequiredBots.length > 0 &&
    activationRequiredBots.every((b) => b.state === "active");

  return NextResponse.json({
    guild: {
      id: guildId,
      name: guild?.name || `Server ${guildId}`,
      icon: guild?.icon || null,
      isOwner: isActualOwner,
      nexusPresent,
    },
    user: {
      discordId: ctx.discordId,
      isBlacklisted: ctx.isBlacklisted,
      isStaff: ctx.isStaff,
    },
    globalActivation: {
      totalActivationBots: activationRequiredBots.length,
      activeCount: activationRequiredBots.filter((b) => b.state === "active").length,
      allActive: allBotsActive,
      hasPendingGlobal,
      hasReadyGlobalKey,
    },
    readyKeys: readyKeys.map((k) => serializeDoc(k)),
    bots: botViews.map((b) => serializeDoc(b)),
    pendingRequests: pendingRequests.map((r) => serializeDoc(r)),
    recentRequests: guildRequests.slice(0, 15).map((r) => {
      const clean = { ...r };
      delete clean.encrypted_key;
      return serializeDoc(clean);
    }),
    recentLogs: recentLogs.map((l) => serializeDoc(l)),
    channels,
  });
}
