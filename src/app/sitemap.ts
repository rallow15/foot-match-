import type { MetadataRoute } from "next";

// Domaine principal du site. On force ici le domaine personnalise car
// Vercel peut injecter APP_URL avec l'URL de deployment par defaut
// (ex. foot-match-xxx.vercel.app) ce qui invalide le sitemap dans
// Google Search Console.
const BASE_URL = "https://www.monmatchamical.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/annonces",
    "/matchs-confirmees",
    "/comment-ca-marche",
    "/ajouter-ecran-accueil",
    "/contact",
    "/login",
    "/inscription",
    "/mot-de-passe-oublie",
  ];

  return staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
