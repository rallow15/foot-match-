import { cookies } from "next/headers";
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

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { club: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

export async function getCurrentClub() {
  const s = await getSession();
  return s?.club ?? null;
}

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