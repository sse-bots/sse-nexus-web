import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers: NO_CACHE }
      );
    }
    return NextResponse.json(
      { authenticated: true, user: ctx },
      { status: 200, headers: NO_CACHE }
    );
  } catch (err) {
    console.error("GET /api/me failed:", err);
    return NextResponse.json(
      { error: "Session verification temporarily unavailable." },
      { status: 500, headers: NO_CACHE }
    );
  }
}
