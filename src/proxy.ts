import { NextRequest, NextResponse } from "next/server";

// Proxy (Next 16, ex « middleware ») — deux rôles :
//  1. Générer un nonce par requête et poser la CSP strict (script-src à nonce,
//     plus de 'unsafe-inline'). Toutes les pages HTML passent ici.
//  2. Garde d'UX : rediriger vers /login les requêtes sur /dashboard et /admin
//     sans cookie de session. NB : ce n'est PAS l'auth — la vérification réelle
//     se fait dans chaque page/action serveur (cf. getCurrentClub). Le proxy ne
//     fait qu'éviter de servir un shell protégé à un visiteur non connecté.

const SESSION_COOKIE = "foot_session";

function safeOrigin(u: string | undefined): string {
  if (!u) return "";
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}

// Construit la CSP. En production : script-src avec nonce + 'strict-dynamic'.
// En dev : on garde 'unsafe-inline' + 'unsafe-eval' (React DevTools / stacks
// serveur reconstruites côté navigateur). style-src reste 'unsafe-inline' : une
// injection CSS n'exécute pas de script, et Next/Tailwind injectent des styles
// inline que l'on ne veut pas casser.
function buildCsp(nonce: string, isDev: boolean): string {
  const supabaseOrigin = safeOrigin(process.env.SUPABASE_URL);
  const imgSources = [
    "'self'",
    "data:",
    "https://api-adresse.data.gouv.fr",
    supabaseOrigin,
  ]
    .filter(Boolean)
    .join(" ");

  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSources}`,
    "media-src 'self'",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api-adresse.data.gouv.fr",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, isDev);

  // On propage le nonce au rendu via une en-tête de requête (Next l'extrait de
  // la CSP pour l'attacher aux scripts inline qu'il génère).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Garde d'auth sur /dashboard et /admin.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Le proxy tourne sur les requêtes HTML pour poser la CSP. On exclut :
  // - l'API, les assets statiques, les images
  // - les prefetchs Next.js (header next-router-prefetch / purpose=prefetch)
  // - les requêtes RSC internes (_next/data et flight)
  // Les Server Actions (POST sur la route de la page) passent toujours par ici.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};