import { notFound, redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchMyEquipes } from "@/lib/queries";
import { AnnonceForm } from "@/components/dashboard/AnnonceForm";

export const dynamic = "force-dynamic";

export default async function ModifierAnnoncePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role !== "club") redirect("/admin");
  if (club.statutVerification !== "valide") redirect("/dashboard");

  const annonce = await prisma.annonce.findFirst({ where: { id, clubId: club.id } });
  if (!annonce) notFound();

  const equipes = await fetchMyEquipes(club.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Mon espace</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Modifier l&apos;annonce</h1>
      <div className="mt-6">
        <AnnonceForm
          equipes={equipes}
          mode="edit"
          annonceId={annonce.id}
          initial={{
            equipeId: annonce.equipeId,
            date: annonce.date,
            heure: annonce.heure,
            domicileExterieur: annonce.domicileExterieur,
            stadeDispo: annonce.stadeDispo,
            stadeNom: annonce.stadeNom ?? "",
            arbitreDispo: annonce.arbitreDispo,
            niveauSouhaite: annonce.niveauSouhaite ?? "",
            note: annonce.note ?? "",
          }}
        />
      </div>
    </div>
  );
}