import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";

const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("upsert_template"),
    bot_activation_id: z.string().min(1),
    name: z.string().min(1).max(50),
    title: z.string().min(1).max(256),
    message: z.string().min(1).max(4000),
    link: z.string().url().optional().or(z.literal("")),
  }),
  z.object({
    kind: z.literal("delete_template"),
    bot_activation_id: z.string().min(1),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("schedule_announcement"),
    bot_activation_id: z.string().min(1),
    title: z.string().min(1).max(256),
    message: z.string().min(1).max(4000),
    link: z.string().url().optional().or(z.literal("")),
    scheduled_at: z.string(), // ISO timestamp, or immediate (now + 5s)
  }),
  z.object({
    kind: z.literal("cancel_schedule"),
    schedule_id: z.string().min(1),
  }),
]);

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const bot = searchParams.get("bot") || "all";

  const { announcementTemplates, announcementHistory } = await getCollections();
  const filter = bot !== "all" ? { bot_activation_id: bot } : {};

  const [templates, history] = await Promise.all([
    announcementTemplates.find(filter).sort({ bot_activation_id: 1, name: 1 }).limit(100).toArray(),
    announcementHistory.find(filter).sort({ created_at: -1 }).limit(50).toArray(),
  ]);

  return NextResponse.json({
    templates: templates.map((t) => serializeDoc(t)),
    history: history.map((h) => serializeDoc(h)),
  });
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid announcement payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { announcementTemplates, announcementHistory } = await getCollections();
  const now = new Date();
  const data = parsed.data;

  if (data.kind === "upsert_template") {
    const cleanName = data.name.trim().toLowerCase();
    await announcementTemplates.updateOne(
      { bot_activation_id: data.bot_activation_id, name: cleanName },
      {
        $set: {
          title: data.title.trim(),
          message: data.message.trim(),
          link: data.link || "",
          updated_at: now,
        },
        $setOnInsert: {
          bot_activation_id: data.bot_activation_id,
          name: cleanName,
          created_by: ctx.discordId,
          created_at: now,
        },
      },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  }

  if (data.kind === "delete_template") {
    await announcementTemplates.deleteOne({
      bot_activation_id: data.bot_activation_id,
      name: data.name.trim().toLowerCase(),
    });
    return NextResponse.json({ ok: true });
  }

  if (data.kind === "schedule_announcement") {
    const when = new Date(data.scheduled_at);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid schedule timestamp." }, { status: 400 });
    }
    // hub_bot.py's existing _monitor_bots_loop automatically dispatches scheduled_pending documents!
    const inserted = await announcementHistory.insertOne({
      bot_activation_id: data.bot_activation_id,
      event_type: "scheduled_pending",
      title: data.title.trim(),
      message: data.message.trim(),
      link: data.link || "",
      scheduled_at: when,
      created_by: ctx.discordId,
      source: "web",
      created_at: now,
    });
    return NextResponse.json({ ok: true, id: inserted.insertedId.toHexString() }, { status: 201 });
  }

  if (data.kind === "cancel_schedule") {
    if (!ObjectId.isValid(data.schedule_id)) {
      return NextResponse.json({ error: "Invalid schedule ID." }, { status: 400 });
    }
    await announcementHistory.updateOne(
      { _id: new ObjectId(data.schedule_id), event_type: "scheduled_pending" },
      {
        $set: {
          event_type: "scheduled_cancelled",
          cancelled_at: now,
          cancelled_by: ctx.discordId,
        },
      }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
