# Matchs Amicaux — plateforme de matchmaking de matchs amicaux entre clubs amateurs

Plateforme où un club **propose** un match amical, **cherche** parmi les annonces publiées
(filtrées par catégorie, date, distance), et **prend contact** directement avec le club en face.
Pas de gestion de résultats, pas de compétition — juste de la mise en relation.

> MVP livré conformément au PRD. Rendu inspiré de fifa.com (fond sombre, typographie
> condensée majuscules, accent vert pour les CTA).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript + React 19
- **Tailwind CSS v4** (thème custom FIFA-inspired dans `src/app/globals.css`)
- **Prisma 6 + SQLite** (base locale out-of-the-box ; cible prod : Postgres/Supabase)
- **Auth maison** : email/mot de passe (bcrypt) + cookie de session httpOnly
- **OAuth** : connexion/inscription via **Google** (Apple peut être ajouté plus tard)
- **Géoloc** : API officielle `api-adresse.data.gouv.fr` (autocomplete + lat/lng) + distance haversine
- **Email** : `nodemailer` (si `SMTP_HOST` renseigné, sinon fallback console)

## Démarrage rapide

```bash
npm install
npx prisma db push        # crée le schéma SQLite
npm run seed              # données de démo (clubs, équipes, annonces)
npm run dev               # http://localhost:3000
```

> ⚠️ Le port 3000 était déjà pris sur la machine de dev ; l'app a été lancée sur **3001**.
> Pour forcer un port : `npx next dev -p 3001`.

### Comptes de démo (créés par le seed)

- **Club validé** : `contact@aslyonfoot.fr` / `club1234` (ainsi que tous les autres clubs démo)
- **Admin** (panneau de validation des licences) : `admin@matchs-amicaux.local` / mot de passe = `ADMIN_PASSWORD` du `.env` (`admin1234` par défaut)
- Un club **en attente** de vérification (`Rillieux EC`) apparaît dans le panneau admin.

## Fonctionnalités MVP

- ✅ Inscription club avec upload de licence (PDF/image) → contrôle manuel (statut en_attente / valide / refuse)
- ✅ Gestion des équipes (catégorie + niveau) sous un même club
- ✅ Création / édition / suppression d'annonce, marquage « Pourvu » / « Annulé »
- ✅ Recherche avec filtres : catégorie, niveau, plage de dates, domicile/extérieur, stade dispo, arbitre dispo, **ville + rayon km**
- ✅ Auto-expiration : les dates passées n'apparaissent pas (lutte contre les annonces fantômes)
- ✅ Mise en contact : bouton « Contacter le club » → notifie le club annonceur (email) **et** révèle ses coordonnées (téléphone/email/WhatsApp) au demandeur
- ✅ Espace club (dashboard) : annonces actives/passées, équipes, statut de vérification
- ✅ Panneau admin de vérification des licences

## Structure

```
prisma/
  schema.prisma        # Club, Equipe, Annonce, Session, ContactLog
  seed.ts              # données de démo (zone : métropole lyonnaise)
src/
  app/
    page.tsx           # accueil : hero + recherche + liste d'annonces
    actions.ts         # tous les Server Actions (auth, équipes, annonces, contact, admin)
    login/ inscription/ dashboard/ admin/ annonces/[id]/ comment-ca-marche/
  components/          # Header, Footer, AnnonceCard, Badges, VilleAutocomplete, forms…
  lib/
    db.ts auth.ts geo.ts mail.ts referential.ts queries.ts utils.ts
```

## Référentiel (figé)

Catégories Jeunes : U6/U7 → U18/U19 · Adultes : Seniors, Vétérans/Loisirs.
Niveaux : Jeunes = Départemental/Régional/National · Seniors = Régional/Départemental.
(`src/lib/referential.ts`)

## Configuration email (optionnel)

Renseigner dans `.env` : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
Sans SMTP, les notifications de contact sont **loggées dans la console serveur**.

## Configuration OAuth Google (optionnel)

1. Créer des identifiants OAuth 2.0 sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Ajouter l'URI de redirection autorisée : `${APP_URL}/api/auth/google/callback`.
3. Renseigner dans `.env` :
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `OAUTH_COOKIE_SECRET` (générer avec `openssl rand -base64 32`)

Sans configuration OAuth, le site continue de fonctionner avec email/mot de passe uniquement.

## Notes / limites MVP

- Vérification des licences **manuelle** (panneau admin) — charge humaine au lancement (cf. risques PRD).
- Zone de lancement ciblée : la seed couvre la métropole lyonnaise (cold start maîtrisé).
- Géoloc du rayon calculée en TS (haversine) — suffisant en MVP ; Postgres+PostGIS en prod pour passer à l'échelle.
- Pas de messagerie interne, pas de notation, pas de carte géographique (V2).