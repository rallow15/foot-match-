import { redirect } from "next/navigation";
import { getPendingOAuthProfile } from "@/lib/oauth-state";
import { OAuthCompleteForm } from "@/components/auth/OAuthCompleteForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compléter l'inscription — Matchs Amicaux",
};

export default async function OAuthCompletePage() {
  // Lecture seule : la suppression du cookie temporaire est faite dans la Server
  // Action, une fois le compte créé avec succès.
  const pending = await getPendingOAuthProfile();

  // Si le cookie temporaire est absent/expiré, on renvoie vers l'inscription classique.
  if (!pending) {
    redirect("/inscription");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-14 sm:px-6">
      <OAuthCompleteForm />
    </div>
  );
}
