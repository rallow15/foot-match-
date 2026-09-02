// IP client pour le rate limiting.
// Sur Vercel, `x-vercel-forwarded-for` est l'IP réelle du client, non falsifiable
// par le requérant : on la privilégie sans condition.
// Hors Vercel (auto-hébergement derrière un reverse-proxy type Caddy/Nginx), les
// en-têtes `x-forwarded-for` / `x-real-ip` sont FALSIFIABLES par le client tant
// qu'aucun proxy de confiance ne les réécrit. On ne les fait donc confiance que
// si le déploiement l'exprime via TRUST_PROXY_HEADERS=1 (cf. .env.example).
// Sans cela, on renvoie "unknown" : le rate-limiting devient par hypothèse
// conservateur (toutes les requêtes partagent le même seau) plutôt que spoofable.

import { headers } from "next/headers";
import { NextRequest } from "next/server";

export async function getClientIpAsync(): Promise<string> {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  if (process.env.TRUST_PROXY_HEADERS === "1") {
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

export function getClientIp(request: NextRequest): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  if (process.env.TRUST_PROXY_HEADERS === "1") {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
    const real = request.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}
