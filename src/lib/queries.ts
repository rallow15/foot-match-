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
  departement?: string;
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
  departement: true,
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

// Cache long pour les données publiques peu changeantes : landing, détail,
// profil, matchs confirmés. Les mutations invalident via les tags.
const PUBLIC_CACHE_REVALIDATE = 300; // 5 min

export const fetchAnnonceByIdCached = unstable_cache(fetchAnnonceById, ["annonce-by-id"], {
  revalidate: PUBLIC_CACHE_REVALIDATE,
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
  if (params.departement) clubFilter.departement = params.departement;

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
  revalidate: PUBLIC_CACHE_REVALIDATE,
  tags: ["annonces", "landing"],
});

// Annonces par défaut pour la page /annonces quand aucun filtre n'est actif :
// les prochains matchs ouverts, triés par date croissante. Utilise le cache serveur
// partagé pour ne pas charger la DB à chaque visiteur.
const DEFAULT_ANNONCES_LIMIT = 15;

async function _fetchDefaultAnnoncesImpl() {
  return prisma.annonce.findMany({
    where: { statut: "ouvert", date: { gte: todayISO() } },
    include: { equipe: { include: { club: { select: PUBLIC_CLUB_SELECT } } }, club: { select: PUBLIC_CLUB_SELECT } },
    orderBy: [{ date: "asc" }, { heure: "asc" }],
    take: DEFAULT_ANNONCES_LIMIT,
  });
}

export const fetchDefaultAnnonces = unstable_cache(_fetchDefaultAnnoncesImpl, ["annonces-default"], {
  revalidate: 60,
  tags: ["annonces"],
});

// Compteurs de preuve sociale pour la landing page. Cache long pour limiter la
// charge : un seul visiteur sur 5 minutes déclenche le count().
function debutEtFinMoisCourant() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const debut = `${y}-${String(m).padStart(2, "0")}-01`;
  const fin = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
  return { debut, fin };
}

async function _fetchLandingStatsImpl() {
  const { debut, fin } = debutEtFinMoisCourant();
  const [clubsValides, annoncesOuvertes, matchsConfirmesMois] = await Promise.all([
    prisma.club.count({ where: { role: "club", statutVerification: "valide" } }),
    prisma.annonce.count({ where: { statut: "ouvert", date: { gte: todayISO() } } }),
    prisma.annonce.count({
      where: {
        statut: "confirme",
        date: { gte: debut, lte: fin },
      },
    }),
  ]);
  return { clubsValides, annoncesOuvertes, matchsConfirmesMois };
}

export const fetchLandingStats = unstable_cache(_fetchLandingStatsImpl, ["landing-stats"], {
  revalidate: PUBLIC_CACHE_REVALIDATE,
  tags: ["annonces", "clubs", "matchs-confirmes"],
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
          departement: true,
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
  revalidate: PUBLIC_CACHE_REVALIDATE,
  tags: ["matchs-confirmes", "annonces"],
});

const DASHBOARD_ANNONCE_SELECT = {
  id: true,
  date: true,
  heure: true,
  domicileExterieur: true,
  stadeDispo: true,
  stadeNom: true,
  stadeVille: true,
  arbitreDispo: true,
  niveauSouhaite: true,
  note: true,
  statut: true,
  adversaireNom: true,
  equipe: { select: { id: true, categorie: true, niveau: true } },
} as const;

