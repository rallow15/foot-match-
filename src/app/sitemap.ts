import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/utils";

// Domaine principal du site. On force ici le domaine personnalise car
// Vercel peut injecter APP_URL avec l'URL de deployment par defaut
// (ex. foot-match-xxx.vercel.app) ce qui invalide le sitemap dans
// Google Search Console.
const BASE_URL = "https://www.monmatchamical.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/annonces",
    "/clubs",
    "/matchs-confirmees",
    "/comment-ca-marche",
    "/ajouter-ecran-accueil",
    "/contact",
    "/login",
    "/inscription",
    "/mot-de-passe-oublie",
  ];

  const staticEntries = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === "/" ? "daily" : "weekly") as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: route === "/" ? 1 : 0.8,
  }));

  const [annonces, clubs] = await Promise.all([
    prisma.annonce.findMany({
      where: { statut: "ouvert", date: { gte: todayISO() } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.club.findMany({
      where: { role: "club", statutVerification: "valide" },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const annonceEntries = annonces.map((a) => ({
    url: `${BASE_URL}/annonces/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const clubEntries = clubs.map((c) => ({
    url: `${BASE_URL}/clubs/${c.id}`,
    lastModified: c.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...annonceEntries, ...clubEntries];
}
