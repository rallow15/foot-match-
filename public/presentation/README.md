# Diaporama de présentation — Matchs Amicaux

Fichier principal : `index.html`

## Lancer le diaporama

### En local (depuis le projet Next.js)

```bash
npm run dev
```

Puis ouvrir : http://localhost:3000/presentation/index.html

### Sans lancer le serveur

Ouvrir directement `index.html` dans un navigateur.
Les captures d'écran sont dans le même dossier.

## Navigation

- **Flèches directionnelles** : changer de slide
- **Esc** : vue d'ensemble
- **S** : mode speaker

## Contenu des slides

1. Titre
2. Vue d'ensemble du parcours
3. Inscription du club
4. Création des équipes
5. Proposition d'un match
6. Recherche d'un match
7. Contact avec le club annonceur
8. Fallback : trouver un club compatible
9. Demander une rencontre
10. Modération admin
11. Conclusion

## Captures

Les images (`01-*.png` à `08-*.png`) ont été générées automatiquement depuis le site local.
Pour les régénérer :

```bash
npx tsx scripts/capture-screenshots.ts
npx tsx scripts/capture-annonce-detail.ts
```

Penser à lancer `npm run dev` au préalable et à peupler la base avec `scripts/seed-demo-data.ts` si nécessaire.
