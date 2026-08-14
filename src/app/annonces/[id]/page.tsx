import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAnnonceById } from "@/lib/queries";
import { getCurrentClub } from "@/lib/auth";
import { getCategorie, DOM_EXT_LABEL, NIVEAU_LABEL } from "@/lib/referential";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "@/components/Badges";
import { ClubAvatar } from "@/components/ClubAvatar";
import { ContactForm } from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export default async function AnnonceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const annonce = await fetchAnnonceById(id);
  if (!annonce || annonce.statut === "annule") notFound();

  const cat = getCategorie(annonce.equipe.categorie);
  const dom = annonce.domicileExterieur as keyof typeof DOM_EXT_LABEL;
  const club = await getCurrentClub();
  const isOwn = club?.id === annonce.clubId;
  const canContact =
    !!club && club.role === "club" && club.statutVerification === "valide" && !isOwn && annonce.statut === "ouvert";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:text-paper">← Retour aux annonces</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Détail */}
        <article className="card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-ink-3 to-ink-2 px-6 py-6">
            <p className="eyebrow text-accent">{cat?.groupe === "jeunes" ? "Jeunes" : "Adultes / Loisirs"}</p>
            <h1 className="headline mt-1 text-5xl text-paper">{cat?.label}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {annonce.equipe.niveau && <NiveauBadge niveau={annonce.equipe.niveau} />}
              <StatutAnnonceBadge statut={annonce.statut} />
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
              📍 {annonce.club.district} · {annonce.club.ville} ({annonce.club.codePostal})
            </p>
            <p className="mt-0.5 text-xs text-muted-2">Ligue {annonce.club.ligue}</p>
            <p className="mt-1 text-xs text-muted-2">Publié {relTime(annonce.createdAt)}</p>
          </div>
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