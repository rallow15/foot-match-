import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { fetchMyEquipes } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { AnnonceForm } from "@/components/dashboard/AnnonceForm";

export const dynamic = "force-dynamic";

export default async function NouvelleAnnoncePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string | string[] }>;
}) {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role !== "club") redirect("/admin");
  if (club.statutVerification !== "valide") redirect("/dashboard");

  const sp = await searchParams;
  const duplicateId = typeof sp.duplicate === "string" ? sp.duplicate : undefined;

  const [equipes, source] = await Promise.all([
    fetchMyEquipes(club.id),
    duplicateId
      ? prisma.annonce.findFirst({
          where: { id: duplicateId, clubId: club.id },
          select: {
            equipeId: true,
            date: true,
            heure: true,
            domicileExterieur: true,
            stadeDispo: true,
            stadeNom: true,
            arbitreDispo: true,
            niveauSouhaite: true,
            note: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const duplicateInitial = source
    ? {
        equipeId: source.equipeId,
        date: source.date,
        heure: source.heure,
        domicileExterieur: source.domicileExterieur,
        stadeDispo: source.stadeDispo,
        stadeNom: source.stadeNom ?? "",
        arbitreDispo: source.arbitreDispo,
        niveauSouhaite: source.niveauSouhaite ?? "",
        note: source.note ?? "",
      }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Mon espace</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Nouvelle annonce</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Décrivez le match que vous cherchez. Il apparaîtra dans les résultats de
        recherche des autres clubs. Confirmez-le une fois un adversaire trouvé.
      </p>
      {duplicateInitial && (
        <p className="mt-2 text-sm text-accent">
          Annonce pré-remplie d’après une publication existante. Vérifiez la date avant de publier.
        </p>
      )}
      <div className="mt-6">
        <AnnonceForm equipes={equipes} mode="create" initial={duplicateInitial} />
      </div>
    </div>
  );
}