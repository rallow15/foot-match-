import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchAnnonceByIdCached as fetchAnnonceById,
  fetchSimilarAnnonces,
} from "@/lib/queries";
import { getCurrentClub } from "@/lib/auth";
import { getCategorie, DOM_EXT_LABEL, NIVEAU_LABEL } from "@/lib/referential";

import { formatDateLongFR, relTime, todayISO, isNouveau } from "@/lib/utils";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "@/components/Badges";
import { ClubAvatar } from "@/components/ClubAvatar";
import { AnnonceCard } from "@/components/AnnonceCard";
import { ContactForm } from "@/components/ContactForm";
import { FavoriButton } from "@/components/FavoriButton";
import { SignalementForm } from "@/components/SignalementForm";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const annonce = await fetchAnnonceById(id);
  if (!annonce) return { title: "Annonce introuvable — Matchs Amicaux" };
  const cat = getCategorie(annonce.equipe.categorie);
  const title = `${cat?.label ?? annonce.equipe.categorie} · ${formatDateLongFR(annonce.date)} · ${annonce.club.nom}`;
  return {
    title,
    description: `Match amical ${cat?.label ?? ""} proposé par ${annonce.club.nom} (${annonce.club.ville}). Contactez le club pour organiser le match.`,
  };
}

export default async function AnnonceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const annonce = await fetchAnnonceById(id);
  // 404 si introuvable, annulée, ou à date passée : l'auto-expiration s'applique
  // aussi à l'accès direct (la recherche filtre déjà date >= today, mais un
  // lien direct sur une annonce périmée ne doit ni s'afficher ni être
  // contactable).
  if (!annonce || annonce.statut === "annule" || annonce.date < todayISO()) notFound();

  const cat = getCategorie(annonce.equipe.categorie);
  const dom = annonce.domicileExterieur as keyof typeof DOM_EXT_LABEL;
  const club = await getCurrentClub();
  const isOwn = club?.id === annonce.clubId;
  const canContact =
    !!club && club.role === "club" && club.statutVerification === "valide" && !isOwn && annonce.statut === "ouvert";

  const isFavori = club && club.role === "club" && !isOwn
    ? await prisma.favori.findUnique({
        where: { clubId_type_cibleId: { clubId: club.id, type: "annonce", cibleId: annonce.id } },
        select: { id: true },
      }).then(Boolean)
    : false;

  const similar = await fetchSimilarAnnonces(annonce.id, annonce.equipe.categorie, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/annonces" className="text-sm text-muted hover:text-paper">← Retour aux annonces</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Détail */}
        <article className="card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-ink-3 to-ink-2 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-accent">{cat?.groupe === "jeunes" ? "Jeunes" : "Adultes / Loisirs"}</p>
                <h1 className="headline mt-1 text-5xl text-paper">{cat?.label}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {annonce.equipe.niveau && <NiveauBadge niveau={annonce.equipe.niveau} />}
                  {isNouveau(annonce.createdAt) && <span className="chip-accent text-[10px]">NOUVEAU</span>}
                  <StatutAnnonceBadge statut={annonce.statut} />
                </div>
              </div>
              {club && club.role === "club" && !isOwn && (
                <FavoriButton type="annonce" cibleId={annonce.id} initial={isFavori} />
              )}
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Info label="Date">{formatDateLongFR(annonce.date)}</Info>
            <Info label="Horaire">{annonce.heure}</Info>
            <Info label="Domicile / Extérieur">{DOM_EXT_LABEL[dom] ?? dom}</Info>
            <Info label="Niveau souhaité">
              {annonce.niveauSouhaite ? (NIVEAU_LABEL[annonce.niveauSouhaite] ?? annonce.niveauSouhaite) : "Indifférent"}
            </Info>
            <Info label="Stade">
              {annonce.stadeDispo
                ? `Disponible — ${annonce.stadeNom}${annonce.stadeVille ? ` (${annonce.stadeVille})` : ""}`
                : "Non disponible"}
            </Info>
            <Info label="Arbitre">{annonce.arbitreDispo ? "Disponible" : "Non disponible"}</Info>
          </div>

          {annonce.note && (
            <div className="border-t border-line px-6 py-5">
              <p className="eyebrow mb-2">Note du club</p>
              <p className="text-paper italic leading-relaxed">« {annonce.note} »</p>
            </div>
          )}

          <div className="border-t border-line px-6 py-5">
            <p className="eyebrow mb-2">Club annonceur</p>
            <Link href={`/clubs/${annonce.club.id}`} className="flex items-center gap-3 hover:opacity-90">
              <ClubAvatar club={{ nom: annonce.club.nom, logoUrl: annonce.club.logoUrl }} size={44} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="headline text-xl text-paper hover:text-accent">{annonce.club.nom}</span>
                {annonce.club.statutVerification === "valide" && <VerifiedBadge />}
              </div>
            </Link>
            <p className="mt-2 text-sm text-muted">
              📍 {annonce.club.departement ? `${annonce.club.departement} · ` : ""}{annonce.club.ville} ({annonce.club.codePostal})
            </p>
            <p className="mt-0.5 text-xs text-muted-2">Ligue {annonce.club.ligue} · {annonce.club.district}</p>
            <p className="mt-1 text-xs text-muted-2">Publié {relTime(annonce.createdAt)}</p>
          </div>
          {club && club.role === "club" && !isOwn && (
            <SignalementForm annonceId={annonce.id} />
          )}
        </article>

        {/* Panneau contact */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {isOwn ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">C&apos;est votre annonce</p>
              <p className="mt-2 text-sm text-muted">
                Gérez-la depuis votre espace club.
              </p>
              <Link href="/dashboard" className="btn-ghost mt-4">Mon espace</Link>
            </div>
          ) : !club ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">Connectez-vous pour contacter</p>
              <p className="mt-2 text-sm text-muted">
                La mise en relation est réservée aux clubs vérifiés.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/login" className="btn-accent">Se connecter</Link>
                <Link href="/inscription" className="btn-ghost">Inscrire mon club</Link>
              </div>
            </div>
          ) : club.statutVerification !== "valide" ? (
            <div className="card p-6 text-center">
              <p className="headline text-xl text-paper">Compte en vérification</p>
              <p className="mt-2 text-sm text-muted">
                Votre compte doit être validé pour contacter un club.
              </p>
            </div>
          ) : canContact ? (
            <ContactForm annonceId={annonce.id} />
          ) : (
            <div className="card p-6 text-center">
              <p className="text-sm text-muted">Cette annonce n&apos;est plus ouverte.</p>
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <p className="eyebrow text-accent">Vous pourriez aimer</p>
          <h2 className="headline mt-2 text-2xl text-paper">Autres annonces {getCategorie(annonce.equipe.categorie)?.label}</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {similar.map((a) => (
              <li key={a.id}>
                <AnnonceCard annonce={a} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-paper">{children}</p>
    </div>
  );
}