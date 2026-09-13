import { prisma } from "../src/lib/db";

async function main() {
  const c = await prisma.club.findUnique({
    where: { email: "contact@aslyonfoot.fr" },
    select: { id: true, nom: true, role: true, statutVerification: true, passwordHash: true },
  });
  console.log(c ? "TROUVÉ" : "NON TROUVÉ", c);
  await prisma["$disconnect"]();
}

main();
