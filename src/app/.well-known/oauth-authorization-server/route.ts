import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

const handler = oauthProviderAuthServerMetadata(auth as never, {
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
});

export const GET = (request: Request) => handler(request);
