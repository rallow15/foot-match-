import type { NextConfig } from "next";

// La CSP est posée par requête dans src/proxy.ts (nonce par requête, cf. doc
// Next 16 CSP). On ne la définit PAS ici pour éviter un doublon d'en-tête qui
// serait résolu en faveur de la directive la plus permissive. Les autres
// en-têtes de sécurité (statiques) restent ici.

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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