import { NextResponse } from "next/server";
import { generateState } from "arctic";
import { getAppleOAuthClient } from "@/lib/oauth";
import { setOAuthCookie } from "@/lib/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") ?? undefined;

  const apple = getAppleOAuthClient();
  const state = generateState();

  // Apple ne supporte pas PKCE ; on demande uniquement l’email.
  // response_mode=form_post force Apple à envoyer le code par POST (obligatoire
  // pour récupérer l’email de manière fiable sur le web).
  const authUrl = apple.createAuthorizationURL(state, ["email"]);
  authUrl.searchParams.set("response_mode", "form_post");

  await setOAuthCookie("apple", state, undefined, redirect);

  return NextResponse.redirect(authUrl);
}
