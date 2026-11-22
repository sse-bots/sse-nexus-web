import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";
import { normalizedBotSlug } from "@/lib/crypto";

const addBotSchema = z.object({
  name: z.string().min(2).max(100),
  discord_bot_id: z.string().regex(/^\d{17,20}$/),
  description: z.string().max(1000).optional().default(""),
  invite_url: z.string().url().optional().or(z.literal("")),
  activation_required: z.boolean().default(false),
});

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { bots, botInstallations, servers } = await getCollections();
  const rows = await bots.find({}).sort({ created_at: -1 }).toArray();
  const installCounts = await botInstallations
    .aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$bot_activation_id", count: { $sum: 1 } } },
    ])
    .toArray();
  const licenseCounts = await servers
    .aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$bot_activation_id", count: { $sum: 1 } } },
    ])
    .toArray();

  const iMap = new Map(installCounts.map((r) => [String(r._id), Number(r.count)]));
  const lMap = new Map(licenseCounts.map((r) => [String(r._id), Number(r.count)]));

  return NextResponse.json({
    bots: rows.map((b) => {
      const clean = { ...b };
      delete clean.heartbeat_secret_hash;
      return serializeDoc({
        ...clean,
        reported_servers: iMap.get(String(b.activation_id)) || 0,
        active_licenses: lMap.get(String(b.activation_id)) || 0,
      });
    }),
  });
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json(
      { error: "Only Support Server Admins and the Hub Owner can register bots." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = addBotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid bot details.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, discord_bot_id, description, invite_url, activation_required } =
    parsed.data;
  const slug = normalizedBotSlug(name);
  const activation_id = `SSE-${slug}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const finalInvite =
    invite_url ||
    `https://discord.com/oauth2/authorize?client_id=${discord_bot_id}&scope=bot%20applications.commands&permissions=0`;
  const heartbeatSecret = crypto.randomBytes(24).toString("base64url");
  const heartbeatSecretHash = crypto
    .createHash("sha256")
    .update(heartbeatSecret)
    .digest("hex");

  const { bots, announcementTemplates } = await getCollections();
  const now = new Date();

  try {
    await bots.insertOne({
      name: name.trim(),
      discord_bot_id,
      activation_id,
      description: description.trim(),
      invite_url: finalInvite,
      activation_required,
      maintenance_mode: false,
      heartbeat_secret_hash: heartbeatSecretHash,
      heartbeat_last_seen: null,
      heartbeat_status: "unknown",
      status: "active",
      created_by: ctx.discordId,
      created_at: now,
    });
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "That Discord bot ID is already registered." },
        { status: 409 }
      );
    }
    throw err;
  }

  const defaults = [
    ["outage", "Service interruption", "This bot is currently experiencing downtime. Our team is investigating the issue."],
    ["maintenance", "Scheduled maintenance", "This bot will undergo scheduled maintenance. Some features may be temporarily unavailable."],
    ["restored", "Service restored", "Service has been restored and this bot is operating again."],
    ["update", "Bot update", "We have an update about this SSE bot. Please read the information below."],
  ];
  for (const [tName, tTitle, tMessage] of defaults) {
    await announcementTemplates.updateOne(
      { bot_activation_id: activation_id, name: tName },
      {
        $setOnInsert: {
          bot_activation_id: activation_id,
          name: tName,
          title: tTitle,
          message: tMessage,
          link: "",
          created_by: "system",
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      activation_id,
      heartbeat_secret: heartbeatSecret,
    },
    { status: 201 }
  );
}
