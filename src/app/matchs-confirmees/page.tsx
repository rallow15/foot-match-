import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { formatDateLongFR } from "@/lib/utils";

export const metadata = {
  title: "Matchs confirmés — Matchs Amicaux",
  description:
    "Découvrez les matchs amicaux confirmés entre clubs amateurs de football.",
};

export const dynamic = "force-dynamic";

export default async function MatchsConfirmesPage() {
  const annonces = await prisma.annonce.findMany({
    where: { statut: "confirme" },
    include: {
      equipe: true,
      club: {
        select: {
          id: true,
          nom: true,
          ville: true,
          district: true,
          ligue: true,
          logoUrl: true,
        },
      },
      matchResult: true,
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Matchs amicaux · Football amateur</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">
        Matchs confirmés
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Les matchs amicaux organisés entre clubs via Matchs Amicaux. Scores et
        commentaires renseignés par les clubs.
      </p>

      {annonces.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="headline text-2xl text-paper">
            Aucun match confirmé pour le moment
          </p>
          <p className="mt-2 text-muted">
            Les clubs n’ont pas encore confirmé de matchs. Revenez bientôt.
          </p>
          <Link href="/annonces" className="btn-accent mt-4 inline-block">
            Rechercher un match
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {annonces.map((a) => {
            const cat = getCategorie(a.equipe.categorie);
            const dom = a.domicileExterieur as keyof typeof DOM_EXT_LABEL;
            const result = a.matchResult;
            const hasScore =
              result?.scoreDomicile != null && result?.scoreExterieur != null;

            return (
              <li key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">
                      {cat?.groupe === "jeunes" ? "Jeunes" : "Adultes / Loisirs"}
                    </p>
                    <h2 className="headline mt-1 text-2xl text-paper">
                      {cat?.label}
                    </h2>
                    {a.equipe.niveau && (
                      <p className="mt-1 text-sm text-muted-2">
                        {a.equipe.niveau}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="headline text-xl text-accent">
                      {hasScore
                        ? `${result!.scoreDomicile} - ${result!.scoreExterieur}`
                        : "VS"}
                    </p>
                    {result?.adversaireNom && (
                      <p className="text-sm text-muted">{result.adversaireNom}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-1 text-sm text-muted">
                  <p>📅 {formatDateLongFR(a.date)} · {a.heure}</p>
                  <p>📍 {DOM_EXT_LABEL[dom] ?? dom} · {a.club.ville}</p>
                  <p>
                    🏟️ {a.club.nom}
                    {a.stadeDispo && a.stadeNom ? ` · ${a.stadeNom}` : ""}
                  </p>
                </div>

                {result?.commentaire && (
                  <p className="mt-3 text-sm italic leading-relaxed text-muted">
                    « {result.commentaire} »
                  </p>
                )}

                <div className="mt-4 border-t border-line pt-4">
                  <Link
                    href={`/annonces/${a.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    Voir l’annonce →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
