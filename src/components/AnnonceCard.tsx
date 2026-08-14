import Link from "next/link";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "./Badges";
import { ClubAvatar } from "./ClubAvatar";

interface AnnonceCardProps {
  annonce: {
    id: string;
    date: string;
    heure: string;
    domicileExterieur: string;
    stadeDispo: boolean;
    stadeNom: string | null;
    stadeVille: string | null;
    arbitreDispo: boolean;
    niveauSouhaite: string | null;
    note: string | null;
    statut: string;
    createdAt: Date;
    equipe: { categorie: string; niveau: string | null };
    club: {
      id: string;
      nom: string;
      ville: string;
      district: string;
      ligue: string;
      statutVerification: string;
      logoUrl: string | null;
    };
  };
  distanceKm?: number | null;
}

export function AnnonceCard({ annonce, distanceKm = null }: AnnonceCardProps) {
  const cat = getCategorie(annonce.equipe.categorie);
  const dom = annonce.domicileExterieur as keyof typeof DOM_EXT_LABEL;
  const verified = annonce.club.statutVerification === "valide";

  return (
    <article className="card card-hover flex flex-col reveal">
      {/* Bande catégorie — style "compétition" */}
      <div className="relative border-b border-line bg-gradient-to-br from-ink-3 to-ink-2 px-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{cat?.groupe === "jeunes" ? "Jeunes" : "Adultes / Loisirs"}</p>
            <h3 className="headline mt-1 text-3xl text-paper">{cat?.label}</h3>
            {annonce.equipe.niveau && (
              <div className="mt-2">
                <NiveauBadge niveau={annonce.equipe.niveau} />
              </div>
            )}
          </div>
          <StatutAnnonceBadge statut={annonce.statut} />
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* En-tête "post" : avatar + club cliquable + temps (style feed social) */}
        <div className="flex items-center gap-3">
          <Link href={`/clubs/${annonce.club.id}`} className="shrink-0" aria-label={`Profil de ${annonce.club.nom}`}>
            <ClubAvatar club={{ nom: annonce.club.nom, logoUrl: annonce.club.logoUrl }} size={40} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/clubs/${annonce.club.id}`} className="font-medium text-paper hover:underline">
                {annonce.club.nom}
              </Link>
              {verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-2">Publié {relTime(annonce.createdAt)}</p>
          </div>
        </div>

        <div>
          <p className="headline text-sm text-accent">
            {formatDateLongFR(annonce.date)}
          </p>
          <p className="mt-1 text-sm text-muted">
            À {annonce.heure} · {DOM_EXT_LABEL[dom] ?? dom}
          </p>
        </div>

        <p className="text-xs text-muted">
          📍 {annonce.club.district} · {annonce.club.ville}
          {distanceKm != null && !Number.isNaN(distanceKm) && (
            <span className="text-muted-2"> · à {Math.round(distanceKm)} km</span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {annonce.stadeDispo ? (
            <span className="chip-accent">Stade dispo{annonce.stadeNom ? ` · ${annonce.stadeNom}` : ""}</span>
          ) : (
            <span className="chip-muted">Pas de stade</span>
          )}
          {annonce.arbitreDispo ? (
            <span className="chip-accent">Arbitre dispo</span>
          ) : (
            <span className="chip-muted">Pas d&apos;arbitre</span>
          )}
          {annonce.niveauSouhaite && (
            <span className="chip-muted">Niveau visé : {annonce.niveauSouhaite}</span>
          )}
        </div>

        {annonce.note && (
          <p className="text-sm italic leading-relaxed text-muted line-clamp-2">
            « {annonce.note} »
          </p>
        )}

        <div className="mt-auto pt-2">
          <Link href={`/annonces/${annonce.id}`} className="btn-accent w-full">
            Contacter le club
          </Link>
        </div>
      </div>
    </article>
  );
}