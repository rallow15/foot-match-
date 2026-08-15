import type { NextConfig } from "next";

// Origine Supabase (servage public des logos via le CDN Storage).
// Calculée à la configuration ; absente en dev sans SUPABASE_URL -> img-src
// n'inclut simplement pas l'hôte Supabase.
function safeOrigin(u: string | undefined): string {
  if (!u) return "";
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}
const supabaseOrigin = safeOrigin(process.env.SUPABASE_URL);
const imgSources = [
  "'self'",
  "data:",
  "https://api-adresse.data.gouv.fr",
  supabaseOrigin,
].filter(Boolean).join(" ");

const isProd = process.env.NODE_ENV === "production";
// En production on retire 'unsafe-eval' (inutile en build App Router server
// components — aucune raison de l'autoriser). On garde 'unsafe-inline' le temps
// de migrer vers des nonces par requête (Next 16 les génère si on les achemine
// via le middleware) ; le retirer sans nonce casserait l'hydration.
const scriptSrc = isProd
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSources}`,
      "media-src 'self'",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api-adresse.data.gouv.fr",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
  // HSTS uniquement en production (HTTPS requis)
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;