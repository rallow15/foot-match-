import { NextRequest, NextResponse } from "next/server";

// Proxy (Next 16, ex "middleware") — deux roles :
//  1. Poser une CSP solide mais compatible avec les pages statiques. On ne
//     utilise PAS de nonce car les nonces empechent le cache CDN/statique
//     (cf. doc Next 16 CSP). A la place on accepte les inline scripts via
//     'unsafe-inline' en production, mais PAS 'unsafe-eval'. style-src garde
//     'unsafe-inline' car Next/Tailwind injectent des styles inline.
//  2. Garde d'UX : rediriger vers /login les requetes sur /dashboard et /admin
//     sans cookie de session. NB : ce n'est PAS l'auth — la verification reelle
//     se fait dans chaque page/action serveur (cf. getCurrentClub). Le proxy ne
//     fait qu'eviter de servir un shell protege a un visiteur non connecte.

const SESSION_COOKIE = "foot_session";

function safeOrigin(u: string | undefined): string {
  if (!u) return "";
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}

// Construit la CSP. En production : script-src 'self' 'unsafe-inline' (pas
// d'unsafe-eval, pas de nonce). En dev : on ajoute 'unsafe-eval' pour React
// DevTools et les stacks serveur reconstruites cote navigateur.
function buildCsp(isDev: boolean): string {
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
    : "'self' 'unsafe-inline'";

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
  const csp = buildCsp(isDev);

  const requestHeaders = new Headers(request.headers);
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
  // Le proxy tourne sur les requetes HTML pour poser la CSP. On exclut :
  // - l'API, les assets statiques, les images
  // - les prefetchs Next.js (header next-router-prefetch / purpose=prefetch)
  // - les requetes RSC internes (_next/data et flight)
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
