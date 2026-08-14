# Vidéo de fond

Dépose ici la vidéo de fond affichée en arrière-plan de tout le site (scroll-scrubbing).

## Fichiers attendus
- `bg.mp4` (obligatoire) — H.264 / MP4
- `bg.webm` (optionnel, recommandé) — VP9 / WebM (plus léger, meilleur ratio)

## Spéc conseillées
- Durée : ~6–12 s, **loopable** (la tête de lecture est pilotée par le scroll, pas la durée réelle)
- **Muet** (la vidéo est forcément `muted`)
- Résolution : 1080p max, ratio 16:9 (couverture `object-cover`)
- Poids : ~2–5 Mo (préchargée avec `preload="auto"`)
- Bitrate modéré pour un seek fluide au scroll

## Comportement
- Affichée **uniquement sur les pages vitrines** : accueil (`/`) et « comment ça marche » (`/comment-ca-marche`). Sur les autres routes (formulaires, dashboard, admin, fiches), la vidéo n'est pas rendue — le fond gradient du `body` reste visible.
- Desktop (sans `prefers-reduced-motion`) : la tête de lecture avance avec le scroll.
- Mobile (≤ 768px) et `prefers-reduced-motion` : la vidéo n'est pas rendue (fond gradient de fallback).
- Fichier absent : la vidéo est masquée automatiquement (`onError`), le fond gradient du site reste affiché — aucun impact visuel.

La liste des routes concernées est définie par `SHOWCASE_ROUTES` dans `src/components/BackgroundVideo.tsx`.

## Poster (optionnel)
Ajouter `bg-poster.jpg` et référencer un attribut `poster="/videos/bg-poster.jpg"` sur la `<video>` dans `src/components/BackgroundVideo.tsx` si tu veux une image avant le chargement.