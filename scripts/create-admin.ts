import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@matchs-amicaux.local";
  const passwordRaw = process.env.ADMIN_PASSWORD ?? "admin1234";

  const passwordHash = await bcrypt.hash(passwordRaw, 10);

  const existing = await prisma.club.findUnique({ where: { email } });
  if (existing) {
    await prisma.club.update({
      where: { email },
      data: {
        role: "admin",
        statutVerification: "valide",
        passwordHash,
      },
    });
    console.log(`✅ Compte admin mis à jour : ${email}`);
  } else {
    await prisma.club.create({
      data: {
        nom: "Administration",
        ville: "Lyon",
        codePostal: "69000",
        latitude: 45.764,
        longitude: 4.8357,
        telephone: "0600000000",
        email,
        passwordHash,
        role: "admin",
        statutVerification: "valide",
        ligue: "Auvergne-Rhône-Alpes",
        district: "Lyon-Rhône",
      },
    });
    console.log(`✅ Compte admin créé : ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
