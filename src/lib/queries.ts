import { prisma } from "./db";
import { haversineKm } from "./geo";
import { todayISO } from "./utils";

export interface SearchParams {
  categorie?: string;
  dateFrom?: string;
  dateTo?: string;
  niveau?: string;
  dom?: string;
  stade?: string; // "1" => only stade dispo
  arbitre?: string; // "1" => only arbitre dispo
  ligue?: string;
  district?: string;
  ville?: string;
  latitude?: string;
  longitude?: string;
  rayon?: string; // km
}

export type AnnonceWithRelations = Awaited<ReturnType<typeof fetchAnnonceById>>;

export async function fetchAnnonceById(id: string) {
  return prisma.annonce.findUnique({
    where: { id },
    include: { equipe: { include: { club: true } }, club: true, contacts: true },
  });
}

export async function searchAnnonces(params: SearchParams) {
  const where: Record<string, unknown> = {
    statut: "ouvert",
    // auto-expiration : on ne montre que les dates à venir (cf. risque "annonces fantômes")
    date: { gte: todayISO() },
  };

  if (params.categorie) {
    where.equipe = { categorie: params.categorie };
  }
  if (params.niveau) {
    where.equipe = { ...(where.equipe as object), niveau: params.niveau };
  }
  // Filtre Ligue / District (sous-ligue) — la recherche se fait sur le club annonceur.
  if (params.ligue || params.district) {
    const clubFilter: Record<string, unknown> = {};
    if (params.ligue) clubFilter.ligue = params.ligue;
    if (params.district) clubFilter.district = params.district;
    where.equipe = { ...(where.equipe as object), club: clubFilter };
  }
  if (params.dateFrom || params.dateTo) {
    where.date = {
      gte: params.dateFrom || todayISO(),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }
  if (params.dom && params.dom !== "indifferent") {
    where.OR = [
      { domicileExterieur: params.dom },
      { domicileExterieur: "indifferent" },
    ];
  }
  if (params.stade === "1") where.stadeDispo = true;
  if (params.arbitre === "1") where.arbitreDispo = true;

  const rows = await prisma.annonce.findMany({
    where,
    include: { equipe: { include: { club: true } }, club: true },
    orderBy: { date: "asc" },
  });

  // Filtrage géographique (rayon) — calculé en TS après fetch (SQLite sans PostGIS).
  let filtered = rows;
  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const rayon = parseFloat(params.rayon ?? "");
  if (!Number.isNaN(lat) && !Number.isNaN(lng) && !Number.isNaN(rayon) && rayon > 0) {
    filtered = rows.filter(
      (a) => haversineKm(lat, lng, a.club.latitude, a.club.longitude) <= rayon,
    );
  }

  // Tri final par date la plus proche
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
  return filtered;
}

export async function fetchMyAnnonces(clubId: string) {
  return prisma.annonce.findMany({
    where: { clubId },
    include: { equipe: true },
    orderBy: { date: "asc" },
  });
}

export async function fetchMyEquipes(clubId: string) {
  return prisma.equipe.findMany({
    where: { clubId },
    orderBy: { categorie: "asc" },
  });
}

export async function fetchPendingClubs() {
  return prisma.club.findMany({
    where: { role: "club", statutVerification: "en_attente" },
    orderBy: { createdAt: "asc" },
  });
}

// Profil public d'un club : infos + équipes + annonces ouvertes à venir.
// Aucune coordonnée privée (tél/email) n'est remontée via ce helper — elles
// ne s'obtiennent que par la mise en relation (contacterAction).
export async function fetchClubProfile(id: string) {
  return prisma.club.findUnique({
    where: { id },
    include: {
      equipes: { orderBy: { categorie: "asc" } },
      annonces: {
        where: { statut: "ouvert", date: { gte: todayISO() } },
        include: { equipe: true },
        orderBy: { date: "asc" },
      },
    },
  });
}

// Conversations du club (demandeur ou destinataire) triées par dernier message.
// Chaque conversation = un ContactLog lié à une annonce.
export async function fetchConversations(clubId: string) {
  return prisma.contactLog.findMany({
    where: {
      OR: [{ demandeurClubId: clubId }, { destinataireId: clubId }],
    },
    include: {
      annonce: { include: { equipe: true } },
      demandeur: { select: { id: true, nom: true, logoUrl: true } },
      destinataire: { select: { id: true, nom: true, logoUrl: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Nombre de conversations avec des messages non lus par le club.
export async function countUnreadConversations(clubId: string): Promise<number> {
  const conversations = await prisma.contactLog.findMany({
    where: {
      OR: [{ demandeurClubId: clubId }, { destinataireId: clubId }],
    },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let count = 0;
  for (const c of conversations) {
    const lastMessage = c.messages[0];
    if (!lastMessage) continue;
    if (lastMessage.auteurClubId === clubId) continue;
    const readAt = c.demandeurClubId === clubId ? c.demandeurReadAt : c.destinataireReadAt;
    if (!readAt || lastMessage.createdAt > readAt) count++;
  }
  return count;
}

// Récupère une conversation si le club en est membre.
export async function fetchConversation(contactLogId: string, clubId: string) {
  return prisma.contactLog.findFirst({
    where: {
      id: contactLogId,
      OR: [{ demandeurClubId: clubId }, { destinataireId: clubId }],
    },
    include: {
      annonce: { include: { equipe: true, club: { select: { id: true, nom: true } } } },
      demandeur: { select: { id: true, nom: true, logoUrl: true } },
      destinataire: { select: { id: true, nom: true, logoUrl: true } },
      messages: { include: { auteur: { select: { id: true, nom: true, logoUrl: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}