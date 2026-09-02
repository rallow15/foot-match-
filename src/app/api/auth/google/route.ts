import { NextResponse } from "next/server";
import { generateCodeVerifier, generateState } from "arctic";
import { getGoogleOAuthClient } from "@/lib/oauth";
import { setOAuthCookie } from "@/lib/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") ?? undefined;

  const google = getGoogleOAuthClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authUrl = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  await setOAuthCookie("google", state, codeVerifier, redirect);

  return NextResponse.redirect(authUrl);
}
