import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/lib/permissions";
import { getCollections, serializeDoc } from "@/lib/mongodb";

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  redirect_uris: z.array(z.string().url()).min(1),
  scopes: z.array(z.string()).optional(),
  skip_consent: z.boolean().optional().default(false),
  public_client: z.boolean().optional().default(false),
  uri: z.string().url().optional().or(z.literal("")),
  icon: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { oauthClients } = await getCollections();
  const rows = await oauthClients.find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({
    clients: rows.map((c) => {
      const clean = { ...c };
      delete clean.clientSecret;
      return serializeDoc(clean);
    }),
  });
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid OAuth client payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, redirect_uris, scopes, skip_consent, public_client, uri, icon } =
    parsed.data;

  const hdrs = await headers();
  try {
    // Use Better Auth OAuth Provider server API to register the client cleanly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = auth.api as any;
    const createFn = api.adminCreateOAuthClient || api.createOAuthClient;
    if (!createFn) {
      return NextResponse.json(
        { error: "OAuth Provider create client API is unavailable." },
        { status: 500 }
      );
    }

    const created = await createFn({
      headers: hdrs,
      body: {
        name,
        redirect_uris,
        scope: (
          scopes && scopes.length > 0
            ? scopes
            : ["openid", "profile", "email", "offline_access"]
        ).join(" "),
        token_endpoint_auth_method: public_client
          ? "none"
          : "client_secret_basic",
        skip_consent,
        uri: uri || undefined,
        icon: icon || undefined,
      },
    });

    return NextResponse.json({ ok: true, client: created }, { status: 201 });
  } catch (err) {
    console.error("Failed to create OAuth client:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register OAuth client." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }
  const { oauthClients, oauthConsents } = await getCollections();
  await oauthClients.deleteOne({ clientId });
  await oauthConsents.deleteMany({ clientId });
  return NextResponse.json({ ok: true });
}
