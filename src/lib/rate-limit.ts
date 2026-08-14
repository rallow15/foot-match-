// Rate limiting IP — en mémoire, adapté pour un déploiement mono-serveur (MVP).

interface RateEntry {
  count: number;
  resetAt: number; // Unix ms
}

const store = new Map<string, RateEntry>();

// Nettoyage périodique des entrées expirées (toutes les 10 min)
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now > entry.resetAt) store.delete(ip);
    }
  }, CLEANUP_INTERVAL);
  // Ne pas empêcher la fermeture du process
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as ReturnType<typeof setInterval> & { unref(): void }).unref();
  }
}

startCleanup();

export interface RateLimitOpts {
  maxRequests: number;
  windowMs: number;
}

/**
 * Retourne `true` si la requête est autorisée, `false` si le seuil est dépassé.
 */
export function rateLimit(ip: string, opts: RateLimitOpts): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > opts.maxRequests) {
    return false;
  }
  return true;
}

// Limiteurs pré-configurés
export const LOGIN_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const REGISTER_RATE_LIMIT: RateLimitOpts = { maxRequests: 3, windowMs: 60_000 }; // 3/min
export const CONTACT_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const UPLOAD_RATE_LIMIT: RateLimitOpts = { maxRequests: 5, windowMs: 60_000 }; // 5/min
export const PASSWORD_RESET_RATE_LIMIT: RateLimitOpts = { maxRequests: 3, windowMs: 600_000 }; // 3 / 10 min (anti email-bombing)