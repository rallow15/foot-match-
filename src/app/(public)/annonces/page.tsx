import Link from "next/link";
import { Suspense } from "react";
import { searchAnnonces } from "@/lib/queries";
import { haversineKm } from "@/lib/geo";
import { getCurrentClub } from "@/lib/auth";
import { AnnonceCard } from "@/components/AnnonceCard";
import { SearchFilters } from "@/components/SearchFilters";

export const metadata = {
  title: "Rechercher un match — Matchs Amicaux",
  description:
    "Trouvez une annonce de match amical entre clubs amateurs de football. Filtrez par catégorie, date, ligue, district et distance.",
};

// La page reste dynamique à cause des searchParams, mais les requêtes DB
// sont mises en cache par `searchAnnonces` (unstable_cache).
export const revalidate = 60;

export default async function AnnoncesSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const currentClub = await getCurrentClub();

  const params = {
    categorie: get("categorie"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    niveau: get("niveau"),
    dom: get("dom"),
    stade: get("stade"),
    arbitre: get("arbitre"),
    ligue: get("ligue"),
    district: get("district"),
    ville: get("ville"),
    latitude: get("latitude"),
    longitude: get("longitude"),
    rayon: get("rayon"),
    excludeClubId: currentClub?.id,
  };

  const annonces = await searchAnnonces(params);

  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Matchs amicaux · Football amateur</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="headline title-bar text-3xl text-paper">Rechercher un match</h1>
        <Link href="/dashboard/annonces/nouvelle" prefetch className="btn-accent text-sm">
          Proposer un match
        </Link>
      </div>

      <Suspense fallback={<div className="mt-6 h-32 animate-pulse rounded bg-ink-3" />}>
        <SearchFilters initial={params} />
      </Suspense>

      {/* RÉSULTATS */}
      <div id="annonces-results" className="mt-10 flex items-baseline justify-between">
        <p className="text-sm text-muted">
          <span className="font-display text-lg text-paper">{annonces.length}</span>{" "}
          {annonces.length > 1 ? "annonces ouvertes" : "annonce ouverte"}
        </p>
      </div>

      {annonces.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="headline text-2xl text-paper">Aucune annonce pour ces critères</p>
          <p className="mt-2 text-muted">
            Élargissez la recherche ou{" "}
            <Link href="/dashboard/annonces/nouvelle" className="text-accent hover:underline">
              proposez la vôtre
            </Link>{" "}
            — un club près de chez vous la verra peut-être.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {annonces.map((a) => (
            <AnnonceCard
              key={a.id}
              annonce={a}
              distanceKm={hasGeo ? haversineKm(lat, lng, a.club.latitude, a.club.longitude) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
