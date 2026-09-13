import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotationEmail } from "@/lib/mail";
import { annonceLabel } from "@/lib/utils";

// Vercel Cron : envoi quotidien d’emails de notation 1 jour après un match confirmé.
export async function GET(request: Request) {
  // Protection simple par secret (configurable via CRON_SECRET).
  const auth = request.headers.get("Authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (expected && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  const hierISO = hier.toISOString().slice(0, 10);

  const annonces = await prisma.annonce.findMany({
    where: {
      statut: "confirme",
      date: { lte: hierISO },
      adversaireNom: { not: null },
      avisEmailSentAt: null,
    },
    include: {
      club: { select: { email: true, nom: true } },
      equipe: { select: { categorie: true } },
    },
    take: 100,
  });

  let sent = 0;
  let errors = 0;

  for (const a of annonces) {
    const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const dashboardUrl = `${appUrl}/dashboard?noter=${a.id}`;
    try {
      await sendNotationEmail({
        to: a.club.email,
        nom: a.club.nom,
        adversaireNom: a.adversaireNom ?? "votre adversaire",
        annonceLabel: annonceLabel({ categorie: a.equipe.categorie, date: a.date, heure: a.heure }),
        dashboardUrl,
      });
      await prisma.annonce.update({
        where: { id: a.id },
        data: { avisEmailSentAt: new Date() },
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, errors, checked: annonces.length });
}
