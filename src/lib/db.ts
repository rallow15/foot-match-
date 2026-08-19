import { PrismaClient } from "@prisma/client";

// Supabase (pooler transactionnel) ou Postgres direct : on s'assure que le pool
// local Prisma n'est pas bloqué à 1 connexion. En serverless, Prisma garde ce
// pool ouvert le temps de l'invocation ; 1 seule connexion crée un goulot
// d'étranglement total sous charge. On fixe donc un minimum raisonnable
// (défaut 9, overridable via PRISMA_CONNECTION_LIMIT).
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    const current = url.searchParams.get("connection_limit");
    if (!current) {
      const limit = process.env.PRISMA_CONNECTION_LIMIT ?? "9";
      url.searchParams.set("connection_limit", limit);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

// Singleton Prisma pour éviter d'épuiser les connexions en dev (hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = buildDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;