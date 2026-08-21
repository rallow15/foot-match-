import { PrismaClient } from "@prisma/client";

// Supabase (pooler transactionnel) ou Postgres direct : on s'assure que le pool
// local Prisma n'est pas bloque a 1 connexion. En serverless, Prisma garde ce
// pool ouvert le temps de l'invocation ; 1 seule connexion cree un goulot
// d'etranglement total sous charge. On fixe donc un minimum raisonnable
// (defaut 9, overridable via PRISMA_CONNECTION_LIMIT).
// En dev local SQLite, on ne touche pas a l'URL (pas de connection_limit).
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  if (raw.startsWith("file:")) return raw;
  try {
    const url = new URL(raw);
    const current = url.searchParams.get("connection_limit");
    if (!current) {
      const limit = process.env.PRISMA_CONNECTION_LIMIT ?? "25";
      url.searchParams.set("connection_limit", limit);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

// Singleton Prisma pour eviter d'epuiser les connexions en dev (hot reload).
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
