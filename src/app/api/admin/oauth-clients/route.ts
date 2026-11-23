import { NextResponse } from "next/server";
import { getPublicSseAccountsUrl } from "@/lib/sse-sso";

export async function GET() {
  return NextResponse.json(
    {
      moved: true,
      url: `${getPublicSseAccountsUrl()}/admin/oauth-clients`,
      message: "OAuth clients are now managed centrally in SSE Accounts.",
    },
    { status: 410 }
  );
}
