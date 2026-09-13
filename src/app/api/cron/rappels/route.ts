import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRappelMatch } from "@/lib/mail";
import { annonceLabel } from "@/lib/utils";

// Vercel Cron : rappel 3 jours avant chaque match confirmé.
export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (expected && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dans3jours = new Date();
  dans3jours.setDate(dans3jours.getDate() + 3);
  const dateCible = dans3jours.toISOString().slice(0, 10);

  const annonces = await prisma.annonce.findMany({
    where: {
      statut: "confirme",
      date: dateCible,
      adversaireNom: { not: null },
    },
    include: {
      club: { select: { email: true, nom: true, telephone: true } },
      equipe: { select: { categorie: true } },
    },
    take: 200,
  });

  const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
  let sent = 0;
  let errors = 0;

  for (const a of annonces) {
    try {
      await sendRappelMatch({
        to: a.club.email,
        nom: a.club.nom,
        adversaireNom: a.adversaireNom ?? "votre adversaire",
        annonceLabel: annonceLabel({ categorie: a.equipe.categorie, date: a.date, heure: a.heure }),
        annonceUrl: `${appUrl}/dashboard`,
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors, checked: annonces.length });
}
