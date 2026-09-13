import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAlerteDigest, sendNotationEmail, sendRappelMatch } from "@/lib/mail";
import { todayISO, annonceLabel } from "@/lib/utils";
import { haversineKm } from "@/lib/geo";

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("Authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (expected && auth !== expected) return false;
  return true;
}

async function runAlertes() {
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  const hierISO = hier.toISOString().slice(0, 10);

  const alertes = await prisma.alerte.findMany({
    where: { active: true },
    include: { club: { select: { email: true, nom: true } } },
    take: 200,
  });

  let sent = 0;
  let errors = 0;

  for (const alerte of alertes) {
    const where: Record<string, unknown> = {
      statut: "ouvert",
      date: { gte: todayISO() },
      createdAt: { gte: new Date(hierISO) },
    };
    if (alerte.categorie) {
      where.equipe = { ...(where.equipe as object), categorie: alerte.categorie };
    }
    if (alerte.ligue || alerte.district) {
      const clubFilter: Record<string, unknown> = {};
      if (alerte.ligue) clubFilter.ligue = alerte.ligue;
      if (alerte.district) clubFilter.district = alerte.district;
      where.equipe = { ...(where.equipe as object), club: clubFilter };
    }

    const annonces = await prisma.annonce.findMany({
      where,
      include: {
        equipe: true,
        club: { select: { id: true, nom: true, ville: true, latitude: true, longitude: true } },
      },
      orderBy: { date: "asc" },
      take: 50,
    });

    const filtered = annonces.filter((a) => {
      if (alerte.rayonKm == null || alerte.centreLat == null || alerte.centreLng == null) return true;
      return haversineKm(alerte.centreLat, alerte.centreLng, a.club.latitude, a.club.longitude) <= alerte.rayonKm;
    });

    if (filtered.length === 0) continue;

    const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
    try {
      await sendAlerteDigest({
        to: alerte.club.email,
        nom: alerte.club.nom,
        count: filtered.length,
        annonces: filtered.map((a) => ({
          label: `${annonceLabel({ categorie: a.equipe.categorie, date: a.date, heure: a.heure })} · ${a.club.nom}`,
          url: `${appUrl}/annonces/${a.id}`,
        })),
      });
      await prisma.alerte.update({
        where: { id: alerte.id },
        data: { lastSentAt: new Date() },
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return { sent, errors, checked: alertes.length };
}

async function runAvis() {
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
  const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");

  for (const a of annonces) {
    try {
      await sendNotationEmail({
        to: a.club.email,
        nom: a.club.nom,
        adversaireNom: a.adversaireNom ?? "votre adversaire",
        annonceLabel: annonceLabel({ categorie: a.equipe.categorie, date: a.date, heure: a.heure }),
        dashboardUrl: `${appUrl}/dashboard?noter=${a.id}`,
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

  return { sent, errors, checked: annonces.length };
}

async function runRappels() {
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

  let sent = 0;
  let errors = 0;
  const appUrl = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");

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

  return { sent, errors, checked: annonces.length };
}

// Cron unique regroupant alertes + notation + rappels.
// Nécessaire car le plan Vercel Hobby ne permet qu’1 exécution cron par jour.
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alertes = await runAlertes().catch((e) => ({ error: String(e), sent: 0, errors: 1, checked: 0 }));
  const avis = await runAvis().catch((e) => ({ error: String(e), sent: 0, errors: 1, checked: 0 }));
  const rappels = await runRappels().catch((e) => ({ error: String(e), sent: 0, errors: 1, checked: 0 }));

  return NextResponse.json({ ok: true, alertes, avis, rappels });
}
