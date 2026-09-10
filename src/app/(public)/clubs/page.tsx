import Link from "next/link";
import { Suspense } from "react";
import { searchClubs, type ClubSearchParams } from "@/lib/queries";
import { getCurrentClub } from "@/lib/auth";
import { ClubSearchFilters } from "@/components/ClubSearchFilters";
import { ClubCard } from "@/components/ClubCard";
import { Pagination } from "@/components/Pagination";
import { haversineKm } from "@/lib/geo";

export const metadata = {
  title: "Rechercher un club — Matchs Amicaux",
  description:
    "Trouvez un club amateur de football près de chez vous et entrez directement en contact pour organiser un match amical.",
};

export const revalidate = 60;

const SEARCH_FIELDS = ["categorie", "niveau", "ligue", "district", "ville"];

export default async function ClubsSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const currentClub = await getCurrentClub();

  const params: ClubSearchParams = {
    categorie: get("categorie"),
    niveau: get("niveau"),
    ligue: get("ligue"),
    district: get("district"),
    ville: get("ville"),
    latitude: get("latitude"),
    longitude: get("longitude"),
    rayon: get("rayon"),
    excludeClubId: currentClub?.id,
    page: get("page"),
  };

  const hasSearch = SEARCH_FIELDS.some((k) => Boolean(params[k as keyof typeof params]));

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 12;

  const { clubs, total } = hasSearch
    ? await searchClubs(params)
    : { clubs: [], total: 0 };

  const totalPages = Math.ceil(total / limit);

  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Clubs amateurs · Football</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="headline title-bar text-3xl text-paper">Trouver un club</h1>
        <Link href="/dashboard/annonces/nouvelle" prefetch className="btn-accent text-sm">
          Proposer un match
        </Link>
      </div>

      <Suspense fallback={<div className="mt-6 h-32 animate-pulse rounded bg-ink-3" />}>
        <ClubSearchFilters
          initial={{
            categorie: params.categorie,
            niveau: params.niveau,
            ligue: params.ligue,
            district: params.district,
            ville: params.ville,
            latitude: params.latitude,
            longitude: params.longitude,
            rayon: params.rayon,
          }}
        />
      </Suspense>

      <div className="mt-10 flex items-baseline justify-between">
        <p className="text-sm text-muted">
          {hasSearch ? (
            <>
              <span className="font-display text-lg text-paper">{clubs.length}</span>{" "}
              {clubs.length > 1 ? "clubs trouvés" : "club trouvé"}
              {total > limit && (
                <span className="text-muted-2"> · {total} au total</span>
              )}
            </>
          ) : (
            <span className="text-muted-2">
              Remplissez les critères ci-dessus pour lancer une recherche.
            </span>
          )}
        </p>
      </div>

      {!hasSearch ? (
        <div className="card mt-6 p-12 text-center">
          <p className="headline text-2xl text-paper">Lancez votre recherche</p>
          <p className="mt-2 text-muted">
            Choisissez une catégorie d&apos;équipe (et optionnellement un district ou une ville) puis cliquez sur{" "}
            <span className="text-accent">Rechercher des clubs</span>.
          </p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="headline text-2xl text-paper">Aucun club pour ces critères</p>
          <p className="mt-2 text-muted">
            Élargissez la recherche (autre district, plus grand rayon) ou{" "}
            <Link href="/dashboard/annonces/nouvelle" className="text-accent hover:underline">
              proposez une annonce
            </Link>{" "}
            pour être contacté.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {clubs.map((c) => (
              <ClubCard
                key={c.id}
                club={c}
                distanceKm={hasGeo ? haversineKm(lat, lng, c.latitude, c.longitude) : null}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/clubs"
            filters={{
              categorie: params.categorie,
              niveau: params.niveau,
              ligue: params.ligue,
              district: params.district,
              ville: params.ville,
              latitude: params.latitude,
              longitude: params.longitude,
              rayon: params.rayon,
            }}
          />
        </>
      )}
    </div>
  );
}
