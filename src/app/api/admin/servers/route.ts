import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";

const serverActionSchema = z.object({
  bot_activation_id: z.string().min(1),
  guild_id: z.string().regex(/^\d{17,20}$/),
  action: z.enum(["revoke", "deactivate", "reactivate"]),
  reason: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const bot = searchParams.get("bot") || "all";
  const guild = searchParams.get("guild") || "";

  const query: Record<string, unknown> = {};
  if (bot !== "all") query.bot_activation_id = bot;
  if (guild) query.guild_id = guild.trim();

  const { servers } = await getCollections();
  const rows = await servers
    .find(query)
    .sort({ activated_at: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    servers: rows.map((r) => serializeDoc(r)),
  });
}

export async function PATCH(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = serverActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    bot_activation_id,
    guild_id,
    action,
    reason = "Updated by SSE staff",
  } = parsed.data;
  const { servers, logs, webSyncEvents } = await getCollections();
  const now = new Date();

  const nextStatus =
    action === "revoke"
      ? "revoked"
      : action === "deactivate"
        ? "inactive"
        : "active";

  const res = await servers.updateOne(
    { bot_activation_id, guild_id },
    {
      $set: {
        status: nextStatus,
        updated_at: now,
        ...(action === "revoke"
          ? {
              revoked_at: now,
              revoked_by: ctx.discordId,
              revocation_reason: reason,
            }
          : {}),
      },
    }
  );
  if (!res.matchedCount) {
    return NextResponse.json(
      { error: "Server license not found." },
      { status: 404 }
    );
  }

  await logs.insertOne({
    bot_activation_id,
    guild_id,
    user_id: ctx.discordId,
    event: `server_${action}_by_staff_web`,
    reason,
    created_at: now,
  });

  await webSyncEvents.insertOne({
    type: "sync_guild_commands",
    bot_activation_id,
    guild_id,
    status: "pending",
    created_at: now,
  });

  return NextResponse.json({ ok: true });
}
