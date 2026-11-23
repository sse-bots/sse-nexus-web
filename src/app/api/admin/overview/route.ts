import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import { getCollections } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bots, requests, keys, servers, announcementHistory } =
    await getCollections();

  const [
    activeBots,
    onlineBots,
    pendingRequests,
    unusedKeys,
    activeServers,
    scheduledAnnouncements,
  ] = await Promise.all([
    bots.countDocuments({ status: "active" }),
    bots.countDocuments({ status: "active", heartbeat_status: "online" }),
    requests.countDocuments({ status: "pending" }),
    keys.countDocuments({ status: "unused" }),
    servers.countDocuments({ status: "active" }),
    announcementHistory.countDocuments({ event_type: "scheduled_pending" }),
  ]);

  return NextResponse.json({
    activeBots,
    onlineBots,
    pendingRequests,
    unusedKeys,
    activeServers,
    oauthClientCount: 0,
    scheduledAnnouncements,
    isAdmin: ctx.isAdmin,
    isOwner: ctx.isOwner,
  });
}
