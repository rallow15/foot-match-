import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient, fetchGoogleUserInfo } from "@/lib/oauth";
import { consumeOAuthCookie, setPendingOAuthProfile } from "@/lib/oauth-state";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

// Valide qu'un chemin de redirection est bien interne (anti open-redirect).
function safeRedirectPath(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value[1] === "/" || value[1] === "\\") return null;
  if (value.includes(":")) return null;
  return value;
}

export const dynamic = "force-dynamic";

const OAUTH_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  if (!(await rateLimit(ip, "oauth-callback", OAUTH_RATE_LIMIT))) {
    return NextResponse.redirect(new URL("/login?error=rate_limit", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const cookie = await consumeOAuthCookie();

  if (!code || !stateParam || !cookie || cookie.provider !== "google" || cookie.state !== stateParam) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", request.url));
  }

  try {
    const google = getGoogleOAuthClient();
    const tokens = await google.validateAuthorizationCode(code, cookie.codeVerifier);
    const accessToken = tokens.accessToken();
    const user = await fetchGoogleUserInfo(accessToken);

    if (!user.email_verified) {
      // Erreur générique côté client ; le détail reste dans les logs serveur.
      console.warn("[oauth google callback] email non vérifié:", user.email);
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // Recherche par identité OAuth.
    const club = await prisma.club.findUnique({
      where: { oauthProvider_oauthProviderId: { oauthProvider: "google", oauthProviderId: user.sub } },
    });

    if (!club) {
      // Vérifie si un compte email/mdp existe déjà avec le même email.
      const existing = await prisma.club.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true },
      });
      if (existing) {
        // Pas de fusion auto pour éviter le takeover. Message générique pour ne
        // pas révéler l'existence d'un compte classique avec le même email.
        console.warn("[oauth google callback] compte email/mdp existant:", user.email);
        return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
      }

      // Nouveau compte : on stocke temporairement les infos OAuth et on redirige
      // vers le formulaire de complétion.
      await setPendingOAuthProfile({
        provider: "google",
        providerId: user.sub,
        email: user.email.toLowerCase(),
        name: user.name,
        picture: user.picture,
      });
      return NextResponse.redirect(new URL("/inscription/oauth", request.url));
    }

    await createSession(club.id);
    const fallback = club.role === "admin" ? "/admin" : "/dashboard";
    const dest = safeRedirectPath(cookie.redirect ?? "") ?? fallback;
    return NextResponse.redirect(new URL(dest, request.url));
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[oauth google callback] ERROR:", err.message);
    if (err.stack) console.error("[oauth google callback] STACK:", err.stack);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
