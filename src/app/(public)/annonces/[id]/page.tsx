import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAnnonceByIdCached as fetchAnnonceById } from "@/lib/queries";
import { getCategorie, DOM_EXT_LABEL, NIVEAU_LABEL } from "@/lib/referential";
import { formatDateLongFR, relTime, todayISO } from "@/lib/utils";
import { NiveauBadge, StatutAnnonceBadge, VerifiedBadge } from "@/components/Badges";
import { ClubAvatar } from "@/components/ClubAvatar";
import { AnnonceContactPanel } from "@/components/AnnonceContactPanel";

export const revalidate = 60;
export const dynamic = "force-static";

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
          <AnnonceContactPanel annonceId={annonce.id} annonceClubId={annonce.clubId} />
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