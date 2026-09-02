// Gestion du paramètre "state" et du code verifier PKCE pour OAuth.
// Le state est stocké dans un cookie signé côté client pour résister au CSRF.
// Le code verifier est chiffré dans le même cookie (pas exposé au navigateur en clair).

import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

function base64urlEncode(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

const COOKIE_NAME = "oauth_state";

// Cookie temporaire pour transporter les infos OAuth du callback au formulaire
// de complétion. Même durée de vie courte (10 min) que le state.
const PENDING_PROFILE_COOKIE = "oauth_pending";

export interface PendingOAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function setPendingOAuthProfile(profile: PendingOAuthProfile): Promise<void> {
  const store = await cookies();
  const value = encryptCookie(profile as unknown as OAuthCookie);
  store.set(PENDING_PROFILE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

// Lecture seule — utilisable dans un Server Component.
export async function getPendingOAuthProfile(): Promise<PendingOAuthProfile | null> {
  const store = await cookies();
  const raw = store.get(PENDING_PROFILE_COOKIE)?.value;
  if (!raw) return null;
  return decryptCookie(raw) as unknown as PendingOAuthProfile | null;
}

// Suppression du cookie — utilisable uniquement dans une Server Action / Route Handler.
export async function deletePendingOAuthProfile(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_PROFILE_COOKIE);
}

export async function consumePendingOAuthProfile(): Promise<PendingOAuthProfile | null> {
  const payload = await getPendingOAuthProfile();
  await deletePendingOAuthProfile();
  return payload;
}

// Dérive une clé AES-256 à partir de l'environnement. Requis en tout environnement.
function getKey(): Buffer {
  const secret = process.env.OAUTH_COOKIE_SECRET;
  if (!secret) {
    throw new Error("OAUTH_COOKIE_SECRET requis. Générer avec : openssl rand -base64 32");
  }
  return createHash("sha256").update(secret).digest();
}

interface OAuthCookie {
  provider: string;
  state: string;
  codeVerifier: string;
  redirect?: string;
}

const ALGO = "aes-256-gcm";

type EncodedCookie = {
  iv: string;
  tag: string;
  data: string;
};

function encryptCookie(payload: OAuthCookie): string {
  const iv = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed: EncodedCookie = {
    iv: base64urlEncode(iv),
    tag: base64urlEncode(tag),
    data: base64urlEncode(enc),
  };
  return base64urlEncode(Buffer.from(JSON.stringify(packed)));
}

function decryptCookie(value: string): OAuthCookie | null {
  try {
    const key = getKey();
    const raw = base64urlDecode(value);
    const packed = JSON.parse(raw.toString("utf8")) as EncodedCookie;
    const iv = base64urlDecode(packed.iv);
    const tag = base64urlDecode(packed.tag);
    const enc = base64urlDecode(packed.data);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as OAuthCookie;
  } catch (e) {
    // Log sans secret : permet de détecter des cookies corrompus/falsifiés.
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[oauth-state] decryptCookie failed:", msg);
    return null;
  }
}

export function generateOAuthState(): {
  state: string;
  codeVerifier: string;
} {
  return {
    state: base64urlEncode(randomBytes(32)),
    codeVerifier: base64urlEncode(randomBytes(32)),
  };
}

export async function setOAuthCookie(
  provider: string,
  state: string,
  codeVerifier: string,
  redirect?: string,
): Promise<void> {
  const store = await cookies();
  const value = encryptCookie({ provider, state, codeVerifier, redirect });
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
}

export async function consumeOAuthCookie(): Promise<OAuthCookie | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decryptCookie(raw);
  store.delete(COOKIE_NAME);
  return payload;
}
