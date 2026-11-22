import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user: ctx });
}
