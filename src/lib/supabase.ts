// Client Supabase côté serveur uniquement.
// Utilise la clé service_role (CONFIDENTIELLE — jamais exposée au navigateur) :
// elle contourne les RLS et permet les uploads ainsi que la lecture des
// licences privées. Initialisation paresseuse pour ne pas casser le build
// quand les variables d'environnement ne sont pas définies.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase non configuré : définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env",
    );
  }
  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// Buckets Storage :
//  - logos    : PUBLIC  -> URL publique stockée dans club.logoUrl (servie par le CDN Supabase)
//  - licences : PRIVÉ   -> servi uniquement via /api/uploads/<name> après authz (admin/propriétaire)
export const BUCKETS = {
  logo: { name: "logos", public: true },
  licence: { name: "licences", public: false },
} as const;

export type UploadPrefix = keyof typeof BUCKETS;