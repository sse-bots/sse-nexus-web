import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
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

const patchClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  redirect_uris: z.array(z.string().url()).min(1).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  skip_consent: z.boolean().optional(),
  uri: z.string().url().optional().or(z.literal("")),
  icon: z.string().url().optional().or(z.literal("")),
  rotate_secret: z.boolean().optional(),
  revoke_all_consents: z.boolean().optional(),
});

function hashClientSecret(secret: string): string {
  // Matches Better Auth default SHA-256 base64url secret storage
  return crypto.createHash("sha256").update(secret).digest("base64url");
}

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { oauthClients, oauthConsents } = await getCollections();
  const [rows, consentCounts] = await Promise.all([
    oauthClients.find({}).sort({ createdAt: -1 }).toArray(),
    oauthConsents
      .aggregate([{ $group: { _id: "$clientId", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const countMap = new Map(
    consentCounts.map((c) => [String(c._id), Number(c.count)])
  );

  return NextResponse.json({
    clients: rows.map((c) => {
      const clean = { ...c };
      delete clean.clientSecret;
      return serializeDoc({
        ...clean,
        authorizedUserCount: countMap.get(String(c.clientId)) || 0,
      });
    }),
  });
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid OAuth client payload.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, redirect_uris, scopes, skip_consent, public_client, uri, icon } =
    parsed.data;

  const hdrs = await headers();
  try {
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
        client_name: name,
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
        client_uri: uri || undefined,
        logo_uri: icon || undefined,
      },
    });

    return NextResponse.json({ ok: true, client: created }, { status: 201 });
  } catch (err) {
    console.error("Failed to create OAuth client:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to register OAuth client.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    clientId,
    name,
    redirect_uris,
    scopes,
    skip_consent,
    uri,
    icon,
    rotate_secret,
    revoke_all_consents,
  } = parsed.data;

  const { oauthClients, oauthConsents } = await getCollections();
  const existing = await oauthClients.findOne({ clientId });
  if (!existing) {
    return NextResponse.json(
      { error: "OAuth client not found." },
      { status: 404 }
    );
  }

  if (revoke_all_consents) {
    const del = await oauthConsents.deleteMany({ clientId });
    return NextResponse.json({
      ok: true,
      revokedCount: del.deletedCount || 0,
    });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {
    updatedAt: now,
  };

  if (name !== undefined) updates.name = name.trim();
  if (redirect_uris !== undefined) updates.redirectUris = redirect_uris;
  if (scopes !== undefined) updates.scopes = scopes;
  if (skip_consent !== undefined) updates.skipConsent = skip_consent;
  if (uri !== undefined) updates.uri = uri || null;
  if (icon !== undefined) updates.icon = icon || null;

  let newSecret: string | null = null;
  if (rotate_secret) {
    if (existing.public || existing.tokenEndpointAuthMethod === "none") {
      return NextResponse.json(
        { error: "Public clients do not use a client secret." },
        { status: 400 }
      );
    }
    newSecret = `sse_sec_${crypto.randomBytes(32).toString("base64url")}`;
    updates.clientSecret = hashClientSecret(newSecret);
  }

  await oauthClients.updateOne({ clientId }, { $set: updates });

  return NextResponse.json({
    ok: true,
    client_id: clientId,
    client_secret: newSecret,
  });
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required." },
      { status: 400 }
    );
  }
  const { oauthClients, oauthConsents } = await getCollections();
  await oauthClients.deleteOne({ clientId });
  await oauthConsents.deleteMany({ clientId });
  return NextResponse.json({ ok: true });
}
