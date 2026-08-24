# Hébergement et capacité — Matchs Amicaux

## Architecture actuelle

- **Frontend / serverless** : Vercel Hobby (plan gratuit)
- **Base de données** : Supabase PostgreSQL
- **Storage** : Supabase Storage
- **Emails** : Brevo SMTP

## Limites Vercel Hobby

| Ressource | Limite |
|-----------|--------|
| Invocations de functions | 1 000 000 / mois |
| CPU active | 4 CPU-heures / mois |
| Mémoire provisionnée | 360 GB-heures / mois |
| Bande passante | 100 GB / mois |
| Usage | Non-commercial uniquement |

Source : [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)

## Limites Supabase (plan gratuit)

| Connexion | Limite |
|-----------|--------|
| Connexion directe (`db.xxx.supabase.co:5432`) | ~60 connexions simultanées |
| Pooler session (`xxx.pooler.supabase.com:5432`) | 15 connexions simultanées |
| Pooler transactionnel (`xxx.pooler.supabase.com:6543`) | ~200 connexions simultanées |

## Capacité estimée avec l’architecture actuelle

| Scénario | Utilisateurs simultanés |
|----------|-------------------------|
| Usage calme | ✅ OK |
| Navigation normale | ~50–100 |
| Peak régulier | ~80–150 (peut ralentir) |
| Pic viral / commercial | ⚠️ Risque de saturation |

## Optimisations en place

- Layout racine dynamique pour un header fiable côté serveur (pas de bug de connexion).
- Cache Next.js sur les données publiques (landing, détail annonce, profil club, matchs confirmés) : 5 minutes.
- `connection_limit` adapté selon l’URL Supabase.
- Pagination à 5 annonces par page sur `/annonces`.
- Requêtes Prisma optimisées (select explicites).
- Rate-limiting en base.

## Quand passer à Vercel Pro ?

Dès que :
- le trafic dépasse régulièrement ~100 visiteurs simultanés,
- les 4 CPU-heures / mois sont consommés avant la fin du mois,
- le site génère du revenu ou a une utilisation commerciale (obligatoire d’après les CGU Vercel).

**Vercel Pro** apporte : 10M d’invocations, 1000 GB-heures de mémoire, Fluid Compute, usage commercial autorisé.

## Migration vers Supabase pooler transactionnel (option future)

Le port `6543` offre ~200 connexions mais a posé des problèmes de compatibilité avec Prisma. À ne pas activer sans tests approfondis en preview.
