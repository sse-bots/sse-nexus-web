import { NextResponse } from "next/server";
import { getCollections, serializeDoc } from "@/lib/mongodb";

export async function GET() {
  try {
    const { bots, botInstallations, servers } = await getCollections();
    const activeBots = await bots
      .find({ status: "active" })
      .sort({ name: 1 })
      .toArray();

    const installAgg = await botInstallations
      .aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$bot_activation_id", count: { $sum: 1 } } },
      ])
      .toArray();
    const installMap = new Map(installAgg.map((r) => [String(r._id), Number(r.count)]));

    const licenseAgg = await servers
      .aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$bot_activation_id", count: { $sum: 1 } } },
      ])
      .toArray();
    const licenseMap = new Map(licenseAgg.map((r) => [String(r._id), Number(r.count)]));

    const items = activeBots.map((doc) => ({
      activation_id: doc.activation_id,
      name: doc.name,
      discord_bot_id: doc.discord_bot_id,
      description: doc.description || "An official bot in the SSE World ecosystem.",
      invite_url:
        doc.invite_url ||
        `https://discord.com/oauth2/authorize?client_id=${doc.discord_bot_id}&scope=bot%20applications.commands&permissions=0`,
      activation_required: Boolean(doc.activation_required),
      maintenance_mode: Boolean(doc.maintenance_mode),
      heartbeat_status: doc.heartbeat_status || "unknown",
      heartbeat_last_seen: doc.heartbeat_last_seen || null,
      reported_servers: installMap.get(String(doc.activation_id)) || 0,
      active_licenses: licenseMap.get(String(doc.activation_id)) || 0,
    }));

    return NextResponse.json({
      bots: items.map((i) => serializeDoc(i)),
      stats: {
        totalBots: items.length,
        onlineBots: items.filter((b) => b.heartbeat_status === "online").length,
        activationRequiredBots: items.filter((b) => b.activation_required).length,
        totalActiveLicenses: Array.from(licenseMap.values()).reduce((a, b) => a + b, 0),
      },
    });
  } catch (err) {
    console.error("GET /api/public/bots failed:", err);
    return NextResponse.json(
      { error: "Failed to load SSE bot directory." },
      { status: 500 }
    );
  }
}
