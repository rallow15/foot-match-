import Link from "next/link";
import { ClubAvatar } from "./ClubAvatar";
import { getCategorie } from "@/lib/referential";

interface Props {
  club: {
    id: string;
    nom: string;
    ville: string;
    district: string;
    ligue: string;
    logoUrl: string | null;
    equipes: { categorie: string; niveau: string | null }[];
  };
  distanceKm?: number | null;
}

export function ClubCard({ club, distanceKm = null }: Props) {
  // Regroupe les catégories uniques (plusieurs équipes peuvent avoir la même catégorie).
  const categories = Array.from(new Set(club.equipes.map((e) => e.categorie)))
    .map((value) => getCategorie(value))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <article className="card card-hover flex flex-col">
      <Link href={`/clubs/${club.id}`} className="group block p-5">
        <div className="flex items-start gap-4">
          <ClubAvatar club={{ nom: club.nom, logoUrl: club.logoUrl }} size={56} />
          <div className="min-w-0">
            <h3 className="headline text-xl text-paper group-hover:text-accent">
              {club.nom}
            </h3>
            <p className="mt-1 text-sm text-muted">
              📍 {club.district} · {club.ville}
              {distanceKm != null && !Number.isNaN(distanceKm) && (
                <span className="text-muted-2"> · à {Math.round(distanceKm)} km</span>
              )}
            </p>
            <p className="text-xs text-muted-2">Ligue {club.ligue}</p>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span key={cat.value} className="chip-muted text-xs">
                {cat.label}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="mt-auto border-t border-line p-4">
        <Link href={`/clubs/${club.id}`} className="btn-accent w-full text-sm">
          Voir le profil
        </Link>
      </div>
    </article>
  );
}
