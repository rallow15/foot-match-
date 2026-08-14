# Mise en ligne — Vercel + Supabase (gratuit)

Déploiement de « Matchs Amicaux » sur **Vercel** (app) + **Supabase** (Postgres
+ stockage des logos/licences). 100% gratuit pour démarrer.

Architecture :

```
ton PC ──git push──► GitHub ──déclenche──► Vercel (build + hébergement)
                                              └──► Supabase Postgres (base)
                                                   Supabase Storage (logos public + licences privé)
```

> Le dossier n'est pas un dépôt git : étape 0 = le devenir.

---

## 0. Versionner le projet (depuis ton PC)

```bash
git init
git add -A
git commit -m "Projet Matchs Amicaux prêt pour déploiement"
# Créer un dépôt privé sur GitHub, puis :
git remote add origin git@github.com:TON-PSEUDO/foot.git
git branch -M main
git push -u origin main
```

Vérifier que `.env`, `prisma/dev.db`, `data/` sont bien ignorés (cf. `.gitignore`).

## 1. Supabase — base + stockage

1. Créer un projet (gratuit) sur https://supabase.com.
2. **Base** : Project Settings → Database → "Connect" → copier la
   **Direct connection** (port 5432) → c'est `DATABASE_URL`.
3. **Storage** : créer **2 buckets** :
   - `logos` → **Public** (logos de clubs, servis par le CDN).
   - `licences` → **Private** (licences, accessibles uniquement via l'API authentifiée).
4. **Clés** : Project Settings → API → copier :
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (confidentiel, serveur seulement).

## 2. Configurer `.env` (local, pour tester avant déploiement)

```bash
cp .env.example .env
# remplir : DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#           ADMIN_EMAIL, ADMIN_PASSWORD, APP_URL (+ SMTP optionnel)
```

## 3. Créer le schéma + seed (local, contre Supabase)

```bash
npx prisma generate      # client Prisma (provider postgresql)
npx prisma db push        # crée les tables dans le Postgres Supabase
npm run seed              # clubs/équipes/annonces de démo + admin + licence démo
```

Le seed uploade aussi une licence de démo dans le bucket `licences`.

## 4. Vérifier en local

```bash
npm run dev    # http://localhost:3000
# tester : inscription (upload licence), logo (dashboard/profil), "Voir la licence" (admin)
npm run build  # doit passer sans erreur
```

## 5. Déployer sur Vercel

1. https://vercel.com → "Add New Project" → importer le dépôt GitHub.
2. **Environment Variables** (Project Settings → Environment Variables) — coller
   exactement les mêmes que `.env` :
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_URL` (l'URL Vercel, ex. https://foot.vercel.app)
   - `NODE_ENV=production`
   - `SMTP_*` (optionnel)
3. Vercel détecte Next.js, build automatique → une URL de production.
4. Pour la **première mise en ligne**, exécuter le seed sur la base de prod :

   Soit en local avec `DATABASE_URL` pointant vers Supabase (déjà fait à l'étape 3,
   la base est partagée) — soit via Vercel CLI :
   ```bash
   npm i -g vercel
   vercel link            # lier le projet local au projet Vercel
   vercel env pull .env   # récupérer les variables de prod en local
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

## 6. Domaine personnalisé (optionnel)

Vercel > Project Settings > Domains > ajouter ton domaine, puis pointer un
enregistrement CNAME/A chez ton registrar. HTTPS est automatique. Mettre à jour
`APP_URL` en conséquence.

---

## Mises à jour

```bash
git push          # Vercel rebuild + redéploie automatiquement
```

Pour un changement de schéma Prisma :
```bash
npx prisma db push   # appliquer le nouveau schéma à la base Supabase
```

## Sécurité — rappels importants

- `SUPABASE_SERVICE_ROLE_KEY` contourne les RLS : **jamais** côté client, uniquement serveur.
- Bucket `licences` doit rester **privé** : les licences ne sont servies que via
  `/api/uploads/<name>` après authentification + autorisation (admin ou propriétaire).
- Bucket `logos` est **public** (logos affichés publiquement sur le site).
- `ADMIN_PASSWORD` obligatoire en production.

## Limites des offres gratuites (à surveiller)

- Vercel Hobby : 100 Go de bande passante/mois (la vidéo de fond `bg.mp4` est
  gourmande — voir `public/videos/README.md`). Usage « non commercial » selon les
  CGU : passer en Pro (20 $/mois) si le projet devient commercial.
- Supabase free : 500 Mo de base, 1 Go de stockage, projet mis en pause après
  7 jours d'inactivité (relancé à la première requête, sans perte de données).

## Chemin alternatif : VPS persistant

Si tu préfères un VPS (SQLite + fichiers sur disque, sans migration de code),
les fichiers `ecosystem.config.cjs` (PM2) et `Caddyfile.example` (reverse proxy
HTTPS) sont fournis. Dans ce cas, remettre `provider = "sqlite"` dans
`prisma/schema.prisma` et `DATABASE_URL="file:./data/prod.db"`.