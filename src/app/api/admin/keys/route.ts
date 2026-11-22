import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";
import {
  encryptKeyForWeb,
  generateActivationKey,
  hashActivationKey,
} from "@/lib/crypto";

const generateKeySchema = z.object({
  key_scope: z.enum(["single", "bundle", "global"]),
  bot_activation_ids: z.array(z.string()).optional(),
  guild_id: z.string().regex(/^\d{17,20}$/).optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
});

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Only Hub owner can inspect keys." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const bot = searchParams.get("bot") || "all";
  const status = searchParams.get("status") || "all";
  const scope = searchParams.get("scope") || "all";

  const query: Record<string, unknown> = {};
  if (bot !== "all") {
    query.$or = [{ bot_activation_id: bot }, { bot_activation_ids: bot }];
  }
  if (status !== "all") query.status = status;
  if (scope !== "all") {
    if (scope === "single") {
      query.$and = [
        ...(Array.isArray(query.$and) ? query.$and : []),
        { $or: [{ key_scope: "single" }, { key_scope: { $exists: false } }] },
      ];
    } else {
      query.key_scope = scope;
    }
  }

  const { keys } = await getCollections();
  const rows = await keys.find(query).sort({ created_at: -1 }).limit(100).toArray();

  return NextResponse.json({
    keys: rows.map((k) => {
      const clean = { ...k };
      delete clean.encrypted_key;
      delete clean.key_hash;
      return serializeDoc(clean);
    }),
  });
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Only Hub owner can generate keys." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid key parameters.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { key_scope, bot_activation_ids = [], guild_id, expires_at } = parsed.data;
  const { bots, keys, logs } = await getCollections();
  const now = new Date();

  let expiry: Date | null = null;
  if (expires_at) {
    const dt = new Date(expires_at);
    if (Number.isNaN(dt.getTime()) || dt <= now) {
      return NextResponse.json(
        { error: "Expiration must be a valid future date." },
        { status: 400 }
      );
    }
    expiry = dt;
  }

  let targetIds: string[] = [];
  if (key_scope === "global") {
    const active = await bots
      .find({ status: "active", activation_required: true }, { projection: { activation_id: 1 } })
      .toArray();
    targetIds = active.map((b) => String(b.activation_id));
  } else if (key_scope === "bundle") {
    if (bot_activation_ids.length < 2) {
      return NextResponse.json(
        { error: "Select at least 2 bots for a bundle key." },
        { status: 400 }
      );
    }
    targetIds = bot_activation_ids;
  } else {
    if (bot_activation_ids.length !== 1) {
      return NextResponse.json(
        { error: "Select exactly 1 bot for a single key." },
        { status: 400 }
      );
    }
    targetIds = [bot_activation_ids[0]];
  }

  const plaintext = generateActivationKey(key_scope);
  const primaryId =
    key_scope === "global"
      ? "__GLOBAL__"
      : key_scope === "bundle"
        ? "__BUNDLE__"
        : targetIds[0];

  const inserted = await keys.insertOne({
    bot_activation_id: primaryId,
    bot_activation_ids: targetIds,
    key_scope,
    key_hash: hashActivationKey(plaintext),
    encrypted_key: guild_id ? encryptKeyForWeb(plaintext) : null,
    status: "unused",
    redeemed_bot_ids: [],
    created_by: ctx.discordId,
    created_at: now,
    expires_at: expiry,
    guild_id: guild_id || null,
    key_source: "manual_web",
  });

  await logs.insertOne({
    bot_activation_id: primaryId,
    bot_activation_ids: targetIds,
    key_scope,
    guild_id: guild_id || null,
    user_id: ctx.discordId,
    event: "activation_key_generated",
    source: "web",
    created_at: now,
  });

  return NextResponse.json(
    {
      ok: true,
      key_id: inserted.insertedId.toHexString(),
      plaintext_key: plaintext,
      key_scope,
      bot_activation_ids: targetIds,
    },
    { status: 201 }
  );
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const bot = searchParams.get("bot");
  if (!bot) {
    return NextResponse.json({ error: "Specify bot activation_id." }, { status: 400 });
  }
  const { keys, logs } = await getCollections();
  const res = await keys.deleteMany({ bot_activation_id: bot, status: "unused" });
  await logs.insertOne({
    bot_activation_id: bot,
    event: "unused_keys_permanently_deleted",
    deleted_count: res.deletedCount,
    performed_by: ctx.discordId,
    source: "web",
    created_at: new Date(),
  });
  return NextResponse.json({ ok: true, deletedCount: res.deletedCount });
}
