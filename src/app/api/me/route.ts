import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "foot_session";

function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Endpoint client pour connaitre l'etat de connexion SANS forcer le layout
// racine a etre dynamique. Le layout peut rester statique/cachable ; le
// header client appelle /api/me apres hydratation pour afficher le bon
// bouton (connexion / espace club / admin).
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ club: null, debug: "no cookie" });
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ club: null, debug: "no session" });
  }

  const club = await prisma.club.findUnique({
    where: { id: session.clubId },
    select: { id: true, nom: true, role: true },
  });

  if (!club) {
    return NextResponse.json({ club: null, debug: "no club" });
  }

  return NextResponse.json({
    club: {
      id: club.id,
      nom: club.nom,
      role: club.role as "club" | "admin",
    },
  });
}
