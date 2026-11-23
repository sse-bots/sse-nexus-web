import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import {
  fetchUserDiscordGuilds,
  getNexusPresentGuildIds,
  verifyGuildOwnerViaBot,
} from "@/lib/discord";
import { getCollections, serializeDoc } from "@/lib/mongodb";

const createRequestSchema = z.object({
  scope: z.enum(["single", "bundle", "global"]),
  bot_activation_ids: z.array(z.string().min(1)).optional(),
  note: z.string().max(400).optional(),
});

export async function POST(
  req: Request,
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
  if (ctx.isBlacklisted) {
    return NextResponse.json(
      {
        error:
          "You cannot submit activation requests because you hold a blacklisted role in the SSE Support Server.",
      },
      { status: 403 }
    );
  }

  const { guildId } = await context.params;
  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [userGuilds, nexusGuildIds, botCheck] = await Promise.all([
    fetchUserDiscordGuilds(ctx.userId),
    getNexusPresentGuildIds(),
    verifyGuildOwnerViaBot(guildId),
  ]);

  const userGuild = userGuilds.find((g) => g.id === guildId);
  const isOwnerByOAuth = Boolean(userGuild?.owner);
  const isOwnerByBot = botCheck.present && botCheck.ownerId === ctx.discordId;

  if (!isOwnerByOAuth && !isOwnerByBot && !ctx.isOwner) {
    return NextResponse.json(
      { error: "Only the actual owner of this Discord server can request activation." },
      { status: 403 }
    );
  }

  if (!nexusGuildIds.has(guildId) && !botCheck.present) {
    return NextResponse.json(
      {
        error:
          "SSE Nexus / Hub bot must be invited to your server before requesting activation.",
      },
      { status: 400 }
    );
  }

  const guildName = botCheck.name || userGuild?.name || `Server ${guildId}`;
  const { bots, servers, requests, logs, webSyncEvents } = await getCollections();
  const { scope, note } = parsed.data;

  const allActivationBots = await bots
    .find({ status: "active", activation_required: true })
    .sort({ name: 1 })
    .toArray();

  if (allActivationBots.length === 0) {
    return NextResponse.json(
      { error: "No activation-required SSE bots are currently registered." },
      { status: 400 }
    );
  }

  let selectedBots = allActivationBots;
  if (scope === "single") {
    const id = parsed.data.bot_activation_ids?.[0];
    if (!id) {
      return NextResponse.json(
        { error: "Select a bot for single activation." },
        { status: 400 }
      );
    }
    selectedBots = allActivationBots.filter((b) => b.activation_id === id);
    if (selectedBots.length !== 1) {
      return NextResponse.json(
        { error: "Selected bot does not require activation or is inactive." },
        { status: 400 }
      );
    }
  } else if (scope === "bundle") {
    const wanted = new Set(parsed.data.bot_activation_ids || []);
    if (wanted.size < 2) {
      return NextResponse.json(
        { error: "Select at least 2 bots for a bundle activation key." },
        { status: 400 }
      );
    }
    selectedBots = allActivationBots.filter((b) => wanted.has(String(b.activation_id)));
    if (selectedBots.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid activation-required bots must be selected." },
        { status: 400 }
      );
    }
  }

  const targetIds = selectedBots.map((b) => String(b.activation_id));
  const targetNames = selectedBots.map((b) => String(b.name));

  // Prevent activating already-active bots for single request
  if (scope === "single") {
    const existingActive = await servers.findOne({
      bot_activation_id: targetIds[0],
      guild_id: guildId,
      status: "active",
    });
    if (existingActive) {
      return NextResponse.json(
        { error: "This server already has an active license for that bot." },
        { status: 409 }
      );
    }
  }

  // Prevent duplicate pending requests
  const existingPending = await requests.findOne({
    guild_id: guildId,
    status: "pending",
    $or:
      scope === "global"
        ? [{ key_scope: "global" }, { bot_activation_id: "__GLOBAL__" }]
        : scope === "single"
          ? [
              { bot_activation_id: targetIds[0] },
              { bot_activation_ids: targetIds[0] },
              { key_scope: "global" },
            ]
          : [
              { key_scope: "global" },
              { bot_activation_ids: { $in: targetIds } },
              { bot_activation_id: { $in: targetIds } },
            ],
  });

  if (existingPending) {
    return NextResponse.json(
      {
        error:
          "A pending activation request already covers one or more of these bots for this server.",
      },
      { status: 409 }
    );
  }

  const primaryBotId =
    scope === "global"
      ? "__GLOBAL__"
      : scope === "bundle"
        ? "__BUNDLE__"
        : targetIds[0];

  const displayBotName =
    scope === "global"
      ? `Global Activation (All ${targetIds.length} Bots)`
      : scope === "bundle"
        ? `Bundle (${targetNames.length} Bots): ${targetNames.join(", ")}`
        : targetNames[0];

  const now = new Date();
  const doc = {
    key_scope: scope,
    bot_activation_id: primaryBotId,
    bot_activation_ids: targetIds,
    bot_name: displayBotName,
    bot_names: targetNames,
    guild_id: guildId,
    guild_name: guildName,
    requester_id: ctx.discordId,
    requester_name: ctx.name,
    requester_note: note?.trim() || "",
    status: "pending",
    source: "web",
    created_at: now,
  };

  const inserted = await requests.insertOne(doc);

  await logs.insertOne({
    bot_activation_id: primaryBotId,
    bot_activation_ids: targetIds,
    key_scope: scope,
    guild_id: guildId,
    user_id: ctx.discordId,
    event: "web_activation_request_submitted",
    created_at: now,
  });

  // Queue event so hub_bot.py can post the review card into the Discord pending channel
  await webSyncEvents.insertOne({
    type: "request_created",
    request_id: inserted.insertedId.toHexString(),
    guild_id: guildId,
    requester_id: ctx.discordId,
    status: "pending",
    created_at: now,
  });

  return NextResponse.json(
    {
      ok: true,
      request: serializeDoc({ ...doc, _id: inserted.insertedId }),
    },
    { status: 201 }
  );
}

export async function DELETE(
  req: Request,
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
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId") || "";
  if (!ObjectId.isValid(requestId)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const { requests, webSyncEvents } = await getCollections();
  const filter: Record<string, unknown> = {
    _id: new ObjectId(requestId),
    guild_id: guildId,
    status: "pending",
  };
  if (!ctx.isStaff) {
    filter.requester_id = ctx.discordId;
  }

  const res = await requests.updateOne(filter, {
    $set: { status: "cancelled", cancelled_at: new Date(), cancelled_by: ctx.discordId },
  });
  if (res.modifiedCount === 0) {
    return NextResponse.json(
      { error: "Pending request not found or not owned by you." },
      { status: 404 }
    );
  }

  await webSyncEvents.insertOne({
    type: "request_cancelled",
    request_id: requestId,
    guild_id: guildId,
    status: "pending",
    created_at: new Date(),
  });

  return NextResponse.json({ ok: true });
}
