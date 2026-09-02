// Configuration OAuth — Google (Apple peut être ajouté plus tard).
// Utilise arctic pour gérer les endpoints et le PKCE.

import { Google } from "arctic";

export const OAUTH_PROVIDER = {
  GOOGLE: "google",
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
