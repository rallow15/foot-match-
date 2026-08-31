// Rate limiting par IP — compteur partagé en base (Postgres) pour résister au
// multi-instances (Fluid Compute / serverless). Chaque instance lit/écrit le
// même compteur : un attaquant ne peut plus contourner les seuils en répartis-
// sant ses requêtes sur plusieurs instances.
//
// Stratégie fail-open : si la base est indisponible, on laisse passer (le rate
// limiting est une protection best-effort, pas une gate d'auth — ne pas bloquer
// tous les utilisateurs pour une panne DB). Le verrouillage de login, lui,
// reste en base sur Club (failedLoginAttempts / lockedUntil) et est fiable.

import { prisma } from "./db";

export interface RateLimitOpts {
  maxRequests: number;
  windowMs: number;
}

// Prune périodique des entrées expirées : la table ne doit pas croître
// indéfiniment. Limité à une exécution par minute et par instance pour éviter
// une écriture systématique à chaque requête.
const PRUNE_INTERVAL_MS = 60_000;
let lastPruneAt = 0;

async function maybePrune(now: number): Promise<void> {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  await prisma.rateLimit
    .deleteMany({ where: { resetAt: { lt: new Date(now - 60_000) } } })
    .catch(() => {});
}

// Implémentation commune du rate-limiting en base.
// L'appelant fournit une clé arbitraire (`scope:identifier`).
// Incrément atomique côté SQL (`count: { increment: 1 }`) : pas de "lost update"
// en cas de concurrence. Seule race résiduelle : la réinitialisation d'une
// fenêtre expirée peut, sur un burst simultané, laisser passer 1-2 requêtes
// de plus que `maxRequests` — acceptable pour un mécanisme best-effort.
async function rateLimitByKey(
  key: string,
  opts: RateLimitOpts,
): Promise<boolean> {
  const now = Date.now();
  void maybePrune(now);

  const resetAt = new Date(now + opts.windowMs);

  try {
    // upsert atomique : crée le compteur à 1, ou l'incrémente.
    const entry = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: { increment: 1 } },
      select: { count: true, resetAt: true },
    });

    // Fenêtre expirée -> on réarme à 1 (nouvelle fenêtre).
    // Prisma renvoie normalement des Dates, mais après sérialisation (cache,
    // edge runtime) on peut recevoir une chaîne ISO — normaliser.
    const resetAtMs =
      entry.resetAt instanceof Date
        ? entry.resetAt.getTime()
        : new Date(entry.resetAt).getTime();
    if (resetAtMs <= now) {
      await prisma.rateLimit.update({
        where: { key },
        data: { count: 1, resetAt },
      });
      return true;
    }

    return entry.count <= opts.maxRequests;
  } catch {
    // Fail-open (cf. commentaire d'en-tête).
    return true;
  }
}

export async function rateLimit(
  ip: string,
  action: string,
  opts: RateLimitOpts,
): Promise<boolean> {
  return rateLimitByKey(`${action}:${ip}`, opts);
}

// Rate-limit par compte (ou autre identifiant applicatif), indépendamment de l'IP.
// Utile contre l'email-bombing distribué sur un compte donné.
export async function rateLimitByAccount(
  accountId: string,
  action: string,
  opts: RateLimitOpts,
): Promise<boolean> {
  return rateLimitByKey(`${action}:account:${accountId}`, opts);
}

// Limiteurs pré-configurés
export const LOGIN_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const REGISTER_RATE_LIMIT: RateLimitOpts = { maxRequests: 3, windowMs: 60_000 }; // 3/min
export const CONTACT_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const PUBLIC_CONTACT_RATE_LIMIT: RateLimitOpts = { maxRequests: 3, windowMs: 600_000 }; // 3 / 10 min (formulaire public non authentifié)
export const UPLOAD_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const PASSWORD_RESET_RATE_LIMIT: RateLimitOpts = { maxRequests: 3, windowMs: 600_000 }; // 3 / 10 min (anti email-bombing)
// Soumission du nouveau mot de passe (redémption du token). Endpoint non
// authentifié (le token fait foi) : on limite par IP pour borner les lookups
// DB en cas de spam de tokens aléatoires (DoS).
export const RESET_SUBMIT_RATE_LIMIT: RateLimitOpts = { maxRequests: 10, windowMs: 60_000 }; // 10 / min