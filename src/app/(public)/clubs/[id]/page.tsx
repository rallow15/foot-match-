import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchClubProfileCached as fetchClubProfile } from "@/lib/queries";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { ClubAvatar } from "@/components/ClubAvatar";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "@/components/Badges";

export const revalidate = 60;
export const dynamic = "force-static";

export default async function ClubProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await fetchClubProfile(id);

  if (!club || club.role === "admin" || club.statutVerification === "refuse") {
    notFound();
  }

  const isValide = club.statutVerification === "valide";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:text-paper">← Retour aux annonces</Link>

      <section className="card mt-4 overflow-hidden">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-ink-3 to-ink-2 p-6 sm:flex-row sm:items-center">
          <ClubAvatar club={{ nom: club.nom, logoUrl: club.logoUrl }} size={96} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="headline text-4xl text-paper">{club.nom}</h1>
              {isValide && <VerifiedBadge />}
            </div>
            <p className="mt-2 text-sm text-muted">
              📍 {club.district} · {club.ville} ({club.codePostal})
            </p>
            <p className="mt-0.5 text-xs text-muted-2">Ligue {club.ligue} · Membre {relTime(club.createdAt)}</p>
            {!isValide && (
              <p className="mt-2 text-xs text-gold">Compte en cours de vérification.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="headline title-bar text-2xl text-paper">Équipes</h2>
        {club.equipes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune équipe renseignée.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {club.equipes.map((e) => (
              <li key={e.id} className="card flex items-center justify-between p-4">
                <span className="headline text-lg text-paper">{getCategorie(e.categorie)?.label ?? e.categorie}</span>
                {e.niveau ? <NiveauBadge niveau={e.niveau} /> : <span className="text-xs text-muted-2">Niveau —</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="headline title-bar text-2xl text-paper">Matchs recherchés</h2>
        {club.annonces.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune annonce ouverte pour le moment.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {club.annonces.map((a) => {
              const cat = getCategorie(a.equipe.categorie);
              const dom = a.domicileExterieur as keyof typeof DOM_EXT_LABEL;
              return (
                <li key={a.id}>
                  <Link
                    href={`/annonces/${a.id}`}
                    className="card card-hover flex flex-wrap items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="headline text-xl text-paper">{cat?.label}</span>
                        {a.equipe.niveau && <NiveauBadge niveau={a.equipe.niveau} />}
                        <StatutAnnonceBadge statut={a.statut} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {formatDateLongFR(a.date)} · {a.heure} · {DOM_EXT_LABEL[dom] ?? a.domicileExterieur}
                        {a.stadeDispo ? ` · stade ${a.stadeNom}` : ""}
                        {a.arbitreDispo ? " · arbitre" : ""}
                      </p>
                    </div>
                    <span className="btn-ghost text-xs">Voir l&apos;annonce</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
