import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections } from "@/lib/mongodb";

const patchBotSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  discord_bot_id: z.string().regex(/^\d{17,20}$/).optional(),
  description: z.string().max(1000).optional(),
  invite_url: z.string().url().optional().or(z.literal("")),
  activation_required: z.boolean().optional(),
  maintenance_mode: z.boolean().optional(),
  rotate_heartbeat_secret: z.boolean().optional(),
  restore: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ activationId: string }> }
) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json(
      { error: "Only Support Server Admins and the Hub Owner can edit bots." },
      { status: 403 }
    );
  }
  const { activationId } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = patchBotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const { bots } = await getCollections();
  const now = new Date();
  const updates: Record<string, unknown> = {
    updated_at: now,
    updated_by: ctx.discordId,
  };

  let rotatedSecret: string | null = null;
  if (parsed.data.rotate_heartbeat_secret) {
    rotatedSecret = crypto.randomBytes(24).toString("base64url");
    updates.heartbeat_secret_hash = crypto
      .createHash("sha256")
      .update(rotatedSecret)
      .digest("hex");
    updates.heartbeat_status = "unknown";
    updates.heartbeat_last_seen = null;
    updates.heartbeat_secret_rotated_at = now;
  }

  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.discord_bot_id !== undefined) updates.discord_bot_id = parsed.data.discord_bot_id;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description.trim();
  if (parsed.data.invite_url !== undefined) updates.invite_url = parsed.data.invite_url;
  if (parsed.data.activation_required !== undefined) updates.activation_required = parsed.data.activation_required;
  if (parsed.data.maintenance_mode !== undefined) {
    updates.maintenance_mode = parsed.data.maintenance_mode;
    updates.maintenance_updated_at = now;
    updates.maintenance_updated_by = ctx.discordId;
  }
  if (parsed.data.restore) {
    updates.status = "active";
  }

  const res = await bots.updateOne({ activation_id: activationId }, { $set: updates });
  if (!res.matchedCount) {
    return NextResponse.json({ error: "Bot not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    heartbeat_secret: rotatedSecret,
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ activationId: string }> }
) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json(
      { error: "Only Support Server Admins and the Hub Owner can disable bots." },
      { status: 403 }
    );
  }
  const { activationId } = await context.params;
  const { bots, keys, servers } = await getCollections();
  const now = new Date();

  const res = await bots.updateOne(
    { activation_id: activationId, status: "active" },
    { $set: { status: "removed", removed_at: now } }
  );
  if (!res.modifiedCount) {
    return NextResponse.json({ error: "Active bot not found." }, { status: 404 });
  }
  await keys.updateMany(
    { bot_activation_id: activationId, status: "unused" },
    { $set: { status: "revoked", revoked_at: now } }
  );
  await servers.updateMany(
    { bot_activation_id: activationId, status: "active" },
    { $set: { status: "revoked", revoked_at: now } }
  );

  return NextResponse.json({ ok: true });
}
