import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { cleanupExpiredSessions } from "./session-cleanup";

export const SESSION_COOKIE = "foot_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Hash bcrypt factice, calculé une fois (lazy) puis mis en cache. Sert à
// égaliser le temps de réponse du login quand l'email n'existe pas : on lance
// quand même un bcrypt.compare (~100 ms) pour qu'un attaquant ne puisse pas
// distinguer un compte existant d'un compte absent via le timing (anti-
// énumération d'emails par oracle de timing).
let _dummyHash: string | null = null;
export async function verifyPasswordAgainstDummy(password: string): Promise<void> {
  if (!_dummyHash) _dummyHash = await bcrypt.hash("dummy-constant-value", 10);
  await bcrypt.compare(password, _dummyHash).catch(() => {});
}

// Token opaque (32 octets aléatoires). Utilisé pour les sessions ET pour les
// liens de réinitialisation de mot de passe : la base ne stocke jamais le
// token clair, seulement son hash SHA-256.
export function newOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

// Hash SHA-256 d'un token opaque. Le support (cookie ou lien email) porte le
// token clair, la base n'en stocke que le hash : une fuite de base ne permet
// ni de rejouer les sessions actives, ni de forger un reset.
export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(clubId: string): Promise<string> {
  // Nettoyage opportuniste des sessions expirées (fire-and-forget)
  cleanupExpiredSessions().catch(() => {});

  // Suppression des sessions existantes pour ce club (anti-fixation de session)
  await prisma.session.deleteMany({ where: { clubId } }).catch(() => {});

  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { clubId, tokenHash: hashOpaqueToken(token), expiresAt },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

export const getSession = cache(async () => {
  const start = Date.now();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    console.log(`[getSession] no-cookie ${Date.now() - start}ms`);
    return null;
  }
  const dbStart = Date.now();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
  });
  console.log(`[getSession] db=${Date.now() - dbStart}ms total=${Date.now() - start}ms`);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
});

// Champs club exposés au code métier. EXCLUT explicitement passwordHash,
// lockedUntil, failedLoginAttempts et autres champs sensibles.
const CLUB_PUBLIC_SELECT = {
  id: true,
  nom: true,
  ville: true,
  codePostal: true,
  latitude: true,
  longitude: true,
  ligue: true,
  district: true,
  telephone: true,
  email: true,
  logoUrl: true,
  role: true,
  statutVerification: true,
  refusMotif: true,
  createdAt: true,
  derniereActiviteAt: true,
} as const;

export const getCurrentClub = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const club = await prisma.club.findUnique({
    where: { id: session.clubId },
    select: CLUB_PUBLIC_SELECT,
  });
  return club ?? null;
});

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashOpaqueToken(token) } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

// Bump derniereActiviteAt — utile contre les annonces fantômes (cf. risques PRD).
export async function touchActivity(clubId: string): Promise<void> {
  await prisma
    .club.update({ where: { id: clubId }, data: { derniereActiviteAt: new Date() } })
    .catch(() => {});
}

// Déconnecte le club de tous les appareils en supprimant toutes ses sessions.
// Utilisé par exemple après un changement de mot de passe explicite ou depuis
// le profil club.
export async function revokeAllSessions(clubId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { clubId } }).catch(() => {});
}