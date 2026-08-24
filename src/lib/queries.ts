import { unstable_cache } from "next/cache";
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
  excludeClubId?: string; // exclut les annonces publiées par ce club (ex: club connecté)
  page?: string;
}

export type AnnonceWithRelations = Awaited<ReturnType<typeof fetchAnnonceById>>;

export interface SearchResult {
  annonces: AnnonceWithRelations[];
  total: number;
}

const PUBLIC_CLUB_SELECT = {
  id: true,
  nom: true,
  ville: true,
  codePostal: true,
  district: true,
  ligue: true,
  logoUrl: true,
  statutVerification: true,
  latitude: true,
  longitude: true,
} as const;

export async function fetchAnnonceById(id: string) {
  return prisma.annonce.findUnique({
    where: { id },
    include: {
      equipe: { include: { club: { select: PUBLIC_CLUB_SELECT } } },
      club: { select: PUBLIC_CLUB_SELECT },
    },
  });
}

export const fetchAnnonceByIdCached = unstable_cache(fetchAnnonceById, ["annonce-by-id"], {
  revalidate: 60,
  tags: ["annonces"],
});

const DEFAULT_PAGE_LIMIT = 48;
const DEFAULT_DASHBOARD_LIMIT = 100;

const SEARCH_PAGE_LIMIT = 5;

async function _searchAnnoncesImpl(params: SearchParams) {
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
  const clubFilter: Record<string, unknown> = {};
  if (params.ligue) clubFilter.ligue = params.ligue;
  if (params.district) clubFilter.district = params.district;

  // Bounding-box approximative avant le filtre haversine pour reduire le volume DB.
  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const rayon = parseFloat(params.rayon ?? "");
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng) && !Number.isNaN(rayon) && rayon > 0;
  if (hasGeo) {
    const delta = rayon / 111; // ~111 km par degre
    clubFilter.latitude = { gte: lat - delta, lte: lat + delta };
    clubFilter.longitude = { gte: lng - delta, lte: lng + delta };
  }

  if (Object.keys(clubFilter).length > 0) {
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
  if (params.excludeClubId) where.clubId = { not: params.excludeClubId };

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * SEARCH_PAGE_LIMIT;

  const [total, rows] = await Promise.all([
    prisma.annonce.count({ where }),
    prisma.annonce.findMany({
      where,
      include: { equipe: { include: { club: { select: PUBLIC_CLUB_SELECT } } }, club: { select: PUBLIC_CLUB_SELECT } },
      orderBy: { date: "asc" },
      skip,
      take: SEARCH_PAGE_LIMIT,
    }),
  ]);

  // Filtrage géographique (rayon) — calculé en TS après fetch sur le sous-ensemble bounding-box.
  let filtered = rows;
  if (hasGeo) {
    filtered = rows.filter(
      (a) => haversineKm(lat, lng, a.club.latitude, a.club.longitude) <= rayon,
    );
  }

  // Tri final par date la plus proche
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
  return { annonces: filtered, total };
}

export const searchAnnonces = unstable_cache(
  (params: SearchParams) => _searchAnnoncesImpl(params),
  ["search-annonces"],
  {
    revalidate: 60,
    tags: ["annonces"],
  },
);

// Quelques annonces récentes pour la landing page (teaser).
async function _fetchAnnoncesLandingImpl(limit = 3) {
  return prisma.annonce.findMany({
    where: { statut: "ouvert", date: { gte: todayISO() } },
    include: { equipe: true, club: { select: { id: true, nom: true, ville: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export const fetchAnnoncesLanding = unstable_cache(_fetchAnnoncesLandingImpl, ["annonces-landing"], {
  revalidate: 60,
  tags: ["annonces", "landing"],
});

// Matchs confirmés pour la page publique (avec filtres ligue/district).
async function _fetchMatchsConfirmesImpl(ligue: string, district: string) {
  const where: Record<string, unknown> = {
    statut: "confirme",
    // auto-expiration : un match confirmé passé ne reste pas affiché indéfiniment
    date: { gte: todayISO() },
  };
  if (ligue || district) {
    const clubFilter: Record<string, unknown> = {};
    if (ligue) clubFilter.ligue = ligue;
    if (district) clubFilter.district = district;
    where.club = clubFilter;
  }

  return prisma.annonce.findMany({
    where,
    include: {
      equipe: true,
      club: {
        select: {
          id: true,
          nom: true,
          ville: true,
          district: true,
          ligue: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export const fetchMatchsConfirmes = unstable_cache(_fetchMatchsConfirmesImpl, ["matchs-confirmes"], {
  revalidate: 60,
  tags: ["matchs-confirmes", "annonces"],
});

export async function fetchMyAnnonces(clubId: string, limit = DEFAULT_DASHBOARD_LIMIT) {
  return prisma.annonce.findMany({
    where: { clubId },
    include: { equipe: true },
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function fetchMyEquipes(clubId: string) {
  return prisma.equipe.findMany({
    where: { clubId },
    orderBy: { categorie: "asc" },
  });
}

export async function fetchPendingClubs(limit = DEFAULT_PAGE_LIMIT, skip = 0) {
  return prisma.club.findMany({
    where: { role: "club", statutVerification: "en_attente" },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip,
    select: {
      id: true,
      nom: true,
      ville: true,
      codePostal: true,
      district: true,
      ligue: true,
      telephone: true,
      email: true,
      logoUrl: true,
      licenceFichierUrl: true,
      statutVerification: true,
      refusMotif: true,
      createdAt: true,
    },
  });
}

// Profil public d'un club : infos + equipes + annonces ouvertes a venir.
// Aucune coordonnee privee (tél/email) n'est remontee via ce helper.
export async function fetchClubProfile(id: string) {
  return prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      ville: true,
      codePostal: true,
      district: true,
      ligue: true,
      logoUrl: true,
      role: true,
      statutVerification: true,
      createdAt: true,
      equipes: { orderBy: { categorie: "asc" }, take: DEFAULT_DASHBOARD_LIMIT },
      annonces: {
        where: { statut: "ouvert", date: { gte: todayISO() } },
        include: { equipe: true },
        orderBy: { date: "asc" },
        take: DEFAULT_DASHBOARD_LIMIT,
      },
    },
  });
}

export const fetchClubProfileCached = unstable_cache(fetchClubProfile, ["club-profile"], {
  revalidate: 60,
  tags: ["clubs"],
});
