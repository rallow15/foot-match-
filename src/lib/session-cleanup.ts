// Nettoyage des sessions expirées — appelé opportunistement au login.
import { prisma } from "./db";

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}