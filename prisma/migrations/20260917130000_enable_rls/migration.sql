-- Enable Row Level Security on all application tables.
-- The Next.js app connects through Prisma with the postgres role (table owner),
-- which bypasses RLS by default, so this change does not affect application behavior.
-- It prevents unauthorized access through Supabase PostgREST / anon key.

ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Equipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Annonce" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favori" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signalement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Avis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alerte" ENABLE ROW LEVEL SECURITY;