export async function fetchMyAnnonces(clubId: string, limit = DEFAULT_DASHBOARD_LIMIT) {
  return prisma.annonce.findMany({
    where: { clubId },
    select: DASHBOARD_ANNONCE_SELECT,
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function fetchMyEquipes(clubId: string) {
  return prisma.equipe.findMany({
    where: { clubId },
    select: { id: true, categorie: true, niveau: true },
    orderBy: { categorie: "asc" },
  });
}

// Favoris d'un club avec les données de cible (annonces ouvertes à venir + clubs validés).
// Pas de cache : la donnée change au clic et est privée au club.
async function _fetchSimilarAnnoncesImpl(annonceId: string, categorie: string, limit = 3) {
  return prisma.annonce.findMany({
    where: {
      id: { not: annonceId },
      statut: "ouvert",
      date: { gte: todayISO() },
      equipe: { categorie },
    },
    include: { equipe: { include: { club: { select: PUBLIC_CLUB_SELECT } } }, club: { select: PUBLIC_CLUB_SELECT } },
    orderBy: { date: "asc" },
    take: limit,
  });
}

export const fetchSimilarAnnonces = unstable_cache(
  (annonceId: string, categorie: string, limit?: number) => _fetchSimilarAnnoncesImpl(annonceId, categorie, limit),
  ["similar-annonces"],
  { revalidate: 60, tags: ["annonces"] },
);

export async function fetchAvisForClub(clubId: string) {
  return prisma.avis.findMany({
    where: { cibleClubId: clubId },
    select: { note: true, commentaire: true, createdAt: true, auteurClub: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function fetchMyFavorisWithTargets(clubId: string) {
  const favoris = await prisma.favori.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
  });

  const annonceIds = favoris.filter((f) => f.type === "annonce").map((f) => f.cibleId);
  const clubIds = favoris.filter((f) => f.type === "club").map((f) => f.cibleId);

  const [annonces, clubs] = await Promise.all([
    prisma.annonce.findMany({
      where: { id: { in: annonceIds }, statut: "ouvert", date: { gte: todayISO() } },
      include: { equipe: { include: { club: { select: PUBLIC_CLUB_SELECT } } }, club: { select: PUBLIC_CLUB_SELECT } },
      orderBy: { date: "asc" },
    }),
    prisma.club.findMany({
      where: { id: { in: clubIds }, role: "club", statutVerification: "valide" },
      select: CLUB_SEARCH_SELECT,
      orderBy: { nom: "asc" },
    }),
  ]);

  const annoncesById = new Map(annonces.map((a) => [a.id, a]));
  const clubsById = new Map(clubs.map((c) => [c.id, c]));

  return {
    annonces: annonceIds
      .map((id) => annoncesById.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a)),
    clubs: clubIds
      .map((id) => clubsById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c)),
  };
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
      departement: true,
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
      departement: true,
      ligue: true,
      logoUrl: true,
      role: true,
      statutVerification: true,
      description: true,
      siteWeb: true,
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
  revalidate: PUBLIC_CACHE_REVALIDATE,
  tags: ["clubs"],
});

// Profil public allégé d'un club (résultat de recherche).
const CLUB_SEARCH_SELECT = {
  id: true,
  nom: true,
  ville: true,
  codePostal: true,
  district: true,
  departement: true,
  ligue: true,
  logoUrl: true,
  latitude: true,
  longitude: true,
  equipes: {
    select: { categorie: true, niveau: true },
    orderBy: { categorie: "asc" },
  },
} as const;

export interface ClubSearchParams {
  categorie?: string;
  niveau?: string;
  ligue?: string;
  district?: string;
  departement?: string;
  ville?: string;
  latitude?: string;
  longitude?: string;
  rayon?: string;
  excludeClubId?: string;
  page?: string;
}

export type ClubSearchResult = Awaited<ReturnType<typeof searchClubs>>;

const CLUB_SEARCH_LIMIT = 12;

async function _searchClubsImpl(params: ClubSearchParams) {
  // Base : clubs validés, rôle club (pas admin, pas refusé).
  const where: Record<string, unknown> = {
    role: "club",
    statutVerification: "valide",
  };

  if (params.ligue) where.ligue = params.ligue;
  if (params.district) where.district = params.district;
  if (params.departement) where.departement = params.departement;
  if (params.excludeClubId) where.id = { not: params.excludeClubId };

  // Filtre géographique (bounding-box approximative).
  const lat = parseFloat(params.latitude ?? "");
  const lng = parseFloat(params.longitude ?? "");
  const rayon = parseFloat(params.rayon ?? "");
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng) && !Number.isNaN(rayon) && rayon > 0;
  if (hasGeo) {
    const delta = rayon / 111; // ~111 km par degré
    where.latitude = { gte: lat - delta, lte: lat + delta };
    where.longitude = { gte: lng - delta, lte: lng + delta };
  }

  // Filtre équipe : catégorie obligatoire, niveau optionnel.
  const equipeFilter: Record<string, unknown> = {};
  if (params.categorie) equipeFilter.categorie = params.categorie;
  if (params.niveau) equipeFilter.niveau = params.niveau;
  if (Object.keys(equipeFilter).length > 0) {
    where.equipes = { some: equipeFilter };
  }

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * CLUB_SEARCH_LIMIT;

  const [total, rows] = await Promise.all([
    prisma.club.count({ where }),
    prisma.club.findMany({
      where,
      select: CLUB_SEARCH_SELECT,
      orderBy: { nom: "asc" },
      skip,
      take: CLUB_SEARCH_LIMIT,
    }),
  ]);

  // Filtre haversine précis sur le sous-ensemble.
  let clubs = rows;
  if (hasGeo) {
    clubs = rows.filter((c) => haversineKm(lat, lng, c.latitude, c.longitude) <= rayon);
  }

  return { clubs, total };
}

export const searchClubs = unstable_cache(
  (params: ClubSearchParams) => _searchClubsImpl(params),
  ["search-clubs"],
  {
    revalidate: 60,
    tags: ["clubs"],
  },
);
