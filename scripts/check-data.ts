import { prisma } from "../src/lib/db";

async function main() {
  const counts = await prisma["$queryRaw"]`SELECT
    (SELECT count(*) FROM "Club") as clubs,
    (SELECT count(*) FROM "Annonce") as annonces,
    (SELECT count(*) FROM "Equipe") as equipes`;
  console.log(counts);
  await prisma["$disconnect"]();
}

main();
