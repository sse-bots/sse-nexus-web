import { NextResponse } from "next/server";
import { getPublicSseAccountsUrl } from "@/lib/sse-sso";

export async function GET() {
  return NextResponse.json({
    consents: [],
    managedAt: `${getPublicSseAccountsUrl()}/account/apps`,
  });
}
