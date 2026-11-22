import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionContext } from "@/lib/permissions";
import { getCollections } from "@/lib/mongodb";
import {
  encryptKeyForWeb,
  generateActivationKey,
  hashActivationKey,
} from "@/lib/crypto";
import type { KeyScope } from "@/lib/types";

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
  expires_at: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await context.params;
  if (!ObjectId.isValid(requestId)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision payload." }, { status: 400 });
  }

  const { requests, bots, keys, logs, webSyncEvents } = await getCollections();
  const oid = new ObjectId(requestId);
  const now = new Date();
  const { decision, reason = "", expires_at } = parsed.data;

  if (decision === "reject") {
    const rejectReason = reason.trim() || "Does not meet activation requirements";
    const updated = await requests.findOneAndUpdate(
      { _id: oid, status: "pending" },
      {
        $set: {
          status: "rejected",
          rejected_by: ctx.discordId,
          rejected_at: now,
          rejection_reason: rejectReason,
        },
      },
      { returnDocument: "after" }
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Request is no longer pending." },
        { status: 409 }
      );
    }

    await logs.insertOne({
      bot_activation_id: updated.bot_activation_id,
      bot_activation_ids: updated.bot_activation_ids || [updated.bot_activation_id],
      key_scope: updated.key_scope || "single",
      guild_id: updated.guild_id,
      user_id: updated.requester_id,
      reviewed_by: ctx.discordId,
      event: "activation_request_rejected",
      reason: rejectReason,
      source: "web",
      created_at: now,
    });

    await webSyncEvents.insertOne({
      type: "request_rejected",
      request_id: requestId,
      guild_id: updated.guild_id,
      requester_id: updated.requester_id,
      reason: rejectReason,
      status: "pending",
      created_at: now,
    });

    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // APPROVE
  let expiryDate: Date | null = null;
  if (expires_at) {
    const parsedDate = new Date(expires_at);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate <= now) {
      return NextResponse.json(
        { error: "Expiration date must be a valid future timestamp." },
        { status: 400 }
      );
    }
    expiryDate = parsedDate;
  }

  const reqDoc = await requests.findOneAndUpdate(
    { _id: oid, status: "pending" },
    {
      $set: {
        status: "approved",
        approved_by: ctx.discordId,
        approved_at: now,
        approval_reason: reason.trim(),
      },
    },
    { returnDocument: "after" }
  );

  if (!reqDoc) {
    return NextResponse.json(
      { error: "Request is no longer pending." },
      { status: 409 }
    );
  }

  const scope: KeyScope = (reqDoc.key_scope as KeyScope) || "single";
  let targetBotIds: string[] = [];

  if (scope === "global") {
    const activeActivationBots = await bots
      .find({ status: "active", activation_required: true }, { projection: { activation_id: 1 } })
      .toArray();
    targetBotIds = activeActivationBots.map((b) => String(b.activation_id));
  } else if (scope === "bundle") {
    targetBotIds = Array.isArray(reqDoc.bot_activation_ids)
      ? reqDoc.bot_activation_ids.map(String)
      : [];
  } else {
    const singleBot = await bots.findOne({
      activation_id: reqDoc.bot_activation_id,
      status: "active",
    });
    if (!singleBot) {
      await requests.updateOne(
        { _id: oid },
        {
          $set: { status: "pending" },
          $unset: { approved_by: "", approved_at: "", approval_reason: "" },
        }
      );
      return NextResponse.json(
        { error: "Requested bot is no longer active in Hub." },
        { status: 400 }
      );
    }
    targetBotIds = [String(reqDoc.bot_activation_id)];
  }

  const plaintext = generateActivationKey(scope);
  const keyHash = hashActivationKey(plaintext);
  const encryptedKey = encryptKeyForWeb(plaintext);

  const keyDoc = {
    bot_activation_id:
      scope === "global"
        ? "__GLOBAL__"
        : scope === "bundle"
          ? "__BUNDLE__"
          : targetBotIds[0],
    bot_activation_ids: targetBotIds,
    key_scope: scope,
    key_hash: keyHash,
    encrypted_key: encryptedKey,
    status: "unused",
    redeemed_bot_ids: [],
    created_by: ctx.discordId,
    created_at: now,
    expires_at: expiryDate,
    request_id: requestId,
    guild_id: String(reqDoc.guild_id),
    key_source: "web_request_approval",
  };

  const keyInsert = await keys.insertOne(keyDoc);

  await requests.updateOne(
    { _id: oid },
    {
      $set: {
        key_id: keyInsert.insertedId.toHexString(),
        encrypted_key: encryptedKey,
      },
    }
  );

  await logs.insertOne({
    bot_activation_id: keyDoc.bot_activation_id,
    bot_activation_ids: targetBotIds,
    key_scope: scope,
    guild_id: String(reqDoc.guild_id),
    user_id: String(reqDoc.requester_id),
    reviewed_by: ctx.discordId,
    event: "key_issued_after_approval",
    reason: reason.trim(),
    source: "web",
    created_at: now,
  });

  // Queue event so hub_bot.py can DM the user, assign Licensed Owner role & update Discord cards
  await webSyncEvents.insertOne({
    type: "request_approved",
    request_id: requestId,
    key_id: keyInsert.insertedId.toHexString(),
    guild_id: String(reqDoc.guild_id),
    requester_id: String(reqDoc.requester_id),
    key_scope: scope,
    reason: reason.trim(),
    status: "pending",
    created_at: now,
  });

  return NextResponse.json({
    ok: true,
    status: "approved",
    key_id: keyInsert.insertedId.toHexString(),
    plaintext_key: plaintext,
  });
}
