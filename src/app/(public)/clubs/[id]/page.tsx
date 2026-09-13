import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchClubProfileCached as fetchClubProfile, fetchAvisForClub } from "@/lib/queries";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import type { Metadata } from "next";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { ClubAvatar } from "@/components/ClubAvatar";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "@/components/Badges";
import { getCurrentClub } from "@/lib/auth";
import { ClubContactForm } from "@/components/ClubContactForm";
import { FavoriButton } from "@/components/FavoriButton";
import { prisma } from "@/lib/db";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const club = await fetchClubProfile(id);
  if (!club) return { title: "Club introuvable — Matchs Amicaux" };
  return {
    title: `${club.nom} — Matchs Amicaux`,
    description: `Profil du club ${club.nom} à ${club.ville} (${club.district}, Ligue ${club.ligue}). Découvrez ses équipes et ses annonces de matchs amicaux.`,
  };
}

// Le header fournit déjà la navigation ; pas de lien retour inutile ici.

export default async function ClubProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await fetchClubProfile(id);
  const me = await getCurrentClub();

  // Pas de profil public pour : introuvable, admin, ou club refusé.
  if (!club || club.role === "admin" || club.statutVerification === "refuse") {
    notFound();
  }

  const isValide = club.statutVerification === "valide";
  const isOwn = me?.id === club.id;
  const canContact =
    !!me && me.role === "club" && me.statutVerification === "valide" && !isOwn && isValide;

  const isFavori = me && me.role === "club" && !isOwn
    ? await prisma.favori.findUnique({
        where: { clubId_type_cibleId: { clubId: me.id, type: "club", cibleId: club.id } },
        select: { id: true },
      }).then(Boolean)
    : false;

  const avis = await fetchAvisForClub(club.id);
  const noteMoyenne = avis.length > 0
    ? Math.round((avis.reduce((acc, a) => acc + a.note, 0) / avis.length) * 10) / 10
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/clubs" className="text-sm text-muted hover:text-paper">← Retour aux clubs</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Contenu principal */}
        <div className="space-y-8">
          {/* En-tête profil */}
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-5 bg-gradient-to-br from-ink-3 to-ink-2 p-6 sm:flex-row sm:items-center">
              <ClubAvatar club={{ nom: club.nom, logoUrl: club.logoUrl }} size={96} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="headline text-4xl text-paper">{club.nom}</h1>
                  {isValide && <VerifiedBadge />}
                </div>
                <p className="mt-2 text-sm text-muted">
                  📍 {club.departement ? `${club.departement} · ` : ""}{club.ville} ({club.codePostal})
                </p>
                <p className="mt-0.5 text-xs text-muted-2">Ligue {club.ligue} · {club.district} · Membre {relTime(club.createdAt)}</p>
                {noteMoyenne != null && (
                  <p className="mt-2 text-sm text-accent">⭐ {noteMoyenne} / 5 · {avis.length} avis</p>
                )}
                {!isValide && (
                  <p className="mt-2 text-xs text-gold">Compte en cours de vérification.</p>
                )}
              </div>
              {me && me.role === "club" && !isOwn && (
                <FavoriButton type="club" cibleId={club.id} initial={isFavori} />
              )}
            </div>
          </section>

          {(club.description || club.siteWeb) && (
            <section className="card p-6">
              {club.description && (
                <>
                  <p className="eyebrow">À propos</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-paper">{club.description}</p>
                </>
              )}
              {club.siteWeb && (
                <p className="mt-4">
                  <a
                    href={club.siteWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    Voir le site du club →
                  </a>
                </p>
              )}
            </section>
          )}

          {/* Équipes */}
          <section>
            <h2 className="headline title-bar text-2xl text-paper">Équipes</h2>
            {club.equipes.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aucune équipe renseignée.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {club.equipes.map((e) => (
                  <li key={e.id} className="card flex items-center justify-between p-4">
                    <span className="headline text-lg text-paper">
                      {getCategorie(e.categorie)?.label ?? e.categorie}
                    </span>
                    {e.niveau ? <NiveauBadge niveau={e.niveau} /> : <span className="text-xs text-muted-2">Niveau —</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Annonces ouvertes */}
          <section>
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

          {/* Avis */}
          {avis.length > 0 && (
            <section>
              <h2 className="headline title-bar text-2xl text-paper">Avis</h2>
              <ul className="mt-4 space-y-3">
                {avis.map((a) => (
                  <li key={`${a.auteurClub.nom}-${a.createdAt.toISOString()}`} className="card p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-accent">{"★".repeat(a.note)}{"☆".repeat(5 - a.note)}</span>
                      <span className="text-xs text-muted-2">· {a.auteurClub.nom}</span>
                    </div>
                    {a.commentaire && (
                      <p className="mt-2 text-sm text-paper">“ {a.commentaire} ”</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Panneau contact */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {isOwn ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">C&apos;est votre club</p>
              <p className="mt-2 text-sm text-muted">Gérez-le depuis votre espace club.</p>
              <Link href="/dashboard" className="btn-ghost mt-4">Mon espace</Link>
            </div>
          ) : !me ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">Connectez-vous pour contacter</p>
              <p className="mt-2 text-sm text-muted">La mise en relation est réservée aux clubs vérifiés.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/login" className="btn-accent">Se connecter</Link>
                <Link href="/inscription" className="btn-ghost">Inscrire mon club</Link>
              </div>
            </div>
          ) : me.statutVerification !== "valide" ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">Compte en vérification</p>
              <p className="mt-2 text-sm text-muted">Votre compte doit être validé pour contacter un club.</p>
            </div>
          ) : !isValide ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">Club non vérifié</p>
              <p className="mt-2 text-sm text-muted">Ce club est encore en cours de vérification. Revenez plus tard.</p>
            </div>
          ) : canContact ? (
            <ClubContactForm clubId={club.id} />
          ) : (
            <div className="card p-6 text-center">
              <p className="text-sm text-muted">Ce club n&apos;est pas joignable pour le moment.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}