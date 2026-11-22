import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";
  const scope = searchParams.get("scope") || "all";

  const query: Record<string, unknown> = {};
  if (status !== "all") query.status = status;
  if (scope !== "all") {
    if (scope === "single") {
      query.$or = [{ key_scope: "single" }, { key_scope: { $exists: false } }];
    } else {
      query.key_scope = scope;
    }
  }

  const { requests } = await getCollections();
  const rows = await requests
    .find(query)
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    requests: rows.map((r) => {
      const clean = { ...r };
      delete clean.encrypted_key;
      return serializeDoc(clean);
    }),
  });
}
