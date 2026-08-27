import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL ?? "https://www.monmatchamical.fr";

  const staticRoutes = [
    "/",
    "/annonces",
    "/matchs-confirmees",
    "/comment-ca-marche",
    "/ajouter-ecran-accueil",
    "/login",
    "/inscription",
    "/mot-de-passe-oublie",
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
