import Link from "next/link";
import { searchAnnonces } from "@/lib/queries";
import { haversineKm } from "@/lib/geo";
import { getCurrentClub } from "@/lib/auth";
import { AnnonceCard } from "@/components/AnnonceCard";
import { SearchFilters } from "@/components/SearchFilters";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

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
  };

  const [annonces, club] = await Promise.all([searchAnnonces(params), getCurrentClub()]);
  const proposeHref = club ? "/dashboard/annonces/nouvelle" : "/inscription";

  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow text-accent">Matchs amicaux · Football amateur</p>
          <h1 className="headline mt-3 max-w-3xl text-5xl text-paper sm:text-6xl md:text-7xl">
            Trouvez un adversaire.
            <span className="block text-accent">Organisez un match.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Proposez un match amical ou cherchez parmi les annonces publiées par les
            clubs près de chez vous. Filtrez par catégorie, date et distance — puis
            contactez le club directement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#rechercher" className="btn-accent">
              Rechercher un match
            </Link>
            <Link href={proposeHref} className="btn-ghost">
              Proposer un match
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            <div>
              <dt className="headline text-3xl text-accent">0€</dt>
              <dd className="mt-1 text-xs text-muted">Gratuit pour les clubs</dd>
            </div>
            <div>
              <dt className="headline text-3xl text-paper">2 min</dt>
              <dd className="mt-1 text-xs text-muted">Pour publier une annonce</dd>
            </div>
            <div>
              <dt className="headline text-3xl text-paper">100%</dt>
              <dd className="mt-1 text-xs text-muted">Clubs vérifiés</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* RECHERCHE */}
      <section id="rechercher" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="headline title-bar text-3xl text-paper">Rechercher un match</h2>

        <SearchFilters initial={params} />

        {/* RÉSULTATS */}
        <div className="mt-10 flex items-baseline justify-between">
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
              <Link href={proposeHref} className="text-accent hover:underline">
                proposez la vôtre
              </Link>{" "}
              — un club près de chez vous la verra peut-être.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {annonces.map((a) => (
              <AnnonceCard
                key={a.id}
                annonce={a}
                distanceKm={hasGeo ? haversineKm(lat, lng, a.club.latitude, a.club.longitude) : null}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}