import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc, userIdFilter } from "@/lib/mongodb";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { oauthConsents, oauthClients } = await getCollections();
  const consents = await oauthConsents
    .find({ userId: userIdFilter(ctx.userId) })
    .toArray();
  const clientIds = consents.map((c) => c.clientId);
  const clients = await oauthClients
    .find({ clientId: { $in: clientIds } })
    .toArray();
  const clientMap = new Map(clients.map((c) => [String(c.clientId), c]));

  return NextResponse.json({
    consents: consents.map((c) => {
      const client = clientMap.get(String(c.clientId));
      return serializeDoc({
        id: c.id || c._id,
        clientId: c.clientId,
        clientName: client?.name || c.clientId,
        clientUri: client?.uri || null,
        scopes: c.scopes || [],
        createdAt: c.createdAt || null,
      });
    }),
  });
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required." },
      { status: 400 }
    );
  }
  const { oauthConsents } = await getCollections();
  await oauthConsents.deleteMany({
    userId: userIdFilter(ctx.userId),
    clientId,
  });
  return NextResponse.json({ ok: true });
}
