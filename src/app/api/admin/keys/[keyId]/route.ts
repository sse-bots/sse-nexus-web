import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionContext } from "@/lib/permissions";
import { getCollections } from "@/lib/mongodb";

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ keyId: string }> }
) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { keyId } = await context.params;
  if (!ObjectId.isValid(keyId)) {
    return NextResponse.json({ error: "Invalid key ID." }, { status: 400 });
  }
  const { keys } = await getCollections();
  const res = await keys.updateOne(
    { _id: new ObjectId(keyId), status: "unused" },
    {
      $set: {
        status: "revoked",
        revoked_at: new Date(),
        revoked_by: ctx.discordId,
      },
      $unset: { encrypted_key: "" },
    }
  );
  if (!res.modifiedCount) {
    return NextResponse.json({ error: "Unused key not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
