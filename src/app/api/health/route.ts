import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSseIssuerUrl } from "@/lib/sse-sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  let dbError: string | null = null;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "MongoDB connection failed";
  }

  return NextResponse.json(
    {
      ok: dbOk,
      database: dbOk ? "connected" : "error",
      dbError,
      ssoIssuer: getSseIssuerUrl(),
      config: {
        hasBetterAuthUrl: Boolean(process.env.BETTER_AUTH_URL),
        hasBetterAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
        hasKeyEncryptionSecret: Boolean(process.env.KEY_ENCRYPTION_SECRET),
        hasMongoUri: Boolean(process.env.MONGODB_URI),
        hasSseClientId: Boolean(process.env.SSE_CLIENT_ID),
        hasSseClientSecret: Boolean(process.env.SSE_CLIENT_SECRET),
        hasHubDiscordToken: Boolean(process.env.HUB_DISCORD_TOKEN),
      },
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
