import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function buildClubPassword() {
  return bcrypt.hash("club1234", 10);
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const CITIES: Record<string, { ville: string; cp: string; lat: number; lng: number }> = {
  lyon: { ville: "Lyon", cp: "69000", lat: 45.764, lng: 4.8357 },
  villeurbanne: { ville: "Villeurbanne", cp: "69100", lat: 45.7669, lng: 4.8819 },
  caluire: { ville: "Caluire-et-Cuire", cp: "69300", lat: 45.7676, lng: 4.8519 },
  venissieux: { ville: "Vénissieux", cp: "69200", lat: 45.7034, lng: 4.8989 },
  bron: { ville: "Bron", cp: "69500", lat: 45.7339, lng: 4.9121 },
};

interface ClubDef {
  nom: string;
  city: keyof typeof CITIES;
  tel: string;
  email: string;
  equipes: { categorie: string; niveau?: string }[];
}

const demoClubs: ClubDef[] = [
  {
    nom: "AS Lyon Foot",
    city: "lyon",
    tel: "0610203040",
    email: "contact@aslyonfoot.fr",
    equipes: [
      { categorie: "U14/U15", niveau: "Départemental" },
      { categorie: "Seniors", niveau: "Régional" },
    ],
  },
  {
    nom: "Villeurbanne FC",
    city: "villeurbanne",
    tel: "0611223344",
    email: "secretariat@villeurbannefc.fr",
    equipes: [
      { categorie: "U16/U17", niveau: "Départemental" },
      { categorie: "Seniors", niveau: "Départemental" },
    ],
  },
  {
    nom: "Caluire AS",
    city: "caluire",
    tel: "0622334455",
    email: "as@caluirefoot.fr",
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
    equipes: [{ categorie: "U10/U11", niveau: "Départemental" }],
  },
];

const captureClub: ClubDef = {
  nom: "Club de démonstration",
  city: "lyon",
  tel: "0600000001",
  email: "demo-club@matchs-amicaux.local",
  equipes: [
    { categorie: "Seniors", niveau: "Départemental" },
    { categorie: "U14/U15", niveau: "Départemental" },
  ],
};

const allClubs = [captureClub, ...demoClubs];

const annonceSpecs = [
  { clubIdx: 1, eqIdx: 0, date: day(3), heure: "14:00", dom: "domicile", stadeDispo: true, stadeNom: "Stade Dupraz", arbitre: true, niveau: "Départemental", note: "Terrain synthétique. Vestiaires dispo.", statut: "ouvert" },
  { clubIdx: 2, eqIdx: 0, date: day(2), heure: "10:30", dom: "domicile", stadeDispo: true, stadeNom: "Stade Louisville", arbitre: false, note: "Match matinal.", statut: "ouvert" },
  { clubIdx: 3, eqIdx: 0, date: day(10), heure: "15:00", dom: "domicile", stadeDispo: true, stadeNom: "Stade Balmont", arbitre: true, niveau: "Régional", note: "Club formateur. Niveau national requis.", statut: "ouvert" },
  { clubIdx: 4, eqIdx: 0, date: day(5), heure: "09:30", dom: "domicile", stadeDispo: false, arbitre: false, niveau: "Départemental", statut: "ouvert" },
];

async function main() {
  const clubPassword = await buildClubPassword();
  console.log("→ Création des clubs de démo…");
  const createdClubs: { id: string; equipes: string[] }[] = [];

  for (const def of allClubs) {
    const city = CITIES[def.city];
    const existing = await prisma.club.findUnique({ where: { email: def.email }, select: { id: true } });
    if (existing) {
      console.log(`   ${def.nom} existe déjà, ignoré.`);
      continue;
    }

    const club = await prisma.club.create({
      data: {
        nom: def.nom,
        ville: city.ville,
        codePostal: city.cp,
        latitude: city.lat,
        longitude: city.lng,
        telephone: def.tel,
        email: def.email,
        passwordHash: clubPassword,
        role: "club",
        statutVerification: "valide",
        ligue: "Auvergne-Rhône-Alpes",
        district: "Lyon-Rhône",
      },
    });

    const eqIds: string[] = [];
    for (const eq of def.equipes) {
      const created = await prisma.equipe.create({
        data: { clubId: club.id, categorie: eq.categorie, niveau: eq.niveau ?? null },
      });
      eqIds.push(created.id);
    }
    createdClubs.push({ id: club.id, equipes: eqIds });
  }

  console.log("→ Création des annonces de démo…");
  for (const a of annonceSpecs) {
    const club = createdClubs[a.clubIdx];
    if (!club) continue;
    const equipeId = club.equipes[a.eqIdx];
    if (!equipeId) continue;
    const existing = await prisma.annonce.findFirst({ where: { clubId: club.id, equipeId, date: a.date } });
    if (existing) continue;

    await prisma.annonce.create({
      data: {
        equipeId,
        clubId: club.id,
        date: a.date,
        heure: a.heure,
        domicileExterieur: a.dom,
        stadeDispo: a.stadeDispo,
        stadeNom: a.stadeDispo ? a.stadeNom ?? null : null,
        stadeVille: a.stadeDispo ? CITIES[allClubs[a.clubIdx].city].ville : null,
        arbitreDispo: a.arbitre,
        niveauSouhaite: a.niveau ?? null,
        note: a.note ?? null,
        statut: a.statut,
      },
    });
  }

  const counts = {
    clubs: await prisma.club.count(),
    equipes: await prisma.equipe.count(),
    annonces: await prisma.annonce.count(),
  };
  console.log("✅ Seed démo terminé :", counts);
  console.log("   Compte de capture : demo-club@matchs-amicaux.local / club1234");
  await prisma["$disconnect"]();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
