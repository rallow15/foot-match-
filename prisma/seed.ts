import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

// Zone de lancement ciblée : métropole lyonnaise (cf. risque "cold start" du PRD).
interface CitySeed {
  ville: string;
  cp: string;
  lat: number;
  lng: number;
}
const CITIES: Record<string, CitySeed> = {
  lyon: { ville: "Lyon", cp: "69000", lat: 45.764, lng: 4.8357 },
  villeurbanne: { ville: "Villeurbanne", cp: "69100", lat: 45.7669, lng: 4.8819 },
  caluire: { ville: "Caluire-et-Cuire", cp: "69300", lat: 45.7676, lng: 4.8519 },
  venissieux: { ville: "Vénissieux", cp: "69200", lat: 45.7034, lng: 4.8989 },
  bron: { ville: "Bron", cp: "69500", lat: 45.7339, lng: 4.9121 },
  saintpriest: { ville: "Saint-Priest", cp: "69800", lat: 45.6981, lng: 4.9392 },
  oullins: { ville: "Oullins", cp: "69600", lat: 45.7173, lng: 4.8039 },
  decines: { ville: "Décines-Charpieu", cp: "69150", lat: 45.7693, lng: 4.9697 },
};

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // Garde anti-accident : le seed fait un deleteMany() sur toutes les tables
  // (clubs, équipes, annonces…). En production, l'exécuter par erreur détruirait
  // toutes les inscriptions réelles. On refuse donc en production sauf si
  // l'opérateur l'exprime explicitement via ALLOW_DESTRUCTIVE_SEED=1.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DESTRUCTIVE_SEED !== "1"
  ) {
    throw new Error(
      "Refus d'exécuter le seed en production (destructeur). Définir ALLOW_DESTRUCTIVE_SEED=1 pour forcer.",
    );
  }

  console.log("→ Nettoyage…");
  await prisma.contactLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.annonce.deleteMany();
  await prisma.equipe.deleteMany();
  await prisma.club.deleteMany();

  const clubPassword = await bcrypt.hash("club1234", 10);

  // Mot de passe admin : en production, ADMIN_PASSWORD est obligatoire (échec
  // explicite du seed sinon). En dev, s'il est absent on en génère un aléatoire
  // et on le logge une fois — on évite le mot de passe faible par défaut.
  const adminPwEnv = process.env.ADMIN_PASSWORD;
  let adminPw: string;
  if (adminPwEnv) {
    adminPw = adminPwEnv;
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_PASSWORD est requis en production (définissez-le dans l'environnement avant de seed).",
    );
  } else {
    adminPw = randomBytes(12).toString("base64");
    console.log("⚠️  ADMIN_PASSWORD non défini — mot de passe admin généré :", adminPw);
  }
  const adminPassword = await bcrypt.hash(adminPw, 10);

  // Admin (panneau de vérification des licences)
  const adminCity = CITIES.lyon;
  await prisma.club.create({
    data: {
      nom: "Administration",
      ville: adminCity.ville,
      codePostal: adminCity.cp,
      latitude: adminCity.lat,
      longitude: adminCity.lng,
      telephone: "0600000000",
      email: process.env.ADMIN_EMAIL ?? "admin@matchs-amicaux.local",
      passwordHash: adminPassword,
      role: "admin",
      statutVerification: "valide",
      ligue: "Auvergne-Rhône-Alpes",
      district: "Lyon-Rhône",
    },
  });

  // Licence de démo : on génère un PDF minimal et on l'uploade dans le bucket
  // privé "licences" (si Supabase est configuré) pour que l'admin puisse tester
  // le flux "Voir la licence". Sans Supabase, les clubs démo n'auront pas de
  // licence (null) — le seed continue de fonctionner.
  let demoLicenceUrl: string | null = null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const demoPdf = Buffer.from(
        "%PDF-1.1\n" +
          "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
          "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
          "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 320 120]>>endobj\n" +
          "trailer<</Root 1 0 R/Size 4>>\n" +
          "%%EOF",
      );
      const key = "demo-licence.pdf";
      await sb.storage.from("licences").upload(key, demoPdf, {
        contentType: "application/pdf",
        upsert: true,
      });
      demoLicenceUrl = `/api/uploads/${key}`;
      console.log("→ Licence de démo uploadée dans le bucket « licences ».");
    } catch (e) {
      console.warn("⚠️  Upload licence de démo échoué :", (e as Error).message);
    }
  } else {
    console.warn("⚠️  Supabase non configuré : clubs démo sans licence.");
  }

  interface ClubDef {
    nom: string;
    city: keyof typeof CITIES;
    tel: string;
    email: string;
    statut: "valide" | "en_attente" | "refuse";
    equipes: { categorie: string; niveau?: string }[];
  }

  const clubs: ClubDef[] = [
    {
      nom: "AS Lyon Foot",
      city: "lyon",
      tel: "0610203040",
      email: "contact@aslyonfoot.fr",
      statut: "valide",
      equipes: [
        { categorie: "U14/U15", niveau: "Départemental" },
        { categorie: "Seniors", niveau: "Régional" },
        { categorie: "U16/U17", niveau: "Régional" },
      ],
    },
    {
      nom: "Villeurbanne FC",
      city: "villeurbanne",
      tel: "0611223344",
      email: "secretariat@villeurbannefc.fr",
      statut: "valide",
      equipes: [
        { categorie: "U16/U17", niveau: "Départemental" },
        { categorie: "Seniors", niveau: "Départemental" },
        { categorie: "Vétérans/Loisirs" },
      ],
    },
    {
      nom: "Caluire AS",
      city: "caluire",
      tel: "0622334455",
      email: "as@caluirefoot.fr",
      statut: "valide",
      equipes: [
        { categorie: "U12/U13", niveau: "Départemental" },
        { categorie: "U18/U19", niveau: "Régional" },
      ],
    },
    {
      nom: "Vénissieux Sport",
      city: "venissieux",
      tel: "0633445566",
      email: "contact@venissieuxsport.fr",
      statut: "valide",
      equipes: [
        { categorie: "Seniors", niveau: "Régional" },
        { categorie: "U14/U15", niveau: "Régional" },
      ],
    },
    {
      nom: "Bron Olympique",
      city: "bron",
      tel: "0644556677",
      email: "bron.olympique@gmail.com",
      statut: "valide",
      equipes: [
        { categorie: "U10/U11", niveau: "Départemental" },
        { categorie: "U14/U15", niveau: "Départemental" },
      ],
    },
    {
      nom: "Saint-Priest Éveil",
      city: "saintpriest",
      tel: "0655667788",
      email: "evesaintpriest@foot.fr",
      statut: "valide",
      equipes: [
        { categorie: "Seniors", niveau: "Départemental" },
        { categorie: "Vétérans/Loisirs" },
      ],
    },
    {
      nom: "Oullins Pierres Dorées",
      city: "oullins",
      tel: "0666778899",
      email: "oullinsfoot@foot.fr",
      statut: "valide",
      equipes: [
        { categorie: "U16/U17", niveau: "National" },
        { categorie: "U18/U19", niveau: "National" },
      ],
    },
    {
      nom: "Décines Athletic",
      city: "decines",
      tel: "0677889900",
      email: "decines.athletic@foot.fr",
      statut: "valide",
      equipes: [
        { categorie: "U8/U9", niveau: "Départemental" },
        { categorie: "Seniors", niveau: "Départemental" },
      ],
    },
    {
      // En attente de vérification — apparaît dans le panneau admin.
      nom: "Rillieux EC",
      city: "lyon",
      tel: "0688990011",
      email: "rillieux.ec@foot.fr",
      statut: "en_attente",
      equipes: [{ categorie: "U14/U15", niveau: "Départemental" }],
    },
  ];

  const annonceSpecs: Array<{
    clubIdx: number;
    eqIdx: number;
    date: string;
    heure: string;
    dom: string;
    stadeDispo: boolean;
    stadeNom?: string;
    arbitre: boolean;
    niveau?: string;
    note?: string;
    statut: string;
  }> = [
    // 3 annonces de démo : clubs/catégories/niveaux variés.
    { clubIdx: 0, eqIdx: 0, date: day(3), heure: "14:00", dom: "domicile", stadeDispo: true, stadeNom: "Stade Dupraz", arbitre: true, niveau: "Départemental", note: "Terrain synthétique. Vestiaires dispo.", statut: "ouvert" },
    { clubIdx: 1, eqIdx: 0, date: day(2), heure: "10:30", dom: "domicile", stadeDispo: true, stadeNom: "Stade Louisville", arbitre: false, note: "Match matinal.", statut: "ouvert" },
    { clubIdx: 6, eqIdx: 0, date: day(10), heure: "15:00", dom: "domicile", stadeDispo: true, stadeNom: "Stade Balmont", arbitre: true, niveau: "National", note: "Club formateur. Niveau national requis.", statut: "ouvert" },
  ];

  for (const def of clubs) {
    const c = CITIES[def.city];
    const club = await prisma.club.create({
      data: {
        nom: def.nom,
        ville: c.ville,
        codePostal: c.cp,
        latitude: c.lat,
        longitude: c.lng,
        telephone: def.tel,
        email: def.email,
        passwordHash: clubPassword,
        role: "club",
        statutVerification: def.statut,
        ligue: "Auvergne-Rhône-Alpes",
        district: "Lyon-Rhône",
        licenceFichierUrl: demoLicenceUrl,
      },
    });

    const eqIds: string[] = [];
    for (const eq of def.equipes) {
      const created = await prisma.equipe.create({
        data: { clubId: club.id, categorie: eq.categorie, niveau: eq.niveau ?? null },
      });
      eqIds.push(created.id);
    }

    // annonces liées à ce club
    for (const a of annonceSpecs) {
      if (a.clubIdx !== clubs.indexOf(def)) continue;
      const equipeId = eqIds[a.eqIdx];
      if (!equipeId) continue;
      await prisma.annonce.create({
        data: {
          equipeId,
          clubId: club.id,
          date: a.date,
          heure: a.heure,
          domicileExterieur: a.dom,
          stadeDispo: a.stadeDispo,
          stadeNom: a.stadeNom ?? null,
          stadeVille: a.stadeDispo ? c.ville : null,
          arbitreDispo: a.arbitre,
          niveauSouhaite: a.niveau ?? null,
          note: a.note ?? null,
          statut: a.statut,
        },
      });
    }
  }

  const counts = {
    clubs: await prisma.club.count(),
    equipes: await prisma.equipe.count(),
    annonces: await prisma.annonce.count(),
  };
  console.log("→ Seed terminé :", counts);
  console.log('   Comptes club démo : mot de passe "club1234"');
  console.log("   Admin :", process.env.ADMIN_EMAIL ?? "admin@matchs-amicaux.local", "/ mot de passe admin de .env");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });