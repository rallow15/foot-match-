import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { fetchMyEquipes } from "@/lib/queries";
import { AnnonceForm } from "@/components/dashboard/AnnonceForm";

export const dynamic = "force-dynamic";

export default async function NouvelleAnnoncePage() {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role !== "club") redirect("/admin");
  if (club.statutVerification !== "valide") redirect("/dashboard");

  const equipes = await fetchMyEquipes(club.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Mon espace</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Nouvelle annonce</h1>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Décrivez le match que vous cherchez. Il apparaîtra dans les résultats de
        recherche des autres clubs. Marquez-le « Pourvu » une fois un adversaire
        trouvé.
      </p>
      <div className="mt-6">
        <AnnonceForm equipes={equipes} mode="create" />
      </div>
    </div>
  );
}