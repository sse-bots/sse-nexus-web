import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { fetchUserDiscordGuilds, hasManageGuild } from "@/lib/discord";
import { getCollections } from "@/lib/mongodb";

const patchSchema = z.object({
  action: z.enum(["deactivate", "reactivate", "set_announcement_channel"]),
  channel_id: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ guildId: string; activationId: string }> }
) {
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

  const { guildId, activationId } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const userGuilds = await fetchUserDiscordGuilds(ctx.userId);
  const guild = userGuilds.find((g) => g.id === guildId);
  const isOwner = Boolean(guild?.owner) || ctx.isOwner;
  const canManage = Boolean(guild && hasManageGuild(guild.permissions, guild.owner)) || ctx.isOwner;

  const { servers, bots, logs, guildSettings, webSyncEvents } = await getCollections();
  const { action, channel_id } = parsed.data;
  const now = new Date();

  if (action === "set_announcement_channel") {
    if (!canManage) {
      return NextResponse.json(
        { error: "Manage Server permission is required." },
        { status: 403 }
      );
    }
    if (channel_id && !/^\d{17,20}$/.test(channel_id)) {
      return NextResponse.json({ error: "Invalid channel ID." }, { status: 400 });
    }
    if (channel_id) {
      await guildSettings.updateOne(
        { guild_id: guildId },
        { $set: { [`announcement_channels.${activationId}`]: channel_id, updated_at: now } },
        { upsert: true }
      );
    } else {
      await guildSettings.updateOne(
        { guild_id: guildId },
        { $unset: { [`announcement_channels.${activationId}`]: "" }, $set: { updated_at: now } }
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (!isOwner) {
    return NextResponse.json(
      { error: "Only the actual Discord server owner can change activation state." },
      { status: 403 }
    );
  }

  if (action === "deactivate") {
    const res = await servers.updateOne(
      { bot_activation_id: activationId, guild_id: guildId, status: "active" },
      { $set: { status: "inactive", deactivated_at: now, deactivated_by: ctx.discordId } }
    );
    if (!res.modifiedCount) {
      return NextResponse.json({ error: "No active license found." }, { status: 404 });
    }
    await logs.insertOne({
      bot_activation_id: activationId,
      guild_id: guildId,
      user_id: ctx.discordId,
      event: "deactivated",
      source: "web",
      created_at: now,
    });
    await webSyncEvents.insertOne({
      type: "sync_guild_commands",
      bot_activation_id: activationId,
      guild_id: guildId,
      status: "pending",
      created_at: now,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reactivate") {
    const botDoc = await bots.findOne({ activation_id: activationId, status: "active" });
    if (!botDoc) {
      return NextResponse.json({ error: "Bot is disabled in Hub." }, { status: 400 });
    }
    const res = await servers.updateOne(
      { bot_activation_id: activationId, guild_id: guildId, status: "inactive" },
      {
        $set: { status: "active", reactivated_at: now, reactivated_by: ctx.discordId },
        $unset: { deactivated_at: "", deactivated_by: "" },
      }
    );
    if (!res.modifiedCount) {
      return NextResponse.json({ error: "No deactivated license found." }, { status: 404 });
    }
    await logs.insertOne({
      bot_activation_id: activationId,
      guild_id: guildId,
      user_id: ctx.discordId,
      event: "reactivated",
      source: "web",
      created_at: now,
    });
    await webSyncEvents.insertOne({
      type: "sync_guild_commands",
      bot_activation_id: activationId,
      guild_id: guildId,
      status: "pending",
      created_at: now,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ guildId: string; activationId: string }> }
) {
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

  const { guildId, activationId } = await context.params;
  const userGuilds = await fetchUserDiscordGuilds(ctx.userId);
  const guild = userGuilds.find((g) => g.id === guildId);
  if (!guild?.owner && !ctx.isOwner) {
    return NextResponse.json(
      { error: "Only the server owner can permanently remove an activation." },
      { status: 403 }
    );
  }

  const { servers, logs, webSyncEvents } = await getCollections();
  const deleted = await servers.findOneAndDelete({
    bot_activation_id: activationId,
    guild_id: guildId,
  });
  if (!deleted) {
    return NextResponse.json({ error: "Activation record not found." }, { status: 404 });
  }
  const now = new Date();
  await logs.insertOne({
    bot_activation_id: activationId,
    guild_id: guildId,
    user_id: ctx.discordId,
    event: "server_removed",
    source: "web",
    key_id: deleted.key_id || null,
    created_at: now,
  });
  await webSyncEvents.insertOne({
    type: "sync_guild_commands",
    bot_activation_id: activationId,
    guild_id: guildId,
    status: "pending",
    created_at: now,
  });

  return NextResponse.json({ ok: true });
}
