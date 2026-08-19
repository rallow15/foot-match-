# Plan : Retirer la section messagerie du site

## Contexte
Le README du projet indique explicitement que le MVP ne doit **pas** inclure de messagerie interne :
> « Pas de messagerie interne, pas de notation, pas de carte géographique (V2). »

Aujourd'hui, l'application contient pourtant :
- Une page liste des conversations : `/dashboard/messages`
- Une page détail de conversation : `/dashboard/messages/[id]`
- Un composant de chat : `MessageThread`
- Des liens dans le Header et le dashboard
- Des Server Actions `contacterAction` et `sendMessageAction`
- Des tables `ContactLog` et `Message` en base

## Objectif
Revenir au MVP : la mise en relation se limite au formulaire « Contacter le club » qui envoie un email au club annonceur et révèle ses coordonnées (téléphone / email / WhatsApp) au demandeur. **Plus de chat interne, plus de conversations, plus de badge de messages non lus.**

## Approche retenue : suppression propre en 2 étapes

### Étape 1 — Retirer l'UI et la logique applicative (obligatoire, sans risque de données)
Fichiers concernés :

1. **Supprimer les pages de messagerie**
   - `src/app/dashboard/messages/page.tsx`
   - `src/app/dashboard/messages/[id]/page.tsx`
   - Supprimer le dossier `src/app/dashboard/messages/`

2. **Supprimer le composant de chat**
   - `src/components/dashboard/MessageThread.tsx`

3. **Retirer les liens dans l'interface**
   - `src/components/Header.tsx` : supprimer le lien « Messages » (desktop + mobile) et le badge `unreadCount`
   - `src/app/dashboard/page.tsx` : supprimer le lien « Messages → »

4. **Simplifier le layout**
   - `src/app/layout.tsx` : supprimer l'appel à `countUnreadConversations` et la prop `unreadCount`

5. **Transformer `ContactForm`**
   - `src/components/ContactForm.tsx` : le formulaire ne crée plus de `ContactLog` ni de `Message` en base. Il reste un simple formulaire d'envoi d'email.
   - Garder le comportement post-contact : révéler téléphone/email/WhatsApp du club annonceur au demandeur.

6. **Simplifier `src/app/actions.ts`**
   - Supprimer `sendMessageAction`
   - Réécrire `contacterAction` pour qu'elle :
     - vérifie l'authentification et la validation du compte
     - vérifie que l'annonce est ouverte et non expirée
     - envoie l'email de notification au club annonceur via `sendContactNotification`
     - retourne les coordonnées du club annonceur (tel/email)
     - **ne crée plus** de `ContactLog` / `Message`
   - Supprimer les imports inutiles liés aux messages

7. **Nettoyer `src/lib/queries.ts`**
   - Supprimer `fetchConversations`, `fetchConversation`, `countUnreadConversations`

8. **Nettoyer `src/lib/rate-limit.ts`**
   - Supprimer `MESSAGE_RATE_LIMIT` et `MESSAGE_ACCOUNT_RATE_LIMIT`

9. **Mettre à jour `prisma/seed.ts`**
   - Supprimer `await prisma.contactLog.deleteMany();`

### Étape 2 — Nettoyer le schéma Prisma (optionnel, demande confirmation)
Si tu veux aller jusqu'au bout et supprimer les tables obsolètes de la base :

1. **Modifier `prisma/schema.prisma`**
   - Supprimer le modèle `Message`
   - Supprimer le modèle `ContactLog`
   - Supprimer les relations `contactsEmis`, `contactsRecus`, `messages`, `passwordResetTokens` (déjà présentes sur `Club` mais `passwordResetTokens` ne doit pas être supprimé — vérifier)
   - En fait, retirer uniquement les relations `contactsEmis`, `contactsRecus` de `Club`
   - Supprimer le champ `message` optionnel dans le modèle `Annonce` ? Non, `Annonce` n'a pas de relation directe `message`, seulement `contacts` (à vérifier)

2. **Migration de la base**
   - Exécuter `npx prisma db push` pour appliquer la suppression des tables en base
   - **Attention** : cette opération supprime définitivement l'historique des conversations existantes en production. À ne faire qu'après confirmation explicite.

## Consequences
- Le badge de messages non lus disparaît du Header.
- Le menu mobile ne contient plus « Messages ».
- Le dashboard ne propose plus de section Messages.
- Le formulaire de contact sur une annonce envoie un email et affiche les coordonnées, sans créer de conversation suivie.
- Aucune page `/dashboard/messages/*` n'est accessible (Next.js renverra une 404).

## Non-concernés (ne pas toucher)
- `PasswordResetToken` : garde sa relation avec `Club`
- `Session` : inchangé
- `sendContactNotification` dans `src/lib/mail.ts` : on garde l'email de contact, seul le contexte d'envoi change
- La page publique des clubs et la recherche d'annonces restent inchangées

## Tests de validation
1. `npm run build` doit passer sans erreur
2. La page d'une annonce affiche toujours le formulaire de contact pour un club connecté et validé
3. Après envoi, les coordonnées (téléphone/email/WhatsApp) du club annonceur s'affichent
4. Le Header n'affiche plus de lien/badge Messages
5. Le dashboard n'affiche plus de lien Messages
6. L'URL `/dashboard/messages` retourne une 404
