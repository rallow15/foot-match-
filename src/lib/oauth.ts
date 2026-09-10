// Configuration OAuth — Google et Apple.
// Utilise arctic pour gérer les endpoints et le PKCE.

import { Apple, Google } from "arctic";
import { parseJWT } from "@oslojs/jwt";

export const OAUTH_PROVIDER = {
  GOOGLE: "google",
  APPLE: "apple",
} as const;

export type OAuthProvider = (typeof OAUTH_PROVIDER)[keyof typeof OAUTH_PROVIDER];

export function getGoogleOAuthClient(): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      "OAuth Google non configuré : définir GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et APP_URL.",
    );
  }
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  return new Google(clientId, clientSecret, redirectUri);
}

// Google userinfo minimal (email, nom, image, sub).
export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo error: ${res.status}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export function getAppleOAuthClient(): Apple {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyBase64 = process.env.APPLE_PRIVATE_KEY_BASE64;
  const appUrl = process.env.APP_URL;
  if (!clientId || !teamId || !keyId || !privateKeyBase64 || !appUrl) {
    throw new Error(
      "OAuth Apple non configuré : définir APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_BASE64 et APP_URL.",
    );
  }
  let pkcs8: Uint8Array;
  try {
    pkcs8 = Uint8Array.from(Buffer.from(privateKeyBase64, "base64"));
  } catch {
    throw new Error("APPLE_PRIVATE_KEY_BASE64 n’est pas une chaîne base64 valide.");
  }
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/apple/callback`;
  return new Apple(clientId, teamId, keyId, pkcs8, redirectUri);
}

// Apple ne fournit pas de userinfo endpoint ; l’email est dans l’ID token.
export interface AppleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
}

export function parseAppleIdToken(idToken: string): AppleUserInfo {
  const [, payload] = parseJWT(idToken);
  const claims = payload as Record<string, unknown>;

  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const emailVerifiedRaw = claims.email_verified;
  const emailVerified =
    emailVerifiedRaw === true ||
    emailVerifiedRaw === "true" ||
    emailVerifiedRaw === "1";

  if (!sub || !email) {
    throw new Error("ID token Apple incomplet : sub ou email manquant.");
  }

  return { sub, email: email.toLowerCase(), email_verified: emailVerified };
}
