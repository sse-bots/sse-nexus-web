import { NextResponse } from "next/server";
import { getSseIssuerUrl } from "@/lib/sse-sso";

export async function GET() {
  return NextResponse.redirect(
    `${getSseIssuerUrl()}/.well-known/oauth-authorization-server`,
    307
  );
}
