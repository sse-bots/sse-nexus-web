import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  const { guildSettings, logs } = await getCollections();
  const [settings, recentLogs] = await Promise.all([
    guildSettings.findOne({ guild_id: supportGuildId }),
    logs.find({}).sort({ created_at: -1 }).limit(60).toArray(),
  ]);

  return NextResponse.json({
    supportGuildId,
    settings: settings ? serializeDoc(settings) : { guild_id: supportGuildId },
    logs: recentLogs.map((l) => serializeDoc(l)),
  });
}

export async function PUT(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supportGuildId = (process.env.HUB_SUPPORT_GUILD_ID || "").trim();
  if (!supportGuildId) {
    return NextResponse.json({ error: "HUB_SUPPORT_GUILD_ID not set." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowedArrayFields = [
    "moderator_role_ids",
    "manager_role_ids",
    "approval_role_ids",
    "notification_role_ids",
    "blacklisted_role_ids",
  ];
  const allowedStringFields = [
    "licensed_owner_role_id",
    "logs_channel_id",
    "pending_channel_id",
    "approved_channel_id",
    "rejected_channel_id",
    "list_channel_id",
    "announcement_log_channel_id",
    "status_board_channel_id",
  ];

  const payload: Record<string, unknown> = {
    guild_id: supportGuildId,
    updated_at: new Date(),
    updated_by: ctx.discordId,
  };

  for (const field of allowedArrayFields) {
    if (Array.isArray(body[field])) {
      payload[field] = (body[field] as string[])
        .map((v) => String(v).trim())
        .filter((v) => /^\d{17,20}$/.test(v));
    }
  }
  for (const field of allowedStringFields) {
    if (field in body) {
      const val = String(body[field] || "").trim();
      payload[field] = /^\d{17,20}$/.test(val) ? val : null;
    }
  }

  const { guildSettings } = await getCollections();
  await guildSettings.updateOne(
    { guild_id: supportGuildId },
    { $set: payload },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
