import { NextResponse } from "next/server";
import { getCurrentClub } from "@/lib/auth";

// Endpoint client pour connaitre l'etat de connexion SANS forcer le layout
// racine a etre dynamique. Le layout peut rester statique/cachable ; le
// header client appelle /api/me apres hydratation pour afficher le bon
// bouton (connexion / espace club / admin).
export const dynamic = "force-dynamic";

export async function GET() {
  const club = await getCurrentClub();
  if (!club) {
    return NextResponse.json({ club: null });
  }
  return NextResponse.json({
    club: {
      id: club.id,
      nom: club.nom,
      role: club.role as "club" | "admin",
    },
  });
}
